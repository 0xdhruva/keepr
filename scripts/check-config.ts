import { Connection, PublicKey } from '@solana/web3.js';

const PROGRAM_ID = '74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK';
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function main() {
  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    new PublicKey(PROGRAM_ID)
  );

  console.log('Config PDA:', configPda.toString());

  // Check if account exists
  const accountInfo = await connection.getAccountInfo(configPda);

  if (!accountInfo) {
    console.log('\n❌ Config account does NOT exist!');
    console.log('You need to run init_config first.');
    return;
  }

  console.log('\n✅ Config account exists');
  console.log('Size:', accountInfo.data.length, 'bytes');
  console.log('Owner:', accountInfo.owner.toString());
  console.log('Lamports:', accountInfo.lamports);

  // Try to parse the data
  const data = accountInfo.data;
  if (data.length >= 73) {
    // Skip 8-byte discriminator
    const adminBytes = data.slice(8, 40);
    const usdcMintBytes = data.slice(40, 72);
    const maxLock = data.readBigUInt64LE(72);
    const paused = data[80] === 1;

    console.log('\nConfig data:');
    console.log('  Admin:', new PublicKey(adminBytes).toString());
    console.log('  USDC Mint:', new PublicKey(usdcMintBytes).toString());
    console.log('  Max lock per vault:', maxLock.toString());
    console.log('  Paused:', paused);
  }
}

main().catch(console.error);
