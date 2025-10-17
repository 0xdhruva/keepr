# Solana Program Issues & Learnings

**Purpose:** Knowledge base of solved issues, error patterns, and best practices for Keepr's Solana program.
**Maintenance:** Add new issues using template at bottom. Keep solutions, remove verbose debugging steps.

---

## Critical Patterns & Best Practices

### Build & Deployment

**ALWAYS use `anchor build`, NEVER `cargo-build-sbf` alone:**
- `cargo-build-sbf` doesn't properly embed `declare_id!` macro
- Results in `DeclaredProgramIdMismatch (Error 4100)` at runtime
- Correct workflow:
  ```bash
  cargo clean
  anchor build --skip-lint
  anchor deploy --provider.cluster devnet
  # Wait 5-10 minutes for RPC cache to clear
  ```

**RPC Cache After Deployment:**
- Devnet RPC nodes cache program bytecode for 5-10 minutes
- Fresh deployment may still execute old bytecode during cache window
- Solution: Wait 10 minutes OR use alternative RPC endpoint

**IDL Sync:**
- Always copy IDL to web app after every build: `cp target/idl/keepr_vault.json ../web/app/_lib/keepr_vault.json`
- Verify IDL has correct number of instructions and errors with `jq`

### Schema Management

**Schema Changes Are Breaking:**
- Changing Vault struct size makes old vaults undeserializable → `AccountDidNotDeserialize (Error 3003)`
- Impact: Old vaults from previous deployment cannot be read
- **Devnet:** Acceptable—redeploy and ignore old vaults
- **Mainnet:** CRITICAL—must plan migration or NEVER change struct size

**Safe Schema Migration on Devnet:**
1. Create `close_config` instruction using `AccountInfo<'info>` (not `Account<'info, T>`) to bypass deserialization
2. Manually verify admin from raw bytes
3. Close old config account
4. Reinitialize with new schema
5. Update all test scripts with new config

**Example close instruction:**
```rust
#[derive(Accounts)]
pub struct CloseConfig<'info> {
    /// CHECK: Raw account to avoid deserialization
    #[account(mut, seeds = [b"config"], bump)]
    pub config: AccountInfo<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

pub fn close_config(ctx: Context<CloseConfig>) -> Result<()> {
    let data = ctx.accounts.config.try_borrow_data()?;
    let admin_bytes = &data[8..40];  // Skip discriminator
    let stored_admin = Pubkey::try_from(admin_bytes)?;
    require!(stored_admin == ctx.accounts.admin.key(), ...);
    // Transfer lamports and zero out
    Ok(())
}
```

### Transaction Construction

**Manual Instruction Building > Anchor Program Class:**
- For multi-instruction transactions, manual building provides explicit program ID control
- Anchor's `Program` class can cause ID inference issues with `postInstructions()`
- Working pattern (from `_lib/instructions.ts`):
  ```typescript
  const programId = new PublicKey(PROGRAM_ID);
  const createIx = await createVaultInstruction({ ...params, programId });
  const depositIx = await depositUsdcInstruction({ ...params, programId });
  const tx = new Transaction().add(createIx).add(depositIx);
  ```

**Always Simulate Before Sending:**
```typescript
const { blockhash } = await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
transaction.feePayer = publicKey;

const simulation = await connection.simulateTransaction(transaction);
if (simulation.value.err) {
  throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
}

const signature = await sendTransaction(transaction, connection);
```

**Instruction Discriminators:**
- Calculated as SHA-256 of `global:<instruction_name>`, first 8 bytes
- Manual calculation:
  ```typescript
  const hash = crypto.createHash("sha256");
  hash.update(`global:${instructionName}`);
  return hash.digest().slice(0, 8);
  ```

### Network-Specific Configuration

**USDC Mint Addresses Differ:**
- **Devnet:** `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr` (OLD: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)
- **Mainnet:** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Common error: `ConstraintAddress (Error 2012)` when mismatch occurs

**Time Units:**
- Use network config helpers (`timeToSeconds`, `formatTimeValue`) to handle devnet (minutes) vs mainnet (days)
- Never hardcode time units in UI

---

## Solved Issues Reference

### Issue 1: DeclaredProgramIdMismatch (Error 4100)

**Error:** `The declared program id does not match the actual program id`

**Root Causes:**
1. Built with `cargo-build-sbf` instead of `anchor build`
2. Stale build artifacts after changing `declare_id!`
3. RPC cache serving old bytecode after redeployment

**Solutions:**
1. Always use `cargo clean && anchor build --skip-lint`
2. Wait 5-10 minutes after deployment before testing
3. Verify all configs have matching program ID (lib.rs, Anchor.toml, IDL, env vars)

**Prevention:**
- Use `anchor build` workflow exclusively
- Clean build artifacts before critical deployments
- Document deployment timestamp to track cache windows

---

### Issue 2: AccountDidNotDeserialize (Error 3003)

**Error:** `Failed to deserialize the account`

**Root Cause:** On-chain account has different schema than program expects (old 81-byte Config vs new 405-byte Config with `admin_test_wallets` field)

**Solution:**
1. Create migration instruction using `AccountInfo<'info>` instead of `Account<'info, T>`
2. Manually parse raw bytes to verify ownership/admin
3. Close old account and reinitialize with new schema

**Prevention (Mainnet):**
- Finalize all account schemas before mainnet launch
- Add versioning field to accounts for future migrations
- Document all schema changes in CHANGELOG.md

---

### Issue 3: ConstraintAddress - USDC Mint Mismatch (Error 2012)

**Error:** `An address constraint was violated`

**Root Cause:** Config initialized with mainnet USDC mint but client using devnet USDC mint

**Solution:**
- Close and reinitialize config with correct devnet mint: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`
- Update all scripts/configs to use network-specific addresses

**Prevention:**
- Use environment-based config that selects correct mint per network
- Add validation in init_config to detect mismatched networks
- Document network-specific addresses in code comments

---

### Issue 4: InvalidBeneficiary (Error 6008)

**Error:** `Beneficiary cannot be the creator`

**Root Cause:** Production safety check prevents creator==beneficiary, but blocks devnet testing with single wallet

**Solution:**
- Added `admin_test_wallets: Vec<Pubkey>` to Config
- Admin can whitelist wallets via `update_admin_test_wallets`
- Whitelisted wallets can create test vaults with `is_test_vault: true` flag
- Script: `scripts/add-admin-tester.ts`

**Use Case:** Devnet testing without needing multiple wallets

---

### Issue 5: InvalidNotificationWindow (Error 6013)

**Error:** `Invalid notification window`

**Root Cause:** Timing race condition between client and on-chain validation
- Client calculates: `vaultPeriod = unlockUnix - Date.now()`
- Transaction delayed 5-30 seconds in network
- On-chain calculates: `vaultPeriod = unlockUnix - clock.unix_timestamp` (smaller)
- On-chain validates: `notificationWindow < vaultPeriod` → fails

**Solutions Attempted:**
1. ❌ Add buffer to unlock time (doesn't scale to edge cases)
2. ✅ Remove percentage-based notification window (too error-prone)
3. ✅ Use absolute unlock time + fixed notification/grace periods (current implementation)

**Current Implementation:**
- User sets check-in period (e.g., 30 days)
- Fixed notification window (e.g., 7 days before expiry)
- Fixed grace period (e.g., 3 days after notification)
- No timing race conditions

---

### Issue 6: Serialization Mismatch - Amount Field

**Error:** Vault serialization shows wrong `amount_locked` bytes

**Root Cause:** Misunderstanding of Anchor serialization layout
- Assumed discriminator(8) + creator(32) + beneficiary(32) + amount(8) = offset 0x50
- Actual layout had different field ordering

**Solution:**
- Read Anchor-generated IDL to understand exact serialization order
- Use Anchor's deserialization instead of manual byte parsing
- For manual parsing, verify with hex dump of actual on-chain account

**Tools:**
```bash
solana account <PDA> --output json --url devnet | jq -r '.account.data[0]' | base64 -d | xxd
```

---

### Issue 7: AccountNotSigner - Release Instruction

**Error:** `A raw constraint was violated` (Release failed with creator not signing)

**Root Cause:** Trying to use creator's signature in Release instruction
- Release should be permissionless (anyone can trigger)
- Vault PDA signs via seeds, not creator

**Solution:**
- Remove creator from Release accounts
- Use only vault PDA as signer (via seeds constraint)
- Validate unlock time has passed in instruction logic

**Pattern:**
```rust
#[derive(Accounts)]
pub struct Release<'info> {
    #[account(mut, seeds = [b"vault", ...], bump)]
    pub vault: Account<'info, Vault>,
    // NO creator signer needed!
}
```

---

### Issue 8: Missing amount_locked Reset

**Error:** Vault closed with `amount_locked > 0`, causing issues on reopen

**Root Cause:** Release instruction transferred funds but didn't reset `amount_locked` field

**Solution:**
```rust
pub fn release(ctx: Context<Release>) -> Result<()> {
    // ... transfer logic ...
    ctx.accounts.vault.amount_locked = 0;  // ← Add this!
    Ok(())
}
```

**Verification:**
- After release, check vault account on-chain
- amount_locked should be 0
- Vault can then be closed safely

---

### Issue 9: Schema Breaking Backward Compatibility

**Context:** Adding dead man's switch fields to Vault struct

**Breaking Changes (188 bytes → 237 bytes):**
- Added: `notification_window_seconds: u64`
- Added: `grace_period_seconds: u64`
- Added: `tier: VaultTier` (enum)
- Added: `is_test_vault: bool`
- Added: `paused: bool`

**Impact:**
- ALL old vaults unreadable after deployment
- Error 3003 on any vault created with old program

**Mainnet Strategy:**
1. Add version field to Vault: `version: u8`
2. Write migration instruction that handles both schemas
3. Or: Require all vaults to be closed before upgrade

**Devnet Reality:**
- Breaking changes acceptable
- Close config, redeploy, reinit
- Old vaults ignored

---

### Issue 10: Dead Man's Switch Program Logic

**Implementation:**

**Vault States:**
1. **Active:** `now < check_in_deadline`
2. **Notification Window:** `now >= check_in_deadline && now < unlock_time`
3. **Grace Period:** `now >= unlock_time && now < unlock_time + grace_period`
4. **Unlocked:** `now >= unlock_time + grace_period`

**Key Fields:**
```rust
pub struct Vault {
    check_in_period_seconds: u64,    // e.g., 30 days
    notification_window_seconds: u64, // e.g., 7 days before unlock
    grace_period_seconds: u64,        // e.g., 3 days after unlock
    check_in_deadline: i64,           // Unix timestamp
    unlock_unix: i64,                 // check_in_deadline basically
}
```

**Check-In Logic:**
```rust
pub fn check_in(ctx: Context<CheckIn>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let new_deadline = now + vault.check_in_period_seconds as i64;
    vault.check_in_deadline = new_deadline;
    vault.unlock_unix = new_deadline;  // These are same
    Ok(())
}
```

**Cancel Rules:**
- ❌ Cannot cancel during grace period
- ✅ Can cancel anytime before grace period
- Constraint: `require!(now < vault.unlock_unix, KeeprError::CannotCancelDuringWatchdog)`

---

### Issue 11: DeclaredProgramIdMismatch After Dead Man's Switch Deployment

**Error:** Same Error 4100 after adding dead man's switch

**Root Cause:** Anchor.toml had OLD program ID from previous keypair

**Investigation:**
```bash
# Check Anchor.toml
grep keepr_vault Anchor.toml
# Shows: Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS

# Check lib.rs
grep declare_id programs/keepr-vault/src/lib.rs
# Shows: 74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK

# MISMATCH!
```

**Solution:**
- Update Anchor.toml program ID to match lib.rs
- OR: Deploy with `solana program deploy` directly (bypasses Anchor.toml)

**Workflow:**
```bash
anchor build --skip-lint
solana program deploy target/deploy/keepr_vault.so \
  --program-id 74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK \
  --url devnet
```

---

### Issue 12: Free Cancellation Window Removal

**Change:** Removed 48-hour free cancellation window (added fees create enough friction)

**Updated Fee Logic:**
```rust
// OLD: if within 48h, charge creation_fee + closing_fee, else just closing_fee
// NEW: always charge closing_fee (creation_fee already paid)

let closing_fee = match vault.tier {
    VaultTier::Base => 1_000_000,      // $1
    VaultTier::Plus => 5_000_000,      // $5
    VaultTier::Premium => 10_000_000,  // $10
    VaultTier::Lifetime => 0,          // FREE for lifetime
};
```

**Rationale:**
- Simpler mental model
- Creation fee is sunk cost (never refunded)
- Lifetime tier still gets free cancellation (white-glove perk)

---

### Issue 13: Automatic Vault Closure After Release

**Problem:** After release, vault account still exists, holding ~0.004 SOL rent

**Initial Solution:** Separate `close_vault` instruction (permissionless)
- User must manually call after release
- Creates friction: two transactions instead of one

**Improved Solution:** Release automatically closes vault
```rust
pub fn release(ctx: Context<Release>) -> Result<()> {
    // 1. Transfer USDC to beneficiary
    // 2. Set amount_locked = 0
    // 3. Close vault account (return rent to creator)

    let vault_lamports = ctx.accounts.vault.to_account_info().lamports();
    **ctx.accounts.creator.to_account_info().lamports.borrow_mut() += vault_lamports;
    **ctx.accounts.vault.to_account_info().lamports.borrow_mut() = 0;

    Ok(())
}
```

**Benefits:**
- Single transaction for keeper bot
- Rent automatically returned to creator
- Cleaner UX (no lingering empty vaults)

**Keeper Bot Update:**
- Only calls `release` (no separate `close_vault` call)
- Rent reclamation happens automatically

---

## Common Error Quick Reference

| Error Code | Error Name | Common Cause | Quick Fix |
|------------|-----------|--------------|-----------|
| 3003 | AccountDidNotDeserialize | Schema mismatch | Redeploy + reinit config |
| 4100 | DeclaredProgramIdMismatch | Used cargo-build-sbf | `anchor build --skip-lint` |
| 2012 | ConstraintAddress | Wrong USDC mint | Check devnet vs mainnet |
| 2003 | A required signature is missing | Creator not in accounts | Add creator as signer |
| 6000 | Custom error (varies) | See program error enum | Check error message details |
| 6008 | InvalidBeneficiary | Creator == beneficiary | Use admin test wallet |
| 6013 | InvalidNotificationWindow | Timing race condition | Use fixed periods not percentages |

---

## Testing Checklist (Devnet)

Before considering an issue "resolved":
- [ ] Build with `cargo clean && anchor build --skip-lint`
- [ ] Deploy and wait 10 minutes for RPC cache
- [ ] Verify config PDA has correct schema size
- [ ] Test with fresh vault creation (not stale vaults)
- [ ] Simulate transaction before sending
- [ ] Check on-chain account data with `solana account`
- [ ] Verify IDL matches deployed program
- [ ] Test both success and error cases

---

## Mainnet Migration Strategy (Future)

**Account Versioning:**
```rust
pub struct Vault {
    pub version: u8,  // Start at 1, increment on breaking changes
    // ... other fields
}
```

**Migration Instruction Pattern:**
```rust
pub fn migrate_vault_v1_to_v2(ctx: Context<MigrateVault>) -> Result<()> {
    let vault_data = ctx.accounts.vault.try_borrow_data()?;
    let version = vault_data[8];  // After discriminator

    require!(version == 1, KeeprError::InvalidVersion);

    // Parse v1 fields manually
    // Realloc account if needed
    // Write v2 fields
    // Set version = 2

    Ok(())
}
```

**Checklist:**
- [ ] Announce migration window (e.g., 30 days notice)
- [ ] Provide migration UI
- [ ] Test migration on devnet with real-sized data
- [ ] Offer incentive for early migration
- [ ] Document rollback plan if migration fails

---

## How to Add New Issues

### Template

```markdown
### Issue N: [Brief Title]

**Error:** [Exact error message or symptom]

**Root Cause:** [Why it happened - one paragraph]

**Solution:**
[Code snippet or step-by-step fix]

**Prevention:** [How to avoid in future]
```

### Maintenance Process

**After solving an issue:**
1. Add to this file using template
2. Update error quick reference table
3. If it's a critical pattern, add to "Critical Patterns & Best Practices"
4. Remove verbose debugging steps - keep only solution
5. Add relevant test to devnet checklist

**Periodically (every ~5 new issues):**
1. Review for duplicate information
2. Consolidate similar issues
3. Update quick reference tables
4. Archive truly obsolete issues to a separate file if needed

**Keep this file under 1000 lines** - prioritize searchability and clarity over completeness.

---

## Useful Debugging Commands

```bash
# Check account data
solana account <ADDRESS> --output json --url devnet | jq -r '.account.data[0]' | base64 -d | xxd

# Verify program deployment
solana program show <PROGRAM_ID> --url devnet

# Get recent logs
solana logs --url devnet | grep <PROGRAM_ID>

# Simulate transaction
solana simulate-transaction <TX_FILE> --url devnet

# Check Anchor version
anchor --version

# Verify IDL structure
cat target/idl/keepr_vault.json | jq '{instructions: .instructions | length, errors: .errors | length, types: .types | length}'
```

---

## Reference Documentation

- **CLAUDE.md** - Main project context and quick start
- **DECISIONS.md** - Architecture decisions log
- **Anchor Docs** - https://www.anchor-lang.com/docs
- **Solana Cookbook** - https://solanacookbook.com
