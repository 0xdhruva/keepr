import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// Program ID
const PROGRAM_ID = new PublicKey("74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK");

// Calculate instruction discriminator for close_config
// Anchor uses: sha256("global:close_config").slice(0, 8)
function getInstructionDiscriminator(name: string): Buffer {
  const hash = crypto.createHash("sha256");
  hash.update(`global:${name}`);
  return hash.digest().slice(0, 8);
}

async function main() {
  // Load admin wallet
  const adminKeypairPath = path.join(process.env.HOME!, ".config/solana/id.json");
  const adminKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(adminKeypairPath, "utf-8")))
  );

  console.log("Admin wallet:", adminKeypair.publicKey.toBase58());

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  console.log("Config PDA:", configPda.toBase58());

  // Check if config exists
  const configAccount = await connection.getAccountInfo(configPda);

  if (!configAccount) {
    console.log("✓ Config account does not exist");
    return;
  }

  console.log("✓ Config account exists (", configAccount.data.length, "bytes)");
  console.log("\nClosing config account...");

  // Build close_config instruction
  const discriminator = getInstructionDiscriminator("close_config");
  console.log("Instruction discriminator:", Array.from(discriminator));

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
    ],
    programId: PROGRAM_ID,
    data: discriminator,
  });

  const transaction = new Transaction().add(instruction);

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      adminKeypair,
    ]);

    console.log("✓ Config closed! Signature:", signature);
    console.log("  View: https://solscan.io/tx/" + signature + "?cluster=devnet");

    // Verify it's closed
    const verifyAccount = await connection.getAccountInfo(configPda);
    if (!verifyAccount) {
      console.log("✓ Config account successfully closed");
    } else {
      console.log("⚠ Config account still exists with", verifyAccount.data.length, "bytes");
    }
  } catch (err: any) {
    console.error("✗ Error closing config:", err.message);
    if (err.logs) {
      console.error("Program logs:");
      err.logs.forEach((log: string) => console.error("  ", log));
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
