import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Update Config", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programId = new PublicKey("74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK");
  
  const idlPath = path.join(__dirname, "../target/idl/keepr_vault.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  idl.address = programId.toBase58();
  
  const program = new Program(idl, provider);

  const NEW_USDC_MINT = new PublicKey("BTYDiUpZuxzswKhbg8C8sJcYNjua4D7186rU2fzxUjjt");

  it("Update config with new USDC mint", async () => {
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );

    console.log("Config PDA:", configPda.toBase58());
    console.log("Admin:", provider.wallet.publicKey.toBase58());
    console.log("New USDC Mint:", NEW_USDC_MINT.toBase58());

    try {
      const tx = await program.methods
        .updateConfig(NEW_USDC_MINT, null, null)
        .accounts({
          config: configPda,
          admin: provider.wallet.publicKey,
        })
        .rpc();

      console.log("✅ Config updated!");
      console.log("Transaction signature:", tx);
      console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });
});
