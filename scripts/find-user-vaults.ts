import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { readFileSync } from 'fs';

const PROGRAM_ID = '74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK';
const RPC_URL = 'https://api.devnet.solana.com';

async function findUserVaults(creatorAddress: string) {
  const connection = new Connection(RPC_URL, 'confirmed');

  // Load IDL
  const idlPath = './web/app/_lib/keepr_vault.json';
  const idl = JSON.parse(readFileSync(idlPath, 'utf-8'));

  // Create minimal provider (no wallet needed for reading)
  const provider = {
    connection,
  } as any;

  const program = new Program(idl, provider);

  console.log('Searching for vaults created by:', creatorAddress);
  console.log('Program ID:', PROGRAM_ID);

  try {
    // Get all Vault accounts
    const vaults = await program.account.vault.all();

    console.log(`\nTotal vaults in program: ${vaults.length}`);

    // Filter by creator
    const userVaults = vaults.filter(v =>
      v.account.creator.toBase58() === creatorAddress
    );

    console.log(`\nVaults created by ${creatorAddress}: ${userVaults.length}\n`);

    userVaults.forEach((vault, i) => {
      console.log(`--- Vault ${i + 1} ---`);
      console.log('PDA:', vault.publicKey.toBase58());
      console.log('Creator:', vault.account.creator.toBase58());
      console.log('Beneficiary:', vault.account.beneficiary.toBase58());
      console.log('Amount Locked:', vault.account.amountLocked.toString(), 'lamports');
      console.log('Unlock Unix:', vault.account.unlockUnix.toString());
      console.log('Released:', vault.account.released);
      console.log('Vault ID:', vault.account.vaultId.toString());
      console.log('');
    });

  } catch (error) {
    console.error('Error fetching vaults:', error);
  }
}

async function findAllVaults() {
  const connection = new Connection(RPC_URL, 'confirmed');

  // Load IDL
  const idlPath = './web/app/_lib/keepr_vault.json';
  const idl = JSON.parse(readFileSync(idlPath, 'utf-8'));

  // Create minimal provider (no wallet needed for reading)
  const provider = {
    connection,
  } as any;

  const program = new Program(idl, provider);

  console.log('Searching for all vaults in program...');
  console.log('Program ID:', PROGRAM_ID);

  try {
    // Get all Vault accounts
    const vaults = await program.account.vault.all();

    console.log(`\nTotal vaults found: ${vaults.length}\n`);

    vaults.forEach((vault, i) => {
      console.log(`--- Vault ${i + 1} ---`);
      console.log('PDA:', vault.publicKey.toBase58());
      console.log('Creator:', vault.account.creator.toBase58());
      console.log('Beneficiary:', vault.account.beneficiary.toBase58());
      console.log('Amount Locked:', vault.account.amountLocked.toString(), 'lamports');
      console.log('Unlock Unix:', vault.account.unlockUnix.toString());
      const unlockDate = new Date(vault.account.unlockUnix.toNumber() * 1000);
      console.log('Unlock Time:', unlockDate.toLocaleString());
      console.log('Released:', vault.account.released);
      console.log('Vault ID:', vault.account.vaultId.toString());
      console.log('');
    });

  } catch (error) {
    console.error('Error fetching vaults:', error);
  }
}

// Get creator address from command line or use default
const creatorAddress = process.argv[2];

if (!creatorAddress) {
  findAllVaults();
} else {
  findUserVaults(creatorAddress);
}
