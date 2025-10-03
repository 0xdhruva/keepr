const { Connection, PublicKey, Keypair, Transaction, SystemProgram } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = require('@solana/spl-token');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DEVNET_USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function main() {
  // Load wallet from Solana CLI default location
  const walletPath = path.join(os.homedir(), '.config', 'solana', 'id.json');

  if (!fs.existsSync(walletPath)) {
    console.log('❌ Wallet not found at:', walletPath);
    console.log('Please create a wallet first:');
    console.log('  solana-keygen new');
    return;
  }

  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log('Wallet:', wallet.publicKey.toString());
  console.log('');

  // Check SOL balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('SOL Balance:', balance / 1e9, 'SOL');

  if (balance < 0.01e9) {
    console.log('');
    console.log('⚠️  Low SOL balance. Get some devnet SOL first:');
    console.log('  solana airdrop 2 --url devnet');
    console.log('');
  }

  const usdcMint = new PublicKey(DEVNET_USDC);
  const tokenAccount = await getAssociatedTokenAddress(usdcMint, wallet.publicKey);

  console.log('Expected USDC Token Account:', tokenAccount.toString());
  console.log('');

  // Check if token account exists
  const accountInfo = await connection.getAccountInfo(tokenAccount);

  if (!accountInfo) {
    console.log('❌ USDC token account does not exist');
    console.log('');
    console.log('Creating token account...');

    try {
      const instruction = createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        tokenAccount,
        wallet.publicKey,
        usdcMint
      );

      const transaction = new Transaction().add(instruction);
      const signature = await connection.sendTransaction(transaction, [wallet]);

      console.log('Transaction sent:', signature);
      console.log('Confirming...');

      await connection.confirmTransaction(signature, 'confirmed');

      console.log('');
      console.log('✅ Token account created successfully!');
      console.log('');
    } catch (error) {
      console.log('❌ Failed to create token account:', error.message);
      return;
    }
  } else {
    console.log('✅ USDC token account already exists');

    // Show balance
    const data = accountInfo.data;
    const amount = data.readBigUInt64LE(64);
    const balance = Number(amount) / 1_000_000;

    console.log('Balance:', balance, 'USDC');
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Next Steps:');
  console.log('');
  console.log('1. You need devnet USDC tokens to test the vault.');
  console.log('');
  console.log('2. Devnet USDC faucets:');
  console.log('   - SPL Token UI: https://spl-token-faucet.com');
  console.log('   - Or ask in Solana Discord for devnet USDC');
  console.log('');
  console.log('3. Alternative: If you control the USDC mint authority,');
  console.log('   you can mint tokens directly.');
  console.log('');
  console.log('4. Once you have USDC, check balance with:');
  console.log('   NODE_PATH=web/node_modules node scripts/check-user-balance.js');
  console.log('');
}

main().catch(console.error);
