import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import * as crypto from 'crypto';
import * as fs from 'fs';

// Configuration
const PROGRAM_ID = new PublicKey('74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK');
const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const VAULT_PDA = new PublicKey('3AockQKLQBRvY2qrvhSFLTWWj8imTAQvMNHFurLsQ1hQ');

// Get instruction discriminator
function getInstructionDiscriminator(name: string): Buffer {
  const hash = crypto.createHash('sha256');
  hash.update(`global:${name}`);
  return hash.digest().slice(0, 8);
}

async function main() {
  console.log('🔧 Fixing stuck vault...\n');

  // Load admin keypair
  const adminKeypairPath = process.env.HOME + '/.config/solana/id.json';
  const adminKeypairData = JSON.parse(fs.readFileSync(adminKeypairPath, 'utf-8'));
  const admin = Keypair.fromSecretKey(Uint8Array.from(adminKeypairData));
  console.log('Admin:', admin.publicKey.toBase58());

  // Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    PROGRAM_ID
  );

  // Get vault account data to find creator and vault_id
  const vaultAccountInfo = await connection.getAccountInfo(VAULT_PDA);
  if (!vaultAccountInfo) {
    throw new Error('Vault account not found');
  }

  const data = vaultAccountInfo.data;
  const creator = new PublicKey(data.slice(8, 40));
  const vaultTokenAccount = new PublicKey(data.slice(104, 136));

  console.log('Vault PDA:', VAULT_PDA.toBase58());
  console.log('Creator:', creator.toBase58());
  console.log('Token Account:', vaultTokenAccount.toBase58());
  console.log('Config PDA:', configPda.toBase58());

  // Build instruction
  const discriminator = getInstructionDiscriminator('fix_released_vault');

  const keys = [
    { pubkey: configPda, isSigner: false, isWritable: false },
    { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
    { pubkey: vaultTokenAccount, isSigner: false, isWritable: false },
    { pubkey: admin.publicKey, isSigner: true, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data: discriminator,
  });

  // Create and send transaction
  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = admin.publicKey;

  console.log('\n📝 Simulating transaction...');
  const simulation = await connection.simulateTransaction(transaction);

  if (simulation.value.err) {
    console.error('❌ Simulation failed:', simulation.value.err);
    console.error('Logs:', simulation.value.logs);
    process.exit(1);
  }

  console.log('✅ Simulation successful!');
  console.log('\n📤 Sending transaction...');

  transaction.sign(admin);
  const signature = await connection.sendRawTransaction(transaction.serialize());
  console.log('Transaction signature:', signature);

  console.log('\n⏳ Confirming...');
  await connection.confirmTransaction(signature, 'confirmed');

  console.log('✅ Vault fixed!');
  console.log('\nView transaction:');
  console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);

  // Verify fix
  console.log('\n🔍 Verifying fix...');
  const updatedAccount = await connection.getAccountInfo(VAULT_PDA);
  if (updatedAccount) {
    const amountLockedBuf = updatedAccount.data.slice(136, 144);
    const amountLocked = Number(new DataView(amountLockedBuf.buffer, amountLockedBuf.byteOffset, 8).getBigUint64(0, true));
    console.log('Updated amount_locked:', amountLocked);

    if (amountLocked === 0) {
      console.log('✅ Vault successfully fixed! amount_locked = 0');
    } else {
      console.log('⚠️  Warning: amount_locked still shows:', amountLocked);
    }
  }
}

main().catch(console.error);
