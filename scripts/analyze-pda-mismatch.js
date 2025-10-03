const { PublicKey } = require('@solana/web3.js');

const PROGRAM_ID = '74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK';
const CREATOR = '9ssrJyXicq9m6FpVeeZuwLbwp3qXoNTgv8u4n31GZphQ'; // User's test wallet

// Error addresses from logs
const CLIENT_SENT = 'BGA4jMGYCMjbQN7oEo9Zyb5a3YTSFihXuTn52Hys3qtN'; // "Left"
const PROGRAM_EXPECTED = 'taNc232vrnmq5NEarKz1imNBuGTXoCZMw1ZMeSXasbX'; // "Right"

console.log('Error Analysis:');
console.log('Client sent (Left):', CLIENT_SENT);
console.log('Program expected (Right):', PROGRAM_EXPECTED);
console.log('');

// Try deriving with different vault IDs
console.log('Testing different vault IDs:');
console.log('');

for (let vaultId = 0; vaultId <= 5; vaultId++) {
  // u32 little-endian encoding (4 bytes)
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

  const match = vaultPda.toString() === CLIENT_SENT ? ' ← CLIENT SENT THIS'
              : vaultPda.toString() === PROGRAM_EXPECTED ? ' ← PROGRAM EXPECTED THIS'
              : '';

  console.log(`vault_id = ${vaultId}: ${vaultPda.toString()}${match}`);
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('CONCLUSION:');
console.log('The client is deriving the vault PDA with vault_id = X');
console.log('The program expects vault_id = Y');
console.log('');
console.log('This tells us exactly what the off-by-one error is.');
