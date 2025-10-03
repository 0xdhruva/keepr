const fs = require('fs');
const path = require('path');

const idlPath = path.join(__dirname, '../web/app/_lib/keepr_vault.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

// Add cancelVault instruction
const cancelVault = {
  name: "cancelVault",
  discriminator: [150, 95, 141, 252, 158, 53, 60, 102],
  accounts: [
    { name: "vault", writable: true, signer: false },
    { name: "counter", writable: false, signer: false },
    { name: "vaultTokenAccount", writable: true, signer: false },
    { name: "usdcMint", writable: false, signer: false },
    { name: "creatorUsdcAta", writable: true, signer: false },
    { name: "creator", writable: true, signer: true },
    { name: "tokenProgram", writable: false, signer: false },
    { name: "associatedTokenProgram", writable: false, signer: false },
    { name: "systemProgram", writable: false, signer: false }
  ],
  args: []
};

// Add updateAdminTestWallets instruction
const updateAdminTestWallets = {
  name: "updateAdminTestWallets",
  discriminator: [78, 232, 151, 77, 196, 236, 111, 169],
  accounts: [
    { name: "config", writable: true, signer: false },
    { name: "admin", writable: false, signer: true }
  ],
  args: [
    {
      name: "wallets",
      type: {
        vec: "pubkey"
      }
    }
  ]
};

// Add new instructions
idl.instructions.push(cancelVault);
idl.instructions.push(updateAdminTestWallets);

// Update Config type to add adminTestWallets
const configType = idl.types.find(t => t.name === "Config");
if (configType) {
  configType.type.fields.push({
    name: "adminTestWallets",
    type: {
      vec: "pubkey"
    }
  });
}

// Update Vault type to add cancelled and isTestVault
const vaultType = idl.types.find(t => t.name === "Vault");
if (vaultType) {
  // Add after released field (before bump)
  const releasedIndex = vaultType.type.fields.findIndex(f => f.name === "released");
  vaultType.type.fields.splice(releasedIndex + 1, 0,
    { name: "cancelled", type: "bool" },
    { name: "isTestVault", type: "bool" }
  );
}

// Add VaultCancelled event type
const vaultCancelledEvent = {
  name: "VaultCancelled",
  type: {
    kind: "struct",
    fields: [
      { name: "vault", type: "pubkey" },
      { name: "creator", type: "pubkey" },
      { name: "amountRefunded", type: "u64" }
    ]
  }
};

// Find where to insert (after last event before first non-event type)
const lastEventIndex = idl.types.findIndex(t =>
  !['ConfigUpdated', 'VaultCreated', 'VaultFunded', 'VaultReleased', 'VaultCheckedIn', 'VaultCancelled'].includes(t.name)
);
if (lastEventIndex > 0) {
  idl.types.splice(lastEventIndex, 0, vaultCancelledEvent);
}

// Update errors - add new error codes
if (!idl.errors) {
  idl.errors = [];
}

// Check if errors already exist before adding
const newErrors = [
  { code: 6015, name: "VaultAlreadyCancelled", msg: "Vault has already been cancelled." },
  { code: 6016, name: "CannotCancelAfterRelease", msg: "Cannot cancel vault after it has been released." },
  { code: 6017, name: "AdminTestWalletsLimitExceeded", msg: "Admin test wallets list cannot exceed 10 wallets." }
];

newErrors.forEach(err => {
  if (!idl.errors.find(e => e.name === err.name)) {
    idl.errors.push(err);
  }
});

// Write updated IDL
fs.writeFileSync(idlPath, JSON.stringify(idl, null, 2));
console.log('IDL updated successfully!');
console.log(`- Added ${idl.instructions.length} instructions total`);
console.log(`- Added ${idl.errors.length} errors total`);
