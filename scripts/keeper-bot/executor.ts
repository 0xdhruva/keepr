/**
 * Release Executor - Builds and sends release transactions
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import type { ReleaseableVault } from './types';
import * as crypto from 'crypto';

const PROGRAM_ID = '74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK';
const USDC_MINT = process.env.USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'; // Use env var or default

/**
 * Compute Anchor instruction discriminator
 * Uses first 8 bytes of SHA256("global:<instruction_name>")
 */
function getDiscriminator(instructionName: string): Buffer {
  const hash = crypto.createHash('sha256').update(`global:${instructionName}`).digest();
  return Buffer.from(hash.slice(0, 8));
}

/**
 * Build release instruction manually (same logic as web/app/_lib/instructions.ts)
 */
async function buildReleaseInstruction(
  vault: PublicKey,
  creator: PublicKey,
  beneficiary: PublicKey,
  payer: PublicKey,
  programId: PublicKey
): Promise<{ instruction: any; accounts: any }> {
  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault_counter'), creator.toBuffer()],
    programId
  );

  const usdcMint = new PublicKey(USDC_MINT);
  const vaultTokenAccount = await getAssociatedTokenAddress(usdcMint, vault, true);
  const beneficiaryUsdcAta = await getAssociatedTokenAddress(usdcMint, beneficiary);

  console.log(`[Executor] 🔍 DEBUG: Vault addresses`);
  console.log(`  - Vault PDA: ${vault.toBase58()}`);
  console.log(`  - Vault Token Account: ${vaultTokenAccount.toBase58()}`);
  console.log(`  - Creator: ${creator.toBase58()}`);
  console.log(`  - Beneficiary: ${beneficiary.toBase58()}`);

  // Discriminator for release instruction (8 bytes)
  const discriminator = getDiscriminator('release');

  // Instruction data (just discriminator, no args)
  const data = discriminator;

  // Account keys
  const keys = [
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: counterPda, isSigner: false, isWritable: false },
    { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
    { pubkey: usdcMint, isSigner: false, isWritable: false },
    { pubkey: beneficiaryUsdcAta, isSigner: false, isWritable: true },
    { pubkey: beneficiary, isSigner: false, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    {
      pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      isSigner: false,
      isWritable: false,
    }, // Token Program
    {
      pubkey: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
      isSigner: false,
      isWritable: false,
    }, // Associated Token Program
    {
      pubkey: new PublicKey('11111111111111111111111111111111'),
      isSigner: false,
      isWritable: false,
    }, // System Program
  ];

  return {
    instruction: {
      keys,
      programId,
      data,
    },
    accounts: {
      vault,
      counter: counterPda,
      vaultTokenAccount,
      usdcMint,
      beneficiaryUsdcAta,
      beneficiary,
      payer,
    },
  };
}

/**
 * Build close_vault instruction manually
 */
async function buildCloseInstruction(
  vault: PublicKey,
  creator: PublicKey,
  signer: PublicKey,
  programId: PublicKey
): Promise<{ instruction: any }> {
  const usdcMint = new PublicKey(USDC_MINT);
  const vaultTokenAccount = await getAssociatedTokenAddress(usdcMint, vault, true);

  // Discriminator for close_vault instruction (8 bytes)
  const discriminator = getDiscriminator('close_vault');

  // Instruction data (just discriminator, no args)
  const data = discriminator;

  // Account keys
  const keys = [
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: vaultTokenAccount, isSigner: false, isWritable: true },
    { pubkey: creator, isSigner: false, isWritable: true }, // Rent goes here
    { pubkey: signer, isSigner: true, isWritable: false }, // Anyone can sign
    {
      pubkey: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      isSigner: false,
      isWritable: false,
    }, // Token Program
  ];

  return {
    instruction: {
      keys,
      programId,
      data,
    },
  };
}

/**
 * Execute close for a released vault
 */
async function executeClose(
  connection: Connection,
  keeper: Keypair,
  vault: PublicKey,
  creator: PublicKey
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const programId = new PublicKey(PROGRAM_ID);

    console.log(`[Executor] Building close transaction for vault ${vault.toBase58().slice(0, 8)}...`);

    const { instruction } = await buildCloseInstruction(
      vault,
      creator,
      keeper.publicKey,
      programId
    );

    const transaction = new Transaction().add(instruction);

    console.log(`[Executor] Sending close transaction...`);
    const signature = await sendAndConfirmTransaction(connection, transaction, [keeper], {
      commitment: 'confirmed',
    });

    console.log(`[Executor] ✅ Close successful! Rent reclaimed to ${creator.toBase58().slice(0, 8)}...`);
    console.log(`[Executor] Signature: ${signature}`);

    return { success: true, signature };
  } catch (error: any) {
    console.error(`[Executor] ❌ Close failed:`, error.message || error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Execute release for a single vault, then close it to reclaim rent
 */
export async function executeRelease(
  connection: Connection,
  keeper: Keypair,
  vaultData: ReleaseableVault
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const vault = new PublicKey(vaultData.vaultPda);
    const creator = new PublicKey(vaultData.creator);
    const beneficiary = new PublicKey(vaultData.beneficiary);
    const programId = new PublicKey(PROGRAM_ID);

    console.log(`[Executor] Building release transaction for vault ${vaultData.vaultPda.slice(0, 8)}...`);

    const { instruction } = await buildReleaseInstruction(
      vault,
      creator,
      beneficiary,
      keeper.publicKey,
      programId
    );

    const transaction = new Transaction().add(instruction);

    console.log(`[Executor] Sending release transaction...`);
    const releaseSignature = await sendAndConfirmTransaction(connection, transaction, [keeper], {
      commitment: 'confirmed',
    });

    console.log(`[Executor] ✅ Release successful! Signature: ${releaseSignature}`);
    console.log(
      `[Executor] Released ${vaultData.amountLocked / 1_000_000} USDC to ${beneficiary.toBase58().slice(0, 8)}...`
    );

    // Now close the vault to reclaim rent for creator
    console.log(`[Executor] Closing vault to reclaim rent...`);
    const closeResult = await executeClose(connection, keeper, vault, creator);

    if (closeResult.success) {
      console.log(`[Executor] 🎉 Vault fully processed: released + closed`);
    } else {
      console.log(`[Executor] ⚠️ Vault released but close failed: ${closeResult.error}`);
      console.log(`[Executor] Creator can manually close later to reclaim rent.`);
    }

    return { success: true, signature: releaseSignature };
  } catch (error: any) {
    console.error(`[Executor] ❌ Release failed:`, error.message || error);
    return { success: false, error: error.message || String(error) };
  }
}

/**
 * Execute releases for multiple vaults (with error handling)
 */
export async function executeReleases(
  connection: Connection,
  keeper: Keypair,
  vaults: ReleaseableVault[]
): Promise<{ successful: number; failed: number }> {
  let successful = 0;
  let failed = 0;

  for (const vault of vaults) {
    const result = await executeRelease(connection, keeper, vault);
    if (result.success) {
      successful++;
    } else {
      failed++;
    }

    // Wait 1 second between releases to avoid rate limiting
    if (vaults.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { successful, failed };
}
