import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { connection, PROGRAM_ID } from './solana';
import idl from './idl.json';

export function getProgram(wallet: AnchorWallet) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  const programId = new PublicKey(PROGRAM_ID || idl.metadata.address);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Program(idl as any, provider);
}

export function getConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  );
}

export function getCounterPDA(creator: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault_counter'), creator.toBuffer()],
    programId
  );
}

export function getVaultPDA(
  creator: PublicKey,
  vaultId: number,
  programId: PublicKey
): [PublicKey, number] {
  const vaultIdBuffer = Buffer.alloc(8);
  vaultIdBuffer.writeBigUInt64LE(BigInt(vaultId));
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), creator.toBuffer(), vaultIdBuffer],
    programId
  );
}
