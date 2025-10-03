const { PublicKey } = require('@solana/web3.js');

const PROGRAM_ID = '74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK';
const CREATOR = '9ssrJyXicq9m6FpVeeZuwLbwp3qXoNTgv8u4n31GZphQ';

// Error addresses from logs
const CLIENT_SENT = 'BGA4jMGYCMjbQN7oEo9Zyb5a3YTSFihXuTn52Hys3qtN';
const PROGRAM_EXPECTED = 'taNc232vrnmq5NEarKz1imNBuGTXoCZMw1ZMeSXasbX';

console.log('Searching for vault IDs that match error addresses...');
console.log('');

// Test range around counter value (9)
for (let vaultId = 0; vaultId <= 20; vaultId++) {
  const vaultIdBuffer = Buffer.alloc(4);
  vaultIdBuffer.writeUInt32LE(vaultId, 0);

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      new PublicKey(CREATOR).toBuffer(),
      vaultIdBuffer,
    ],
    new PublicKey(PROGRAM_ID)
  );

  if (vaultPda.toString() === CLIENT_SENT) {
    console.log(`✅ CLIENT SENT: vault_id = ${vaultId} → ${vaultPda.toString()}`);
  }

  if (vaultPda.toString() === PROGRAM_EXPECTED) {
    console.log(`✅ PROGRAM EXPECTED: vault_id = ${vaultId} → ${vaultPda.toString()}`);
  }
}

console.log('');
console.log('(Counter last_id is currently 9)');
