import { AnchorProvider, Program, web3 } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// Load IDL
const idlPath = path.join(__dirname, "../target/idl/keepr_vault.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

// Program ID
const PROGRAM_ID = new PublicKey("74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK");

// Devnet USDC mint
const USDC_MINT_DEVNET = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

async function main() {
  // Load admin wallet
  const adminKeypairPath = path.join(process.env.HOME!, ".config/solana/id.json");
  const adminKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(adminKeypairPath, "utf-8")))
  );

  console.log("Admin wallet:", adminKeypair.publicKey.toBase58());

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const wallet = {
    publicKey: adminKeypair.publicKey,
    signTransaction: async (tx: any) => {
      tx.partialSign(adminKeypair);
      return tx;
    },
    signAllTransactions: async (txs: any[]) => {
      return txs.map((tx) => {
        tx.partialSign(adminKeypair);
        return tx;
      });
    },
  };

  const provider = new AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
  });

  const program = new Program(idl, provider);

  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  console.log("\nConfig PDA:", configPda.toBase58());

  // Check if config exists
  const configAccount = await connection.getAccountInfo(configPda);

  if (configAccount) {
    console.log("\n✓ Config account exists (", configAccount.data.length, "bytes)");
    console.log("\nStep 1: Closing old config account...");

    try {
      const closeTx = await program.methods
        .closeConfig()
        .accounts({
          config: configPda,
          admin: adminKeypair.publicKey,
        })
        .signers([adminKeypair])
        .rpc();

      console.log("✓ Config closed! Signature:", closeTx);
      console.log("  View: https://solscan.io/tx/" + closeTx + "?cluster=devnet");

      // Wait for confirmation
      await connection.confirmTransaction(closeTx, "confirmed");
      console.log("✓ Transaction confirmed");
    } catch (err: any) {
      console.error("✗ Error closing config:", err.message);
      if (err.logs) {
        console.error("Program logs:", err.logs);
      }
      process.exit(1);
    }
  } else {
    console.log("\n✓ Config account does not exist (ready to initialize)");
  }

  console.log("\nStep 2: Initializing new config...");

  // Initialize new config with correct schema
  const maxLockPerVault = 500_000_000; // 500 USDC (6 decimals)
  const paused = false;

  try {
    const initTx = await program.methods
      .initConfig(USDC_MINT_DEVNET, maxLockPerVault, paused)
      .accounts({
        config: configPda,
        admin: adminKeypair.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([adminKeypair])
      .rpc();

    console.log("✓ Config initialized! Signature:", initTx);
    console.log("  View: https://solscan.io/tx/" + initTx + "?cluster=devnet");

    // Wait for confirmation
    await connection.confirmTransaction(initTx, "confirmed");
    console.log("✓ Transaction confirmed");

    // Fetch and verify
    const newConfig = await connection.getAccountInfo(configPda);
    console.log("\n✓ New config account size:", newConfig?.data.length, "bytes");
    console.log("  Expected: 409 bytes (8 + 32 + 32 + 8 + 1 + 4 + 320)");
  } catch (err: any) {
    console.error("✗ Error initializing config:", err.message);
    if (err.logs) {
      console.error("Program logs:", err.logs);
    }
    process.exit(1);
  }

  console.log("\n✓ Config reset complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
