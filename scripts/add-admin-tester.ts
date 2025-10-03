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

// Wallet to add as admin tester (change this to your testing wallet)
const TESTER_WALLET = new PublicKey("9ssrJyXicq9m6FpVeeZuwLbwp3qXoNTgv8u4n31GZphQ");

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
  console.log("Adding tester wallet:", TESTER_WALLET.toBase58());

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Derive config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  console.log("Config PDA:", configPda.toBase58());

  // Build update_admin_test_wallets instruction
  // Instruction data: [discriminator(8)] + [vec_length(4)] + [wallet_1(32)] + ...
  const discriminator = getInstructionDiscriminator("update_admin_test_wallets");
  const wallets = [TESTER_WALLET];

  // Encode Vec<Pubkey>: length (u32 LE) + pubkeys
  const vecLength = Buffer.alloc(4);
  vecLength.writeUInt32LE(wallets.length, 0);

  const walletsData = Buffer.concat(wallets.map(w => w.toBuffer()));

  const data = Buffer.concat([discriminator, vecLength, walletsData]);

  console.log("\nInstruction discriminator:", Array.from(discriminator));
  console.log("Number of wallets:", wallets.length);

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: adminKeypair.publicKey, isSigner: true, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data,
  });

  const transaction = new Transaction().add(instruction);

  // Set transaction metadata
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = adminKeypair.publicKey;

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      adminKeypair,
    ]);

    console.log("\n✓ Admin test wallets updated! Signature:", signature);
    console.log("  View: https://solscan.io/tx/" + signature + "?cluster=devnet");

    console.log("\n✓ Wallet", TESTER_WALLET.toBase58(), "can now test as both creator and beneficiary!");
  } catch (err: any) {
    console.error("\n✗ Error updating admin test wallets:", err.message);
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
