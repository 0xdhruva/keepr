import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { BN } from "bn.js";

// Program ID
const PROGRAM_ID = new PublicKey("74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK");

// Devnet USDC mint (different from mainnet!)
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

// Calculate instruction discriminator
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
  const [configPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  console.log("Config PDA:", configPda.toBase58());
  console.log("Bump:", bump);

  // Check if config exists
  const configAccount = await connection.getAccountInfo(configPda);

  if (configAccount) {
    console.log("✗ Config account already exists (", configAccount.data.length, "bytes)");
    console.log("  Please close it first");
    process.exit(1);
  }

  console.log("✓ Config account does not exist (ready to initialize)");
  console.log("\nInitializing config...");

  // Build init_config instruction
  // Instruction data: [discriminator(8)] + [usdc_mint(32)] + [max_lock_per_vault(8)] + [paused(1)]
  const discriminator = getInstructionDiscriminator("init_config");
  const maxLockPerVault = new BN(500_000_000); // 500 USDC (6 decimals)
  const paused = false;

  const data = Buffer.concat([
    discriminator,
    USDC_MINT.toBuffer(),
    maxLockPerVault.toArrayLike(Buffer, "le", 8),
    Buffer.from([paused ? 1 : 0]),
  ]);

  console.log("Instruction discriminator:", Array.from(discriminator));
  console.log("USDC Mint:", USDC_MINT.toBase58());
  console.log("Max lock per vault:", maxLockPerVault.toString(), "(500 USDC)");
  console.log("Paused:", paused);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });

  const transaction = new Transaction().add(instruction);

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      adminKeypair,
    ]);

    console.log("\n✓ Config initialized! Signature:", signature);
    console.log("  View: https://solscan.io/tx/" + signature + "?cluster=devnet");

    // Verify
    const verifyAccount = await connection.getAccountInfo(configPda);
    if (verifyAccount) {
      console.log("\n✓ Config account created with", verifyAccount.data.length, "bytes");
      console.log("  Expected: 409 bytes (8 + 32 + 32 + 8 + 1 + 4 + 320)");
    }
  } catch (err: any) {
    console.error("\n✗ Error initializing config:", err.message);
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
