import { PublicKey } from '@solana/web3.js';
import { MIN_UNLOCK_BUFFER_SECS, MAX_LOCK_PER_VAULT } from './solana';

export interface ValidationError {
  field: string;
  message: string;
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

export function validateBeneficiary(address: string): ValidationError | null {
  if (!address || address.trim().length === 0) {
    return { field: 'beneficiary', message: 'Beneficiary address is required' };
  }
  
  try {
    new PublicKey(address);
    return null;
  } catch {
    return { field: 'beneficiary', message: 'Invalid Solana address' };
  }
}

export function validateUnlockTime(unlockTime: string): ValidationError | null {
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
  const minUnlockUnix = nowUnix + MIN_UNLOCK_BUFFER_SECS;
  
  if (unlockUnix <= minUnlockUnix) {
    const minMinutes = Math.ceil(MIN_UNLOCK_BUFFER_SECS / 60);
    return { 
      field: 'unlockTime', 
      message: `Unlock time must be at least ${minMinutes} minutes in the future` 
    };
  }
  
  return null;
}

export interface VaultFormData {
  name: string;
  amount: string;
  beneficiary: string;
  unlockTime: string;
}

export function validateVaultForm(data: VaultFormData): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const nameError = validateVaultName(data.name);
  if (nameError) errors.push(nameError);
  
  const amountError = validateAmount(data.amount);
  if (amountError) errors.push(amountError);
  
  const beneficiaryError = validateBeneficiary(data.beneficiary);
  if (beneficiaryError) errors.push(beneficiaryError);
  
  const unlockTimeError = validateUnlockTime(data.unlockTime);
  if (unlockTimeError) errors.push(unlockTimeError);
  
  return errors;
}
