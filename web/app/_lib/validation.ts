import { PublicKey } from '@solana/web3.js';
import { MIN_UNLOCK_BUFFER_SECS, MAX_LOCK_PER_VAULT } from './solana';

export interface ValidationError {
  field: string;
  message: string;
}

// Admin test wallets from environment
const ADMIN_WALLETS = process.env.NEXT_PUBLIC_ADMIN_WALLETS?.split(',').map(w => w.trim()) || [];

// Devnet vs Mainnet minimum periods
const IS_DEVNET = process.env.NEXT_PUBLIC_SOLANA_NETWORK !== 'mainnet';
const ADMIN_MIN_UNLOCK_SECS = 120; // 2 minutes for admin testers
const DEVNET_MIN_UNLOCK_SECS = 120; // 2 minutes for devnet testing (CHANGED FOR TESTING)
const REGULAR_MIN_UNLOCK_SECS = 86400; // 24 hours for regular users (1 day)

export function isAdminWallet(address: string): boolean {
  return ADMIN_WALLETS.includes(address);
}

export function getMinUnlockSeconds(walletAddress?: string): number {
  // Admin testers get shortest minimum (2 min)
  if (walletAddress && isAdminWallet(walletAddress)) {
    return ADMIN_MIN_UNLOCK_SECS;
  }

  // Devnet gets 5-minute minimum for easier testing
  if (IS_DEVNET) {
    return DEVNET_MIN_UNLOCK_SECS;
  }

  // Mainnet uses 24-hour minimum
  return REGULAR_MIN_UNLOCK_SECS;
}

export function validateVaultName(name: string): ValidationError | null {
  if (!name || name.trim().length === 0) {
    return { field: 'name', message: 'Vault name is required' };
  }
  
  if (name.length > 50) {
    return { field: 'name', message: 'Vault name must be 50 characters or less' };
  }
  
  return null;
}

export function validateAmount(amount: string): ValidationError | null {
  if (!amount || amount.trim().length === 0) {
    return { field: 'amount', message: 'Amount is required' };
  }
  
  const parsed = parseFloat(amount);
  
  if (isNaN(parsed)) {
    return { field: 'amount', message: 'Invalid amount' };
  }
  
  if (parsed <= 0) {
    return { field: 'amount', message: 'Amount must be greater than 0' };
  }
  
  const baseUnits = Math.floor(parsed * 1_000_000);
  
  if (baseUnits > MAX_LOCK_PER_VAULT) {
    const maxUsdc = MAX_LOCK_PER_VAULT / 1_000_000;
    return { field: 'amount', message: `Amount cannot exceed ${maxUsdc} USDC per vault` };
  }
  
  return null;
}

export function validateBeneficiary(
  address: string,
  creatorAddress?: string
): ValidationError | null {
  if (!address || address.trim().length === 0) {
    return { field: 'beneficiary', message: 'Beneficiary address is required' };
  }

  try {
    new PublicKey(address);
  } catch {
    return { field: 'beneficiary', message: 'Invalid Solana address' };
  }

  // Check if beneficiary == creator (only allowed for admin testers)
  if (creatorAddress && address === creatorAddress) {
    if (!isAdminWallet(creatorAddress)) {
      return {
        field: 'beneficiary',
        message: 'You cannot set yourself as the beneficiary'
      };
    }
  }

  return null;
}

export function validateCheckinPeriod(
  checkinPeriodSeconds: number,
  creatorAddress?: string
): ValidationError | null {
  if (!checkinPeriodSeconds || checkinPeriodSeconds <= 0) {
    return { field: 'checkinPeriod', message: 'Check-in period is required' };
  }

  // Use admin-aware minimum check-in period (same as old minimum unlock time)
  const minCheckinSecs = getMinUnlockSeconds(creatorAddress);

  if (checkinPeriodSeconds < minCheckinSecs) {
    const minMinutes = Math.ceil(minCheckinSecs / 60);
    const minHours = Math.ceil(minCheckinSecs / 3600);
    const minDays = Math.ceil(minCheckinSecs / 86400);

    // Show appropriate time unit
    const timeStr = minCheckinSecs >= 86400
      ? `${minDays} ${minDays === 1 ? 'day' : 'days'}`
      : minCheckinSecs >= 3600
      ? `${minHours} ${minHours === 1 ? 'hour' : 'hours'}`
      : `${minMinutes} ${minMinutes === 1 ? 'minute' : 'minutes'}`;

    return {
      field: 'checkinPeriod',
      message: `Check-in period must be at least ${timeStr}`
    };
  }

  // Max 1 year (on-chain validation also enforces this)
  if (checkinPeriodSeconds > 31536000) {
    return {
      field: 'checkinPeriod',
      message: 'Check-in period cannot exceed 1 year'
    };
  }

  return null;
}

export function validateTier(tier: number): ValidationError | null {
  if (tier < 0 || tier > 3) {
    return { field: 'tier', message: 'Invalid tier selected' };
  }
  return null;
}

export function validateDeadManSwitch(
  checkinPeriodSeconds: number,
  notificationWindowSeconds: number,
  gracePeriodSeconds: number
): ValidationError | null {
  // Notification window must be positive
  if (notificationWindowSeconds <= 0) {
    return {
      field: 'notificationWindow',
      message: 'Notification window must be greater than 0'
    };
  }

  // Grace period must be positive
  if (gracePeriodSeconds <= 0) {
    return {
      field: 'gracePeriod',
      message: 'Grace period must be greater than 0'
    };
  }

  // Notification window cannot be longer than or equal to the check-in period
  // This matches the on-chain validation: notification_window_seconds < checkin_period_seconds
  if (notificationWindowSeconds >= checkinPeriodSeconds) {
    return {
      field: 'notificationWindow',
      message: 'Notification window cannot be longer than or equal to check-in period'
    };
  }

  return null;
}

export interface VaultFormData {
  name: string;
  amount: string;
  beneficiary: string;
  checkinPeriodSeconds: number;       // NEW: How often user must check in (replaces unlockTime)
  tier: number;                        // NEW: VaultTier (0=Base, 1=Plus, 2=Premium, 3=Lifetime)
  creationFeePaid: number;             // NEW: Fee paid for this tier
  notificationWindowSeconds: number;   // Auto-calculated based on checkin period
  gracePeriodSeconds: number;          // Auto-calculated based on checkin period
  creatorAddress?: string;             // For admin validation
}

export function validateVaultForm(data: VaultFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  const nameError = validateVaultName(data.name);
  if (nameError) errors.push(nameError);

  const amountError = validateAmount(data.amount);
  if (amountError) errors.push(amountError);

  const beneficiaryError = validateBeneficiary(data.beneficiary, data.creatorAddress);
  if (beneficiaryError) errors.push(beneficiaryError);

  const tierError = validateTier(data.tier);
  if (tierError) errors.push(tierError);

  const checkinError = validateCheckinPeriod(data.checkinPeriodSeconds, data.creatorAddress);
  if (checkinError) errors.push(checkinError);

  // Validate dead man's switch parameters if provided
  if (data.notificationWindowSeconds && data.gracePeriodSeconds) {
    const deadManError = validateDeadManSwitch(
      data.checkinPeriodSeconds,
      data.notificationWindowSeconds,
      data.gracePeriodSeconds
    );
    if (deadManError) errors.push(deadManError);
  }

  return errors;
}
