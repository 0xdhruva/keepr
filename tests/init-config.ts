import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Initialize Config", () => {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programId = new PublicKey("74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK");
  
  // Load IDL
  const idlPath = path.join(__dirname, "../target/idl/keepr_vault.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  
  // Override the address in IDL with our deployed program
  idl.address = programId.toBase58();
  
  const program = new Program(idl, provider);

  const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const MAX_LOCK_PER_VAULT = new BN(500_000_000); // 500 USDC

  it("Initialize config", async () => {
    // Derive config PDA
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );

    console.log("Config PDA:", configPda.toBase58());
    console.log("Admin:", provider.wallet.publicKey.toBase58());

    try {
      const tx = await program.methods
        .initConfig(USDC_MINT, MAX_LOCK_PER_VAULT, false)
        .accounts({
          config: configPda,
          admin: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Config initialized!");
      console.log("Transaction signature:", tx);
      console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });
});
