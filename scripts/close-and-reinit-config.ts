import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import fs from 'fs';
import crypto from 'crypto';

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK');

  // Load your wallet
  const walletKeypairData = JSON.parse(fs.readFileSync('/Users/dhruva/.config/solana/id.json', 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletKeypairData));

  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);

  console.log('Config PDA:', configPda.toBase58());
  console.log('Wallet:', wallet.publicKey.toBase58());

  // Step 1: Close old config
  console.log('\n=== Step 1: Closing old config ===');

  // Calculate discriminator for close_config
  const hash = crypto.createHash('sha256').update('global:close_config').digest();
  const discriminator = hash.subarray(0, 8);

  console.log('Discriminator:', discriminator.toString('hex'));

  const closeIx = new TransactionInstruction({
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    ],
    programId,
    data: discriminator,
  });

  const closeTx = new Transaction().add(closeIx);
  closeTx.feePayer = wallet.publicKey;
  closeTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  try {
    const sig = await connection.sendTransaction(closeTx, [wallet]);
    console.log('Close config transaction:', sig);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('✅ Old config closed successfully!');
  } catch (error: any) {
    console.error('Error closing config:', error.message || error);
    throw error;
  }

  // Wait a bit for the account to be closed
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 2: Initialize new config
  console.log('\n=== Step 2: Initializing new config ===');

  const usdcMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'); // Devnet USDC
  const maxLockPerVault = 500_000_000; // 500 USDC
  const paused = false;
  const treasury = wallet.publicKey; // Use your wallet as treasury for now

  // Calculate discriminator for init_config
  const initHash = crypto.createHash('sha256').update('global:init_config').digest();
  const initDiscriminator = initHash.subarray(0, 8);

  console.log('Init discriminator:', initDiscriminator.toString('hex'));

  // Serialize init_config parameters
  const data = Buffer.alloc(8 + 32 + 32 + 8 + 1 + 32);
  let offset = 0;

  // Discriminator
  initDiscriminator.copy(data, offset);
  offset += 8;

  // usdc_mint (Pubkey)
  Buffer.from(usdcMint.toBytes()).copy(data, offset);
  offset += 32;

  // max_lock_per_vault (u64 LE)
  data.writeBigUInt64LE(BigInt(maxLockPerVault), offset);
  offset += 8;

  // paused (bool)
  data.writeUInt8(paused ? 1 : 0, offset);
  offset += 1;

  // treasury (Pubkey)
  Buffer.from(treasury.toBytes()).copy(data, offset);
  offset += 32;

  console.log('Instruction data:', data.toString('hex'));
  console.log('Data length:', data.length, 'bytes');

  const initIx = new TransactionInstruction({
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data,
  });

  const initTx = new Transaction().add(initIx);
  initTx.feePayer = wallet.publicKey;
  initTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  try {
    const sig = await connection.sendTransaction(initTx, [wallet]);
    console.log('Init config transaction:', sig);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('✅ New config initialized successfully!');
    console.log('\n=== Config Details ===');
    console.log('Admin:', wallet.publicKey.toBase58());
    console.log('USDC Mint:', usdcMint.toBase58());
    console.log('Max Lock Per Vault:', maxLockPerVault / 1_000_000, 'USDC');
    console.log('Treasury:', treasury.toBase58());
    console.log('Paused:', paused);
  } catch (error: any) {
    console.error('Error initializing config:', error.message || error);
    // Try to get transaction logs
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    throw error;
  }
}

main().catch(console.error);
