const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');

const USER_WALLET = 'GeQ3YtidFiviY7Bb7ZuZK3mEPV6XXhpmGvycH4s7dJ5S';
const DEVNET_USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function main() {
  const userPubkey = new PublicKey(USER_WALLET);
  const usdcMint = new PublicKey(DEVNET_USDC);

  // Get user's USDC token account
  const userTokenAccount = await getAssociatedTokenAddress(usdcMint, userPubkey);

  console.log('User:', USER_WALLET);
  console.log('USDC Mint:', DEVNET_USDC);
  console.log('Token Account:', userTokenAccount.toString());

  // Check if account exists
  const accountInfo = await connection.getAccountInfo(userTokenAccount);

  if (!accountInfo) {
    console.log('\n❌ User does NOT have a USDC token account!');
    console.log('You need to create one and get some devnet USDC.');
    return;
  }

  console.log('\n✅ Token account exists');

  // Parse token account data
  const data = accountInfo.data;
  const amount = data.readBigUInt64LE(64);

  console.log('Balance:', Number(amount) / 1_000_000, 'USDC');
  console.log('Balance (lamports):', amount.toString());
}

main().catch(console.error);
