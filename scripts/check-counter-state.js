const { Connection, PublicKey } = require('@solana/web3.js');

const PROGRAM_ID = '74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK';
const CREATOR = '9ssrJyXicq9m6FpVeeZuwLbwp3qXoNTgv8u4n31GZphQ';
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function main() {
  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault_counter'), new PublicKey(CREATOR).toBuffer()],
    new PublicKey(PROGRAM_ID)
  );

  console.log('Counter PDA:', counterPda.toString());
  console.log('');

  const accountInfo = await connection.getAccountInfo(counterPda);

  if (!accountInfo) {
    console.log('❌ Counter does not exist yet');
    console.log('last_id will be 0 when first vault is created');
    console.log('');
    console.log('So for FIRST vault:');
    console.log('- counter.last_id = 0');
    console.log('- Program uses seeds with: counter.last_id + 1 = 1');
    console.log('- Client should derive with: counter.last_id + 1 = 1');
    return;
  }

  console.log('✅ Counter exists');
  console.log('');

  // Parse counter data
  // Structure: 8-byte discriminator + u64 last_id
  const data = accountInfo.data;
  const lastId = Number(data.readBigUInt64LE(8));

  console.log('current last_id:', lastId);
  console.log('');
  console.log('So for NEXT vault:');
  console.log(`- counter.last_id = ${lastId}`);
  console.log(`- Program uses seeds with: counter.last_id + 1 = ${lastId + 1}`);
  console.log(`- Client should derive with: counter.last_id + 1 = ${lastId + 1}`);
  console.log('');

  // Derive what the next vault PDA should be
  const vaultIdBuffer = Buffer.alloc(4);
  vaultIdBuffer.writeUInt32LE(lastId + 1, 0);

  const [nextVaultPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault'),
      new PublicKey(CREATOR).toBuffer(),
      vaultIdBuffer,
    ],
    new PublicKey(PROGRAM_ID)
  );

  console.log('Next vault PDA should be:', nextVaultPda.toString());
}

main().catch(console.error);
