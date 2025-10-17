/**
 * Shared types for keeper bot
 */

export interface VaultData {
  vaultPda: string;
  creator: string;
  beneficiary: string;
  amountLocked: number;
  unlockUnix: number;
  gracePeriodSeconds: number;
  released: boolean;
  cancelled: boolean;
}

export interface ReleaseableVault extends VaultData {
  gracePeriodEnd: number;
}
