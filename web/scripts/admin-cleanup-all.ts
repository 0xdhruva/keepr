import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import * as crypto from 'crypto';
import * as fs from 'fs';

const PROGRAM_ID = new PublicKey('74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK');
const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const CREATOR = new PublicKey('9ssrJyXicq9m6FpVeeZuwLbwp3qXoNTgv8u4n31GZphQ');

function getInstructionDiscriminator(name: string): Buffer {
  const hash = crypto.createHash('sha256');
  hash.update(`global:${name}`);
  return hash.digest().slice(0, 8);
}

async function main() {
  console.log('🧹 ADMIN CLEANUP - ALL VAULTS\n');

  const adminKeypairPath = process.env.HOME + '/.config/solana/id.json';
  const adminKeypairData = JSON.parse(fs.readFileSync(adminKeypairPath, 'utf-8'));
  const admin = Keypair.fromSecretKey(Uint8Array.from(adminKeypairData));

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);

  // Get all vaults
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ memcmp: { offset: 8, bytes: CREATOR.toBase58() } }],
  });

  console.log(`Found ${accounts.length} vaults\n`);

  const vaultsToRelease: PublicKey[] = [];
  const vaultsToFix: PublicKey[] = [];
  const vaultsToClose: PublicKey[] = [];

  // Analyze each vault
  for (const account of accounts) {
    const data = account.account.data;
    const vaultTokenAccountKey = new PublicKey(data.slice(104, 136));
    const amountLockedBuf = data.slice(136, 144);
    const released = data[152] === 1;
    const cancelled = data[153] === 1;
    const amountLocked = Number(new DataView(amountLockedBuf.buffer, amountLockedBuf.byteOffset, 8).getBigUint64(0, true));

    const tokenAccountInfo = await connection.getAccountInfo(vaultTokenAccountKey);
    let actualBalance = 0;
    if (tokenAccountInfo) {
      const tokenAmount = tokenAccountInfo.data.slice(64, 72);
      actualBalance = Number(new DataView(tokenAmount.buffer, tokenAmount.byteOffset, 8).getBigUint64(0, true));
    }

    const vaultPda = account.pubkey;

    if (actualBalance > 0 && !released && !cancelled) {
      vaultsToRelease.push(vaultPda);
    } else if (released && amountLocked > 0 && actualBalance === 0) {
      vaultsToFix.push(vaultPda);
    } else if (actualBalance === 0 && (released || cancelled || amountLocked === 0)) {
      vaultsToClose.push(vaultPda);
    }
  }

  console.log('📋 CLEANUP PLAN:');
  console.log(`  - Release: ${vaultsToRelease.length} vaults`);
  console.log(`  - Fix bugs: ${vaultsToFix.length} vaults`);
  console.log(`  - Close: ${vaultsToClose.length} vaults`);
  console.log('');

  // Step 1: Release all active vaults
  console.log('📤 STEP 1: Releasing vaults with funds...');
  for (const vaultPda of vaultsToRelease) {
    try {
      const vaultAccount = await connection.getAccountInfo(vaultPda);
      if (!vaultAccount) continue;

      const data = vaultAccount.data;
      const beneficiary = new PublicKey(data.slice(40, 72));
      const vaultTokenAccountKey = new PublicKey(data.slice(104, 136));
      const creator = new PublicKey(data.slice(8, 40));
      const vaultIdBuf = data.slice(174, 182);
      const vaultId = new DataView(vaultIdBuf.buffer, vaultIdBuf.byteOffset, 8).getBigUint64(0, true);

      const [counterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_counter'), creator.toBuffer()],
        PROGRAM_ID
      );

      const beneficiaryAta = await getAssociatedTokenAddress(DEVNET_USDC_MINT, beneficiary, true);

      const discriminator = getInstructionDiscriminator('release');
      const keys = [
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: counterPda, isSigner: false, isWritable: false },
        { pubkey: vaultTokenAccountKey, isSigner: false, isWritable: true },
        { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
        { pubkey: beneficiaryAta, isSigner: false, isWritable: true },
        { pubkey: beneficiary, isSigner: false, isWritable: false },
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ];

      const instruction = new TransactionInstruction({ keys, programId: PROGRAM_ID, data: discriminator });
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = admin.publicKey;

      transaction.sign(admin);
      const signature = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      console.log(`  ✓ Released ${vaultPda.toBase58().slice(0, 8)}... | TX: ${signature.slice(0, 8)}...`);
    } catch (error) {
      console.error(`  ✗ Failed to release ${vaultPda.toBase58().slice(0, 8)}...`, error instanceof Error ? error.message : error);
    }
  }

  // Step 2: Fix bugged vaults
  console.log('\n🔧 STEP 2: Fixing bugged vaults...');
  for (const vaultPda of vaultsToFix) {
    try {
      const vaultAccount = await connection.getAccountInfo(vaultPda);
      if (!vaultAccount) continue;

      const data = vaultAccount.data;
      const vaultTokenAccountKey = new PublicKey(data.slice(104, 136));

      const discriminator = getInstructionDiscriminator('fix_released_vault');
      const keys = [
        { pubkey: configPda, isSigner: false, isWritable: false },
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: vaultTokenAccountKey, isSigner: false, isWritable: false },
        { pubkey: admin.publicKey, isSigner: true, isWritable: false },
      ];

      const instruction = new TransactionInstruction({ keys, programId: PROGRAM_ID, data: discriminator });
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = admin.publicKey;

      transaction.sign(admin);
      const signature = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      console.log(`  ✓ Fixed ${vaultPda.toBase58().slice(0, 8)}... | TX: ${signature.slice(0, 8)}...`);
    } catch (error) {
      console.error(`  ✗ Failed to fix ${vaultPda.toBase58().slice(0, 8)}...`, error instanceof Error ? error.message : error);
    }
  }

  // Step 3: Close all empty vaults
  console.log('\n🗑️  STEP 3: Closing empty vaults...');
  for (const vaultPda of vaultsToClose) {
    try {
      const vaultAccount = await connection.getAccountInfo(vaultPda);
      if (!vaultAccount) continue;

      const data = vaultAccount.data;
      const creator = new PublicKey(data.slice(8, 40));
      const vaultTokenAccountKey = new PublicKey(data.slice(104, 136));

      const discriminator = getInstructionDiscriminator('close_vault');
      const keys = [
        { pubkey: vaultPda, isSigner: false, isWritable: true },
        { pubkey: vaultTokenAccountKey, isSigner: false, isWritable: true },
        { pubkey: creator, isSigner: false, isWritable: true },
        { pubkey: admin.publicKey, isSigner: true, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ];

      const instruction = new TransactionInstruction({ keys, programId: PROGRAM_ID, data: discriminator });
      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = admin.publicKey;

      transaction.sign(admin);
      const signature = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      console.log(`  ✓ Closed ${vaultPda.toBase58().slice(0, 8)}... | TX: ${signature.slice(0, 8)}...`);
    } catch (error) {
      console.error(`  ✗ Failed to close ${vaultPda.toBase58().slice(0, 8)}...`, error instanceof Error ? error.message : error);
    }
  }

  // Final check
  console.log('\n✅ CLEANUP COMPLETE!');
  console.log('\nChecking final balance...');

  const creatorAta = await getAssociatedTokenAddress(DEVNET_USDC_MINT, CREATOR);
  const ataInfo = await connection.getAccountInfo(creatorAta);
  if (ataInfo) {
    const tokenAmount = ataInfo.data.slice(64, 72);
    const balance = Number(new DataView(tokenAmount.buffer, tokenAmount.byteOffset, 8).getBigUint64(0, true));
    console.log(`Final wallet balance: ${(balance / 1_000_000).toFixed(2)} USDC`);
  }
}

main().catch(console.error);
