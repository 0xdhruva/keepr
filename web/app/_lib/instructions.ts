import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

/**
 * Compute Anchor instruction discriminator
 * Uses first 8 bytes of SHA256("global:<instruction_name>")
 */
async function getDiscriminator(instructionName: string): Promise<Buffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`global:${instructionName}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(new Uint8Array(hashBuffer).slice(0, 8));
}

/**
 * Encode a PublicKey to Buffer (32 bytes)
 */
function encodePublicKey(pubkey: PublicKey): Buffer {
  return Buffer.from(pubkey.toBytes());
}

/**
 * Encode u64 to Buffer (8 bytes little-endian)
 */
function encodeU64(value: number | bigint): Buffer {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(value), true); // true = little-endian
  return Buffer.from(buffer);
}

/**
 * Encode i64 to Buffer (8 bytes little-endian)
 */
function encodeI64(value: number | bigint): Buffer {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigInt64(0, BigInt(value), true); // true = little-endian
  return Buffer.from(buffer);
}

/**
 * Encode Vec<u8> to Buffer (4-byte length prefix + data)
 */
function encodeVecU8(data: number[] | Uint8Array): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32LE(data.length);
  return Buffer.concat([length, Buffer.from(data)]);
}

// Cache discriminators
const discriminatorCache: Record<string, Buffer> = {};

async function getCachedDiscriminator(name: string): Promise<Buffer> {
  if (!discriminatorCache[name]) {
    discriminatorCache[name] = await getDiscriminator(name);
  }
  return discriminatorCache[name];
}

/**
 * Build create_vault instruction
 */
export async function createVaultInstruction(params: {
  config: PublicKey;
  counter: PublicKey;
  vault: PublicKey;
  vaultTokenAccount: PublicKey;
  usdcMint: PublicKey;
  creator: PublicKey;
  beneficiary: PublicKey;
  unlockUnix: number | bigint;
  nameHash: number[] | Uint8Array;
  programId: PublicKey;
}): Promise<TransactionInstruction> {
  const discriminator = await getCachedDiscriminator('create_vault');
  console.log('create_vault discriminator:', Array.from(discriminator).map(b => b.toString(16).padStart(2, '0')).join(''));

  // Encode instruction data: discriminator + beneficiary + unlock_unix + name_hash
  const data = Buffer.concat([
    discriminator,
    encodePublicKey(params.beneficiary),
    encodeI64(params.unlockUnix),
    encodeVecU8(params.nameHash),
  ]);

  const keys = [
    { pubkey: params.config, isSigner: false, isWritable: false },
    { pubkey: params.counter, isSigner: false, isWritable: true },
    { pubkey: params.vault, isSigner: false, isWritable: true },
    { pubkey: params.vaultTokenAccount, isSigner: false, isWritable: true },
    { pubkey: params.usdcMint, isSigner: false, isWritable: false },
    { pubkey: params.creator, isSigner: true, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: params.programId,
    data,
  });
}

/**
 * Build deposit_usdc instruction
 */
export async function depositUsdcInstruction(params: {
  config: PublicKey;
  vault: PublicKey;
  counter: PublicKey;
  vaultTokenAccount: PublicKey;
  usdcMint: PublicKey;
  creatorUsdcAta: PublicKey;
  creator: PublicKey;
  amount: number | bigint;
  programId: PublicKey;
}): Promise<TransactionInstruction> {
  const discriminator = await getCachedDiscriminator('deposit_usdc');

  // Encode instruction data: discriminator + amount
  const data = Buffer.concat([discriminator, encodeU64(params.amount)]);

  const keys = [
    { pubkey: params.config, isSigner: false, isWritable: false },
    { pubkey: params.vault, isSigner: false, isWritable: true },
    { pubkey: params.counter, isSigner: false, isWritable: false },
    { pubkey: params.vaultTokenAccount, isSigner: false, isWritable: true },
    { pubkey: params.usdcMint, isSigner: false, isWritable: false },
    { pubkey: params.creatorUsdcAta, isSigner: false, isWritable: true },
    { pubkey: params.creator, isSigner: true, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: params.programId,
    data,
  });
}

/**
 * Build release instruction
 */
export async function releaseInstruction(params: {
  vault: PublicKey;
  counter: PublicKey;
  vaultTokenAccount: PublicKey;
  usdcMint: PublicKey;
  beneficiaryUsdcAta: PublicKey;
  beneficiary: PublicKey;
  programId: PublicKey;
}): Promise<TransactionInstruction> {
  const discriminator = await getCachedDiscriminator('release');

  // Release has no arguments, just the discriminator
  const data = discriminator;

  const keys = [
    { pubkey: params.vault, isSigner: false, isWritable: true },
    { pubkey: params.counter, isSigner: false, isWritable: false },
    { pubkey: params.vaultTokenAccount, isSigner: false, isWritable: true },
    { pubkey: params.usdcMint, isSigner: false, isWritable: false },
    { pubkey: params.beneficiaryUsdcAta, isSigner: false, isWritable: true },
    { pubkey: params.beneficiary, isSigner: true, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: params.programId,
    data,
  });
}

/**
 * Build close_vault instruction
 */
export async function closeVaultInstruction(params: {
  vault: PublicKey;
  vaultTokenAccount: PublicKey;
  creator: PublicKey;
  programId: PublicKey;
}): Promise<TransactionInstruction> {
  const discriminator = await getCachedDiscriminator('close_vault');

  // Close vault has no arguments
  const data = discriminator;

  const keys = [
    { pubkey: params.vault, isSigner: false, isWritable: true },
    { pubkey: params.vaultTokenAccount, isSigner: false, isWritable: true },
    { pubkey: params.creator, isSigner: true, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: params.programId,
    data,
  });
}
