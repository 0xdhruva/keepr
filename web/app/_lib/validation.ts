import { PublicKey } from '@solana/web3.js';
import { MIN_UNLOCK_BUFFER_SECS, MAX_LOCK_PER_VAULT } from './solana';

export interface ValidationError {
  field: string;
  message: string;
}

// Admin test wallets from environment
const ADMIN_WALLETS = process.env.NEXT_PUBLIC_ADMIN_WALLETS?.split(',').map(w => w.trim()) || [];
const ADMIN_MIN_UNLOCK_SECS = 120; // 2 minutes for admin testers
const REGULAR_MIN_UNLOCK_SECS = 86400; // 24 hours for regular users

export function isAdminWallet(address: string): boolean {
  return ADMIN_WALLETS.includes(address);
}

export function getMinUnlockSeconds(walletAddress?: string): number {
  if (walletAddress && isAdminWallet(walletAddress)) {
    return ADMIN_MIN_UNLOCK_SECS;
  }
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

export function validateUnlockTime(
  unlockTime: string,
  creatorAddress?: string
): ValidationError | null {
  if (!unlockTime || unlockTime.trim().length === 0) {
    return { field: 'unlockTime', message: 'Unlock time is required' };
  }

  const unlockDate = new Date(unlockTime);

  if (isNaN(unlockDate.getTime())) {
    return { field: 'unlockTime', message: 'Invalid date/time' };
  }

  const now = Date.now();
  const unlockUnix = Math.floor(unlockDate.getTime() / 1000);
  const nowUnix = Math.floor(now / 1000);

  // Use admin-aware minimum unlock time
  const minUnlockSecs = getMinUnlockSeconds(creatorAddress);
  const minUnlockUnix = nowUnix + minUnlockSecs;

  if (unlockUnix <= minUnlockUnix) {
    const minMinutes = Math.ceil(minUnlockSecs / 60);
    const minHours = Math.ceil(minUnlockSecs / 3600);

    // Show hours for 24h, minutes for 2min
    const timeStr = minUnlockSecs >= 3600
      ? `${minHours} ${minHours === 1 ? 'hour' : 'hours'}`
      : `${minMinutes} ${minMinutes === 1 ? 'minute' : 'minutes'}`;

    return {
      field: 'unlockTime',
      message: `Unlock time must be at least ${timeStr} in the future`
    };
  }

  return null;
}

export function validateDeadManSwitch(
  unlockTime: string,
  notificationWindowSeconds: number,
  gracePeriodSeconds: number
): ValidationError | null {
  // Calculate vault period (time from now to unlock)
  const unlockDate = new Date(unlockTime);
  const unlockUnix = Math.floor(unlockDate.getTime() / 1000);
  const nowUnix = Math.floor(Date.now() / 1000);
  const vaultPeriodSeconds = unlockUnix - nowUnix;

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

  // Notification window cannot be longer than the vault period
  if (notificationWindowSeconds >= vaultPeriodSeconds) {
    return {
      field: 'notificationWindow',
      message: 'Notification window cannot be longer than or equal to vault period'
    };
  }

  return null;
}

export interface VaultFormData {
  name: string;
  amount: string;
  beneficiary: string;
  unlockTime: string;
  notificationWindowSeconds: number; // Default: 7 days
  gracePeriodSeconds: number;         // Default: 7 days
  creatorAddress?: string;            // For admin validation
}

export function validateVaultForm(data: VaultFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  const nameError = validateVaultName(data.name);
  if (nameError) errors.push(nameError);

  const amountError = validateAmount(data.amount);
  if (amountError) errors.push(amountError);

  const beneficiaryError = validateBeneficiary(data.beneficiary, data.creatorAddress);
  if (beneficiaryError) errors.push(beneficiaryError);

  const unlockTimeError = validateUnlockTime(data.unlockTime, data.creatorAddress);
  if (unlockTimeError) errors.push(unlockTimeError);

  // Note: Dead man's switch parameters (notificationWindowSeconds, gracePeriodSeconds)
  // are validated on-chain by the program. Client-side validation is skipped because
  // these fields are hardcoded and not exposed in the UI.

  return errors;
}
