import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK");
const CIRCLE_DEVNET_USDC = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// Compute discriminator for update_config
async function getDiscriminator(name: string): Promise<Buffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`global:${name}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(new Uint8Array(hashBuffer).slice(0, 8));
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  console.log("Updating config USDC mint...");
  console.log("Config PDA:", configPda.toBase58());
  console.log("New USDC Mint:", CIRCLE_DEVNET_USDC.toBase58());
  console.log("Admin:", provider.wallet.publicKey.toBase58());

  // Build update_config instruction
  const discriminator = await getDiscriminator('update_config');

  // Encode: discriminator + Some(usdc_mint) + None(max_lock) + None(paused)
  // Option<PublicKey>: 1 byte (1 = Some) + 32 bytes (pubkey)
  // Option<u64>: 1 byte (0 = None)
  // Option<bool>: 1 byte (0 = None)
  const data = Buffer.concat([
    discriminator,
    Buffer.from([1]), // Some for usdc_mint
    Buffer.from(CIRCLE_DEVNET_USDC.toBytes()),
    Buffer.from([0]), // None for max_lock_per_vault
    Buffer.from([0]), // None for paused
  ]);

  const instruction = new anchor.web3.TransactionInstruction({
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: provider.wallet.publicKey, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });

  const tx = new Transaction().add(instruction);

  console.log("\nSending transaction...");
  const signature = await sendAndConfirmTransaction(
    provider.connection,
    tx,
    [provider.wallet.payer],
    { commitment: 'confirmed' }
  );

  console.log("✅ Config updated successfully!");
  console.log("Signature:", signature);
}

main().catch(console.error);
