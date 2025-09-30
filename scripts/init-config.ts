import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// Load IDL
const idlPath = path.join(__dirname, '../target/idl/keepr_vault.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

// Configuration
const PROGRAM_ID = new PublicKey('74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const MAX_LOCK_PER_VAULT = 500_000_000; // 500 USDC (6 decimals)

async function main() {
  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet from file
  const walletPath = process.env.HOME + '/.config/solana/id.json';
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );
  
  console.log('Admin wallet:', walletKeypair.publicKey.toBase58());
  console.log('Program ID:', PROGRAM_ID.toBase58());
  
  // Create provider
  const wallet = {
    publicKey: walletKeypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(walletKeypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      return txs.map(tx => {
        tx.partialSign(walletKeypair);
        return tx;
      });
    },
  };
  
  const provider = new AnchorProvider(connection, wallet as any, {
    commitment: 'confirmed',
  });
  
  // Create program instance
  const program = new Program(idl, provider);
  
  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    PROGRAM_ID
  );
  
  console.log('Config PDA:', configPda.toBase58());
  
  // Check if config already exists
  try {
    const configAccount = await connection.getAccountInfo(configPda);
    if (configAccount) {
      console.log('✅ Config already initialized!');
      return;
    }
  } catch (e) {
    // Config doesn't exist, continue
  }
  
  console.log('Initializing config...');
  
  try {
    const tx = await program.methods
      .initConfig(USDC_MINT, MAX_LOCK_PER_VAULT)
      .accounts({
        config: configPda,
        admin: walletKeypair.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log('✅ Config initialized!');
    console.log('Transaction:', tx);
    console.log('Explorer:', `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  } catch (error) {
    console.error('❌ Failed to initialize config:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
