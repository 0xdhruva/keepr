const { Connection, PublicKey } = require('@solana/web3.js');

const PROGRAM_ID = '74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK';
const CREATOR = '9ssrJyXicq9m6FpVeeZuwLbwp3qXoNTgv8u4n31GZphQ';
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function checkVault(vaultId, encoding) {
  const bytes = encoding === 'u64' ? 8 : 4;
  const buf = Buffer.alloc(bytes);

  if (encoding === 'u64') {
    buf.writeBigUInt64LE(BigInt(vaultId), 0);
  } else {
    buf.writeUInt32LE(vaultId, 0);
  }

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), new PublicKey(CREATOR).toBuffer(), buf],
    new PublicKey(PROGRAM_ID)
  );

  const accountInfo = await connection.getAccountInfo(vaultPda);

  return {
    vaultId,
    encoding,
    pda: vaultPda.toString(),
    exists: accountInfo !== null,
    size: accountInfo?.data.length || 0
  };
}

async function main() {
  console.log('Checking existing vaults on devnet...\n');
  console.log('Counter last_id = 9, so vaults 1-9 may exist\n');
  console.log('Testing if vaults were created with u64 or u32 encoding:\n');

  for (let vaultId = 1; vaultId <= 9; vaultId++) {
    const u64Result = await checkVault(vaultId, 'u64');
    const u32Result = await checkVault(vaultId, 'u32');

    if (u64Result.exists || u32Result.exists) {
      console.log(`vault_id ${vaultId}:`);
      if (u64Result.exists) {
        console.log(`  ✅ Found with u64: ${u64Result.pda} (${u64Result.size} bytes)`);
      }
      if (u32Result.exists) {
        console.log(`  ✅ Found with u32: ${u32Result.pda} (${u32Result.size} bytes)`);
      }
      console.log('');
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nConclusion:');
  console.log('If vaults exist with u64 encoding, the program bug is CONFIRMED.');
  console.log('If vaults exist with u32 encoding, my analysis may be wrong.');
}

main().catch(console.error);
