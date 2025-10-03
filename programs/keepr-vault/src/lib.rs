use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK");

/// Minimum time buffer before unlock (5 minutes)
pub const MIN_UNLOCK_BUFFER: i64 = 300;

#[program]
pub mod keepr_vault {
    use super::*;

    /// Initialize the global config (one-time, admin only)
    pub fn init_config(
        ctx: Context<InitConfig>,
        usdc_mint: Pubkey,
        max_lock_per_vault: u64,
        paused: bool,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.usdc_mint = usdc_mint;
        config.max_lock_per_vault = max_lock_per_vault;
        config.paused = paused;
        config.admin_test_wallets = Vec::new();

        emit!(ConfigUpdated {
            admin: config.admin,
        });

        Ok(())
    }

    /// Update config parameters (admin only)
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        usdc_mint: Option<Pubkey>,
        max_lock_per_vault: Option<u64>,
        paused: Option<bool>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        if let Some(mint) = usdc_mint {
            config.usdc_mint = mint;
        }
        if let Some(cap) = max_lock_per_vault {
            config.max_lock_per_vault = cap;
        }
        if let Some(p) = paused {
            config.paused = p;
        }

        emit!(ConfigUpdated {
            admin: config.admin,
        });

        Ok(())
    }

    /// Update admin test wallets list (admin only)
    pub fn update_admin_test_wallets(
        ctx: Context<UpdateConfig>,
        wallets: Vec<Pubkey>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        require!(
            wallets.len() <= 10,
            KeeprError::AdminTestWalletsLimitExceeded
        );

        config.admin_test_wallets = wallets;

        emit!(ConfigUpdated {
            admin: config.admin,
        });

        Ok(())
    }

    /// Close config account (admin only, for devnet schema migrations)
    pub fn close_config(ctx: Context<CloseConfig>) -> Result<()> {
        // Manually verify admin from raw account data (offset 8, first 32 bytes after discriminator)
        let config_data = ctx.accounts.config.try_borrow_data()?;
        require!(config_data.len() >= 40, KeeprError::InvalidAmount); // 8 discriminator + 32 admin

        let admin_bytes = &config_data[8..40];
        let stored_admin = Pubkey::try_from(admin_bytes)
            .map_err(|_| KeeprError::InvalidAmount)?;

        require!(
            stored_admin == ctx.accounts.admin.key(),
            KeeprError::InvalidAmount
        );

        // Manually close the account by transferring lamports to admin
        let dest_starting_lamports = ctx.accounts.admin.lamports();
        **ctx.accounts.admin.lamports.borrow_mut() = dest_starting_lamports
            .checked_add(ctx.accounts.config.lamports())
            .unwrap();
        **ctx.accounts.config.lamports.borrow_mut() = 0;

        Ok(())
    }

    /// Create a new vault (deposit separately)
    pub fn create_vault(
        ctx: Context<CreateVault>,
        beneficiary: Pubkey,
        unlock_unix: i64,
        name_hash: [u8; 32],
        notification_window_seconds: u32,
        grace_period_seconds: u32,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let vault = &mut ctx.accounts.vault;
        let counter = &mut ctx.accounts.counter;
        let clock = Clock::get()?;

        // Check if creator is an admin tester
        let creator_key = ctx.accounts.creator.key();
        let is_admin_tester = config.admin_test_wallets.contains(&creator_key);

        // Validate beneficiary is not creator (skip for admin testers)
        if !is_admin_tester {
            require!(
                beneficiary != creator_key,
                KeeprError::InvalidBeneficiary
            );
        }

        // Store the vault ID (will be counter.last_id + 1)
        let vault_id = counter.last_id.checked_add(1).ok_or(KeeprError::Overflow)?;

        // Validate counter initialization (prevent race condition)
        // If counter was just created (last_id = 0), vault_id must be 1
        if counter.last_id == 0 {
            require!(vault_id == 1, KeeprError::CounterNotInitialized);
        }

        // Increment counter
        counter.last_id = vault_id;

        // Calculate vault period from creation to unlock
        let vault_period_seconds_i64 = unlock_unix
            .checked_sub(clock.unix_timestamp)
            .ok_or(KeeprError::Overflow)?;

        // Validate and cast to u32
        require!(vault_period_seconds_i64 > 0, KeeprError::InvalidUnlockTime);
        let vault_period_seconds = u32::try_from(vault_period_seconds_i64)
            .map_err(|_| KeeprError::Overflow)?;

        // Validate dead man's switch parameters
        require!(
            notification_window_seconds > 0,
            KeeprError::InvalidNotificationWindow
        );
        require!(
            notification_window_seconds < vault_period_seconds,
            KeeprError::InvalidNotificationWindow
        );
        require!(
            grace_period_seconds > 0,
            KeeprError::InvalidGracePeriod
        );

        // Initialize vault
        vault.creator = ctx.accounts.creator.key();
        vault.beneficiary = beneficiary;
        vault.usdc_mint = config.usdc_mint;
        vault.vault_token_account = ctx.accounts.vault_token_account.key();
        vault.amount_locked = 0;
        vault.unlock_unix = unlock_unix;
        vault.released = false;
        vault.cancelled = false;
        vault.is_test_vault = is_admin_tester;
        vault.bump = ctx.bumps.vault;
        vault.name_hash = name_hash;
        vault.vault_id = vault_id;
        vault.vault_period_seconds = vault_period_seconds;
        vault.notification_window_seconds = notification_window_seconds;
        vault.grace_period_seconds = grace_period_seconds;
        vault.last_checkin_unix = clock.unix_timestamp;

        emit!(VaultCreated {
            creator: vault.creator,
            vault: vault.key(),
            beneficiary: vault.beneficiary,
            unlock_unix: vault.unlock_unix,
        });

        Ok(())
    }

    /// Deposit additional USDC into existing vault
    pub fn deposit_usdc(ctx: Context<DepositUsdc>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let clock = Clock::get()?;

        // Validations (optimized order: cheapest checks first)
        require!(amount > 0, KeeprError::InvalidAmount);
        require!(!vault.released, KeeprError::AlreadyReleased);
        require!(
            clock.unix_timestamp < vault.unlock_unix,
            KeeprError::DepositAfterUnlock
        );

        let new_total = vault
            .amount_locked
            .checked_add(amount)
            .ok_or(KeeprError::InvalidAmount)?;

        require!(
            new_total <= ctx.accounts.config.max_lock_per_vault,
            KeeprError::AboveVaultCap
        );

        // Transfer USDC from creator to vault PDA's token account
        let cpi_accounts = Transfer {
            from: ctx.accounts.creator_usdc_ata.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        vault.amount_locked = new_total;

        emit!(VaultFunded {
            vault: vault.key(),
            amount,
        });

        Ok(())
    }

    /// Check-in to reset vault deadline (creator only, during notification window)
    pub fn check_in(ctx: Context<CheckIn>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let clock = Clock::get()?;

        // Safety checks
        require!(!vault.released, KeeprError::AlreadyReleased);

        // Calculate notification window start time
        let notification_start = vault
            .unlock_unix
            .checked_sub(vault.notification_window_seconds.into())
            .ok_or(KeeprError::Overflow)?;

        // Check if we're in the notification window
        require!(
            clock.unix_timestamp >= notification_start,
            KeeprError::NotInNotificationWindow
        );

        // Check if we haven't passed the grace period
        let grace_end = vault
            .unlock_unix
            .checked_add(vault.grace_period_seconds.into())
            .ok_or(KeeprError::Overflow)?;

        require!(
            clock.unix_timestamp < grace_end,
            KeeprError::AlreadyReleased
        );

        // Reset unlock time by adding vault period
        vault.unlock_unix = clock
            .unix_timestamp
            .checked_add(vault.vault_period_seconds.into())
            .ok_or(KeeprError::Overflow)?;

        // Update last check-in timestamp
        vault.last_checkin_unix = clock.unix_timestamp;

        emit!(VaultCheckedIn {
            vault: vault.key(),
            creator: vault.creator,
            new_unlock_unix: vault.unlock_unix,
        });

        Ok(())
    }

    /// Release funds to beneficiary (time-locked)
    /// Note: Any signer can call this; PDA signs the transfer via seeds
    pub fn release(ctx: Context<Release>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let clock = Clock::get()?;

        // Calculate grace period end time
        let grace_end = vault
            .unlock_unix
            .checked_add(vault.grace_period_seconds.into())
            .ok_or(KeeprError::Overflow)?;

        // Safety checks (optimized order)
        require!(!vault.released, KeeprError::AlreadyReleased);
        require!(vault.amount_locked > 0, KeeprError::NothingToRelease);
        require!(
            clock.unix_timestamp >= grace_end,
            KeeprError::InvalidUnlockTime
        );

        let amount = vault.amount_locked;
        let creator_key = vault.creator;
        let vault_id = vault.vault_id;
        let vault_bump = vault.bump;

        // Transfer all funds from vault PDA to beneficiary
        let seeds = &[
            b"vault",
            creator_key.as_ref(),
            &vault_id.to_le_bytes(),
            &[vault_bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.beneficiary_usdc_ata.to_account_info(),
            authority: vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        vault.released = true;

        emit!(VaultReleased {
            vault: vault.key(),
            amount,
            to: vault.beneficiary,
        });

        Ok(())
    }

    /// Cancel vault and return funds to creator (creator only, before release)
    pub fn cancel_vault(ctx: Context<CancelVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        // Safety checks
        require!(!vault.released, KeeprError::CannotCancelAfterRelease);
        require!(!vault.cancelled, KeeprError::VaultAlreadyCancelled);

        let amount = vault.amount_locked;

        // Only transfer if there are funds
        if amount > 0 {
            let creator_key = vault.creator;
            let vault_id = vault.vault_id;
            let vault_bump = vault.bump;

            let seeds = &[
                b"vault",
                creator_key.as_ref(),
                &vault_id.to_le_bytes(),
                &[vault_bump],
            ];
            let signer = &[&seeds[..]];

            let cpi_accounts = Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.creator_usdc_ata.to_account_info(),
                authority: vault.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
            token::transfer(cpi_ctx, amount)?;
        }

        vault.cancelled = true;
        vault.amount_locked = 0;

        emit!(VaultCancelled {
            vault: vault.key(),
            creator: vault.creator,
            amount_refunded: amount,
        });

        Ok(())
    }

    /// Close vault and reclaim rent (creator only, post-release)
    pub fn close_vault(ctx: Context<CloseVault>) -> Result<()> {
        let vault = &ctx.accounts.vault;

        // Safety checks
        require!(vault.released, KeeprError::NotReleased);
        require!(vault.amount_locked == 0, KeeprError::VaultNotEmpty);

        // Close token account first (returns rent to creator)
        let creator_key = vault.creator;
        let vault_id = vault.vault_id;
        let vault_bump = vault.bump;

        let seeds = &[
            b"vault",
            creator_key.as_ref(),
            &vault_id.to_le_bytes(),
            &[vault_bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = anchor_spl::token::CloseAccount {
            account: ctx.accounts.vault_token_account.to_account_info(),
            destination: ctx.accounts.creator.to_account_info(),
            authority: vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        anchor_spl::token::close_account(cpi_ctx)?;

        // Vault account will be closed automatically via close constraint
        Ok(())
    }
}

// ============================================================================
// Accounts
// ============================================================================

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump,
        has_one = admin
    )]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateVault<'info> {
    #[account(seeds = [b"config"], bump)]
    pub config: Box<Account<'info, Config>>,

    #[account(
        init_if_needed,
        payer = creator,
        space = 8 + VaultCounter::INIT_SPACE,
        seeds = [b"vault_counter", creator.key().as_ref()],
        bump
    )]
    pub counter: Box<Account<'info, VaultCounter>>,

    #[account(
        init,
        payer = creator,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", creator.key().as_ref(), &(counter.last_id + 1).to_le_bytes()],
        bump
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,

    #[account(address = config.usdc_mint)]
    pub usdc_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositUsdc<'info> {
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"vault", creator.key().as_ref(), &vault.vault_id.to_le_bytes()],
        bump = vault.bump,
        has_one = creator
    )]
    pub vault: Account<'info, Vault>,

    #[account(seeds = [b"vault_counter", creator.key().as_ref()], bump)]
    pub counter: Account<'info, VaultCounter>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(address = config.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = creator
    )]
    pub creator_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CheckIn<'info> {
    #[account(
        mut,
        seeds = [b"vault", creator.key().as_ref(), &vault.vault_id.to_le_bytes()],
        bump = vault.bump,
        has_one = creator
    )]
    pub vault: Account<'info, Vault>,

    #[account(seeds = [b"vault_counter", creator.key().as_ref()], bump)]
    pub counter: Account<'info, VaultCounter>,

    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct Release<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.creator.as_ref(), &vault.vault_id.to_le_bytes()],
        bump = vault.bump,
        has_one = beneficiary
    )]
    pub vault: Account<'info, Vault>,

    #[account(seeds = [b"vault_counter", vault.creator.as_ref()], bump)]
    pub counter: Account<'info, VaultCounter>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(address = vault.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = usdc_mint,
        associated_token::authority = beneficiary
    )]
    pub beneficiary_usdc_ata: Account<'info, TokenAccount>,

    /// CHECK: Beneficiary address is validated via has_one constraint on vault
    pub beneficiary: AccountInfo<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelVault<'info> {
    #[account(
        mut,
        seeds = [b"vault", creator.key().as_ref(), &vault.vault_id.to_le_bytes()],
        bump = vault.bump,
        has_one = creator
    )]
    pub vault: Account<'info, Vault>,

    #[account(seeds = [b"vault_counter", creator.key().as_ref()], bump)]
    pub counter: Account<'info, VaultCounter>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(address = vault.usdc_mint)]
    pub usdc_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = usdc_mint,
        associated_token::authority = creator
    )]
    pub creator_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseVault<'info> {
    #[account(
        mut,
        close = creator,
        seeds = [b"vault", vault.creator.as_ref(), &vault.vault_id.to_le_bytes()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        associated_token::mint = vault.usdc_mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is the vault creator who will receive the rent refund
    #[account(mut, address = vault.creator)]
    pub creator: AccountInfo<'info>,

    /// Anyone can sign to close a released vault
    pub signer: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseConfig<'info> {
    /// CHECK: We use AccountInfo to avoid deserialization errors during schema migrations
    #[account(
        mut,
        seeds = [b"config"],
        bump
    )]
    pub config: AccountInfo<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

// ============================================================================
// State
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub max_lock_per_vault: u64,
    pub paused: bool,
    #[max_len(10)]
    pub admin_test_wallets: Vec<Pubkey>,
}

#[account]
#[derive(InitSpace)]
pub struct VaultCounter {
    pub last_id: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub creator: Pubkey,
    pub beneficiary: Pubkey,
    pub usdc_mint: Pubkey,
    pub vault_token_account: Pubkey,
    pub amount_locked: u64,
    pub unlock_unix: i64,
    pub released: bool,
    pub cancelled: bool,
    pub is_test_vault: bool,
    pub bump: u8,
    pub name_hash: [u8; 32],
    pub vault_id: u64,
    pub vault_period_seconds: u32,
    pub notification_window_seconds: u32,  // Max ~136 years in seconds
    pub grace_period_seconds: u32,         // Max ~136 years in seconds
    pub last_checkin_unix: i64,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct ConfigUpdated {
    pub admin: Pubkey,
}

#[event]
pub struct VaultCreated {
    pub creator: Pubkey,
    pub vault: Pubkey,
    pub beneficiary: Pubkey,
    pub unlock_unix: i64,
}

#[event]
pub struct VaultFunded {
    pub vault: Pubkey,
    pub amount: u64,
}

#[event]
pub struct VaultReleased {
    pub vault: Pubkey,
    pub amount: u64,
    pub to: Pubkey,
}

#[event]
pub struct VaultCheckedIn {
    pub vault: Pubkey,
    pub creator: Pubkey,
    pub new_unlock_unix: i64,
}

#[event]
pub struct VaultCancelled {
    pub vault: Pubkey,
    pub creator: Pubkey,
    pub amount_refunded: u64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum KeeprError {
    #[msg("Paused.")]
    Paused,
    #[msg("Unlock time must be in the future.")]
    InvalidUnlockTime,
    #[msg("Already released.")]
    AlreadyReleased,
    #[msg("USDC mint mismatch.")]
    MismatchedMint,
    #[msg("Nothing to release.")]
    NothingToRelease,
    #[msg("Invalid amount.")]
    InvalidAmount,
    #[msg("Per-vault cap exceeded.")]
    AboveVaultCap,
    #[msg("Arithmetic overflow.")]
    Overflow,
    #[msg("Beneficiary cannot be the creator.")]
    InvalidBeneficiary,
    #[msg("Cannot deposit after unlock time.")]
    DepositAfterUnlock,
    #[msg("Vault must be released before closing.")]
    NotReleased,
    #[msg("Vault still contains funds.")]
    VaultNotEmpty,
    #[msg("Check-in not allowed yet - notification window not reached.")]
    NotInNotificationWindow,
    #[msg("Invalid notification window.")]
    InvalidNotificationWindow,
    #[msg("Invalid grace period.")]
    InvalidGracePeriod,
    #[msg("Counter not properly initialized.")]
    CounterNotInitialized,
    #[msg("Vault has already been cancelled.")]
    VaultAlreadyCancelled,
    #[msg("Cannot cancel vault after it has been released.")]
    CannotCancelAfterRelease,
    #[msg("Admin test wallets list cannot exceed 10 wallets.")]
    AdminTestWalletsLimitExceeded,
}
