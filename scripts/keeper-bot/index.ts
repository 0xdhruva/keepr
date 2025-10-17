#!/usr/bin/env node
/**
 * Keeper Bot - Automatically releases vaults when grace period expires
 *
 * Usage:
 *   npm run keeper-bot
 *
 * Environment variables:
 *   KEEPER_PRIVATE_KEY - Base58 encoded private key for keeper wallet
 *   SOLANA_RPC_URL - RPC endpoint (default: devnet)
 *   POLL_INTERVAL_MS - How often to check for vaults (default: 60000 = 1 minute)
 */

import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { scanForReleaseableVaults } from './scanner';
import { executeReleases } from './executor';

// Configuration
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '60000', 10);

// Validate configuration
if (!KEEPER_PRIVATE_KEY) {
  console.error('❌ Error: KEEPER_PRIVATE_KEY environment variable is required');
  console.error('');
  console.error('To generate a new keypair:');
  console.error('  solana-keygen new --outfile keeper-keypair.json');
  console.error('');
  console.error('To get the private key in base58:');
  console.error('  cat keeper-keypair.json | jq -r \'.[] | tostring\' | paste -sd "," - | node -e "console.log(require(\'bs58\').encode(Buffer.from(JSON.parse(\`[\${require(\'fs\').readFileSync(0, \'utf-8\').trim()}]\`))))"');
  console.error('');
  console.error('Then set the environment variable:');
  console.error('  export KEEPER_PRIVATE_KEY=<base58_private_key>');
  process.exit(1);
}

// Initialize keeper wallet
let keeper: Keypair;
try {
  const privateKeyBytes = bs58.decode(KEEPER_PRIVATE_KEY);
  keeper = Keypair.fromSecretKey(privateKeyBytes);
  console.log(`✅ Keeper wallet loaded: ${keeper.publicKey.toBase58()}`);
} catch (error) {
  console.error('❌ Error: Invalid KEEPER_PRIVATE_KEY format. Must be base58 encoded.');
  process.exit(1);
}

// Initialize connection
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
console.log(`✅ Connected to RPC: ${SOLANA_RPC_URL}`);

// Stats
let totalReleases = 0;
let totalFailed = 0;
let scanCount = 0;

/**
 * Main polling loop
 */
async function pollAndRelease() {
  scanCount++;
  const timestamp = new Date().toISOString();
  console.log('');
  console.log(`[${timestamp}] === Scan #${scanCount} ===`);

  try {
    // Scan for releaseable vaults
    const releaseableVaults = await scanForReleaseableVaults(connection);

    if (releaseableVaults.length === 0) {
      console.log('[Keeper] No vaults ready for release');
      return;
    }

    // Execute releases
    console.log(`[Keeper] Executing ${releaseableVaults.length} release(s)...`);
    const { successful, failed } = await executeReleases(connection, keeper, releaseableVaults);

    totalReleases += successful;
    totalFailed += failed;

    console.log(`[Keeper] Batch complete: ${successful} successful, ${failed} failed`);
    console.log(`[Keeper] Total lifetime: ${totalReleases} successful, ${totalFailed} failed`);
  } catch (error) {
    console.error('[Keeper] Error during poll cycle:', error);
  }
}

/**
 * Start keeper bot
 */
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║               Keepr Vault Keeper Bot                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Keeper Address:  ${keeper.publicKey.toBase58()}`);
  console.log(`RPC Endpoint:    ${SOLANA_RPC_URL}`);
  console.log(`Poll Interval:   ${POLL_INTERVAL_MS / 1000}s`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');

  // Check keeper wallet balance
  try {
    const balance = await connection.getBalance(keeper.publicKey);
    console.log(`Keeper Balance:  ${(balance / 1e9).toFixed(4)} SOL`);

    if (balance === 0) {
      console.warn('');
      console.warn('⚠️  WARNING: Keeper wallet has 0 SOL balance!');
      console.warn('   You need SOL to pay for transaction fees.');
      console.warn('');
      console.warn('   To fund the keeper wallet (devnet):');
      console.warn(`   solana airdrop 2 ${keeper.publicKey.toBase58()} --url devnet`);
      console.warn('');
    }
  } catch (error) {
    console.error('Failed to check keeper balance:', error);
  }

  // Run initial scan immediately
  await pollAndRelease();

  // Set up polling interval
  setInterval(pollAndRelease, POLL_INTERVAL_MS);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║               Keeper Bot Shutting Down                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Total Scans:     ${scanCount}`);
  console.log(`Total Releases:  ${totalReleases}`);
  console.log(`Total Failures:  ${totalFailed}`);
  console.log('');
  console.log('Goodbye!');
  process.exit(0);
});

// Start the bot
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
