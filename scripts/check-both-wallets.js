const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');

const DEVNET_USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function checkWallet(address, label) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n${label}`);
  console.log(`Address: ${address}`);

  const pubkey = new PublicKey(address);
  const usdcMint = new PublicKey(DEVNET_USDC);
  const tokenAccount = await getAssociatedTokenAddress(usdcMint, pubkey);

  console.log(`Token Account: ${tokenAccount.toString()}`);

  const accountInfo = await connection.getAccountInfo(tokenAccount);

  if (!accountInfo) {
    console.log(`❌ No USDC token account`);
    return 0;
  }

  const data = accountInfo.data;
  const amount = data.readBigUInt64LE(64);
  const balance = Number(amount) / 1_000_000;

  console.log(`✅ Balance: ${balance} USDC`);
  return balance;
}

async function main() {
  const wallet1 = 'GeQ3YtidFiviY7Bb7ZuZK3mEPV6XXhpmGvycH4s7dJ5S'; // Web app wallet
  const wallet2 = '9ssrJyXicq9m6FpVeeZuwLbwp3qXoNTgv8u4n31GZphQ'; // Test account

  const balance1 = await checkWallet(wallet1, 'Wallet 1 (Web App - connected in browser)');
  const balance2 = await checkWallet(wallet2, 'Wallet 2 (Test Account - has USDC)');

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📊 SUMMARY:`);
  console.log(`\nWallet 1 (Web App): ${balance1} USDC`);
  console.log(`Wallet 2 (Test):    ${balance2} USDC`);

  if (balance1 === 0 && balance2 > 0) {
    console.log(`\n⚠️  ISSUE FOUND:`);
    console.log(`\nThe web app is connecting to Wallet 1, but your USDC is in Wallet 2.`);
    console.log(`\nSOLUTION OPTIONS:`);
    console.log(`\n1. Connect Wallet 2 in the web app (change wallet in Phantom)`);
    console.log(`   OR`);
    console.log(`2. Transfer USDC from Wallet 2 to Wallet 1`);
    console.log(`   Command:`);
    console.log(`   spl-token transfer 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU ${balance2} ${wallet1} --url devnet --owner <wallet2-keypair>`);
  }

  console.log(``);
}

main().catch(console.error);
