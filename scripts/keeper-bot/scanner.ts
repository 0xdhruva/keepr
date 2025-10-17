/**
 * Vault Scanner - Scans on-chain for vaults eligible for release
 */

import { Connection, PublicKey } from '@solana/web3.js';
import type { VaultData, ReleaseableVault } from './types';

const PROGRAM_ID = '74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK';
const VAULT_SIZE = 237; // 8 discriminator + 229 struct data

/**
 * Scan all vaults from the program
 */
export async function scanAllVaults(connection: Connection): Promise<VaultData[]> {
  const programId = new PublicKey(PROGRAM_ID);

  console.log('[Scanner] Fetching all vault accounts...');
  const accounts = await connection.getProgramAccounts(programId, {
    filters: [
      {
        dataSize: VAULT_SIZE,
      },
    ],
  });

  console.log(`[Scanner] Found ${accounts.length} vault accounts on-chain`);

  const vaults: VaultData[] = [];

  for (const account of accounts) {
    try {
      const data = account.account.data;

      // Parse vault data
      const creator = new PublicKey(data.slice(8, 40));
      const beneficiary = new PublicKey(data.slice(40, 72));
      const amountLockedBuf = data.slice(136, 144);
      const unlockUnixBuf = data.slice(144, 152);
      const released = data[152] === 1;
      const cancelled = data[153] === 1;
      const gracePeriodBuf = data.slice(204, 208);

      const amountLocked = Number(
        new DataView(amountLockedBuf.buffer, amountLockedBuf.byteOffset, 8).getBigUint64(0, true)
      );
      const unlockUnix = Number(
        new DataView(unlockUnixBuf.buffer, unlockUnixBuf.byteOffset, 8).getBigInt64(0, true)
      );
      const gracePeriodSeconds = new DataView(
        gracePeriodBuf.buffer,
        gracePeriodBuf.byteOffset,
        4
      ).getUint32(0, true);

      vaults.push({
        vaultPda: account.pubkey.toBase58(),
        creator: creator.toBase58(),
        beneficiary: beneficiary.toBase58(),
        amountLocked,
        unlockUnix,
        gracePeriodSeconds,
        released,
        cancelled,
      });
    } catch (error) {
      console.error(`[Scanner] Error parsing vault ${account.pubkey.toBase58()}:`, error);
    }
  }

  return vaults;
}

/**
 * Filter vaults that are eligible for release
 */
export function filterReleaseableVaults(vaults: VaultData[], currentTime: number): ReleaseableVault[] {
  return vaults
    .filter((vault) => {
      // Must not be already released or cancelled
      if (vault.released || vault.cancelled) {
        return false;
      }

      // Must have funds
      if (vault.amountLocked === 0) {
        return false;
      }

      // Grace period must have expired
      const gracePeriodEnd = vault.unlockUnix + vault.gracePeriodSeconds;
      if (currentTime < gracePeriodEnd) {
        return false;
      }

      return true;
    })
    .map((vault) => ({
      ...vault,
      gracePeriodEnd: vault.unlockUnix + vault.gracePeriodSeconds,
    }));
}

/**
 * Main scanning function - returns vaults ready for release
 */
export async function scanForReleaseableVaults(
  connection: Connection
): Promise<ReleaseableVault[]> {
  const allVaults = await scanAllVaults(connection);
  const currentTime = Math.floor(Date.now() / 1000);
  const releaseableVaults = filterReleaseableVaults(allVaults, currentTime);

  console.log(`[Scanner] Found ${releaseableVaults.length} vaults eligible for release`);

  if (releaseableVaults.length > 0) {
    releaseableVaults.forEach((vault) => {
      const overdue = currentTime - vault.gracePeriodEnd;
      console.log(
        `  - ${vault.vaultPda.slice(0, 8)}... | Amount: ${vault.amountLocked / 1_000_000} USDC | Overdue: ${overdue}s`
      );
    });
  }

  return releaseableVaults;
}
