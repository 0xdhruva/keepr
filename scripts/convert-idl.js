const fs = require('fs');
const crypto = require('crypto');

// Read the legacy IDL
const legacyIdl = JSON.parse(fs.readFileSync('./web/app/_lib/keepr_vault.json.backup', 'utf8'));

// Helper to generate discriminator (first 8 bytes of SHA256)
function generateDiscriminator(prefix, name) {
  const preimage = `${prefix}:${name}`;
  const hash = crypto.createHash('sha256').update(preimage).digest();
  return Array.from(hash.slice(0, 8));
}

// Convert legacy accounts to new format
function convertAccount(acc) {
  return {
    name: acc.name,
    writable: acc.isMut || false,
    signer: acc.isSigner || false,
    ...(acc.address && { address: acc.address })
  };
}

// Convert legacy instructions
const newInstructions = legacyIdl.instructions.map(ix => ({
  name: ix.name,
  discriminator: generateDiscriminator('global', ix.name),
  accounts: ix.accounts.map(convertAccount),
  args: ix.args || []
}));

// Extract account types from legacy "accounts" array
const accountTypes = legacyIdl.accounts || [];
const newAccounts = accountTypes.map(acc => ({
  name: acc.name,
  discriminator: generateDiscriminator('account', acc.name)
}));

// Create types array from account definitions
const newTypes = accountTypes.map(acc => ({
  name: acc.name,
  type: acc.type
}));

// Create new format IDL
const newIdl = {
  address: legacyIdl.address || legacyIdl.metadata?.address || "74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK",
  metadata: {
    name: legacyIdl.name,
    version: legacyIdl.version,
    spec: "0.1.0",
    description: "Time-locked USDC vaults with dead man's switch"
  },
  instructions: newInstructions,
  accounts: newAccounts,
  types: newTypes,
  events: legacyIdl.events || [],
  errors: legacyIdl.errors || []
};

// Write the new IDL
fs.writeFileSync('./web/app/_lib/keepr_vault.json', JSON.stringify(newIdl, null, 2));

console.log('IDL converted successfully!');
console.log('Instructions:', newInstructions.length);
console.log('Accounts:', newAccounts.length);
console.log('Types:', newTypes.length);
