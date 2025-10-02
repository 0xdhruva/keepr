const base64Data = "0wjoKwKYdXeD5ghHLG53bd7ofNXUivAihicVKEcCjZGcUZoHvHV/s4PmCEcsbndt3uh81dSK8CKGJxUoRwKNkZxRmge8dX+zO0Qss5EhV/E6kz0BNCgtAytf/s0Botvxt3kGCN8ALqec2MbgfzS2JUC8TW66vpe9lLvaqcLdkTwXS35Hylc2aUBCDwAAAAAAdOrdaAAAAAAA/yAAAAAskbZVhvzCFDsbkddQTTBHu62cQE0BvlgxJPqHBwAAAAAAAAA=";

const buffer = Buffer.from(base64Data, 'base64');
const { PublicKey } = require('@solana/web3.js');

console.log('Total buffer length:', buffer.length);

// Skip 8-byte discriminator
let offset = 8;

// Read fields according to Vault struct:
// pub creator: Pubkey,              // 32 bytes
// pub beneficiary: Pubkey,          // 32 bytes
// pub usdc_mint: Pubkey,            // 32 bytes
// pub vault_token_account: Pubkey,  // 32 bytes
// pub amount_locked: u64,           // 8 bytes
// pub unlock_unix: i64,             // 8 bytes
// pub released: bool,               // 1 byte
// pub bump: u8,                     // 1 byte
// pub name_hash: Vec<u8>,           // 4 bytes length + data
// pub vault_id: u64,                // 8 bytes

const creator = buffer.slice(offset, offset + 32);
offset += 32;

const beneficiary = buffer.slice(offset, offset + 32);
offset += 32;

const usdcMint = buffer.slice(offset, offset + 32);
offset += 32;

const vaultTokenAccount = buffer.slice(offset, offset + 32);
offset += 32;

const amountLocked = buffer.readBigUInt64LE(offset);
offset += 8;

const unlockUnix = buffer.readBigInt64LE(offset);
offset += 8;

const released = buffer.readUInt8(offset) !== 0;
offset += 1;

const bump = buffer.readUInt8(offset);
offset += 1;

// Vec<u8> has 4-byte length prefix
const nameHashLen = buffer.readUInt32LE(offset);
console.log('Current offset before name_hash:', offset);
console.log('Name hash length:', nameHashLen);
offset += 4;

const nameHash = buffer.slice(offset, offset + nameHashLen);
offset += nameHashLen;

console.log('Current offset before vault_id:', offset);
console.log('Bytes remaining:', buffer.length - offset);

const vaultId = offset + 8 <= buffer.length ? buffer.readBigUInt64LE(offset) : 0n;

console.log('\n=== Vault Data ===');
console.log('Creator:', new PublicKey(creator).toBase58());
console.log('Beneficiary:', new PublicKey(beneficiary).toBase58());
console.log('USDC Mint:', new PublicKey(usdcMint).toBase58());
console.log('Vault Token Account:', new PublicKey(vaultTokenAccount).toBase58());
console.log('Amount Locked:', Number(amountLocked) / 1_000_000, 'USDC');
console.log('Unlock Unix:', Number(unlockUnix));
console.log('Unlock Date:', new Date(Number(unlockUnix) * 1000).toLocaleString());
console.log('Released:', released);
console.log('Bump:', bump);
console.log('Name Hash Length:', nameHashLen);
console.log('Name Hash:', nameHash.toString('hex'));
console.log('Vault ID (if present):', Number(vaultId));

// Check if unlocked
const now = Math.floor(Date.now() / 1000);
const timeRemaining = Number(unlockUnix) - now;

console.log('\n=== Status ===');
if (timeRemaining > 0) {
  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;
  console.log('Status: LOCKED');
  console.log('Time until unlock:', hours + 'h', minutes + 'm', seconds + 's');
} else {
  console.log('Status: UNLOCKED! ✅');
  console.log('Ready to release!');
}
