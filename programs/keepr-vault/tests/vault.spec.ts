import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("keepr-vault", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programId = new PublicKey("74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK");
  
  // Load IDL
  const idlPath = path.join(__dirname, "../target/idl/keepr_vault.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  idl.address = programId.toBase58();
  
  const program = new Program(idl, provider);

  // Test accounts
  let admin: Keypair;
  let creator: Keypair;
  let beneficiary: Keypair;
  let usdcMint: PublicKey;
  let configPda: PublicKey;
  let counterPda: PublicKey;
  let vaultPda: PublicKey;
  let vaultTokenAccount: PublicKey;
  let creatorUsdcAta: PublicKey;
  let beneficiaryUsdcAta: PublicKey;

  const MAX_LOCK_PER_VAULT = new anchor.BN(500_000_000); // 500 USDC
  const MIN_UNLOCK_BUFFER = 300; // 5 minutes

  before(async () => {
    // Create test keypairs
    admin = Keypair.generate();
    creator = Keypair.generate();
    beneficiary = Keypair.generate();

    // Airdrop SOL to test accounts
    const airdropAmount = 10 * anchor.web3.LAMPORTS_PER_SOL;
    await provider.connection.requestAirdrop(admin.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(creator.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(beneficiary.publicKey, airdropAmount);
    
    // Wait for airdrops to confirm
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create USDC mint (6 decimals)
    usdcMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6
    );

    console.log("Test setup complete:");
    console.log("  Admin:", admin.publicKey.toBase58());
    console.log("  Creator:", creator.publicKey.toBase58());
    console.log("  Beneficiary:", beneficiary.publicKey.toBase58());
    console.log("  USDC Mint:", usdcMint.toBase58());

    // Derive Config PDA
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );
  });

  describe("init_config", () => {
    it("initializes config successfully", async () => {
      const tx = await program.methods
        .initConfig(usdcMint, MAX_LOCK_PER_VAULT, false)
        .accounts({
          config: configPda,
          admin: admin.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      console.log("  ✓ Config initialized:", tx);

      // Verify config state
      const config = await (program.account as any).config.fetch(configPda);
      assert.equal(config.admin.toBase58(), admin.publicKey.toBase58());
      assert.equal(config.usdcMint.toBase58(), usdcMint.toBase58());
      assert.equal(config.maxLockPerVault.toString(), MAX_LOCK_PER_VAULT.toString());
      assert.equal(config.paused, false);
    });

    it("fails to initialize config twice", async () => {
      try {
        await program.methods
          .initConfig(usdcMint, MAX_LOCK_PER_VAULT, false)
          .accounts({
            config: configPda,
            admin: admin.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin])
          .rpc();
        assert.fail("Should have failed");
      } catch (err) {
        assert.include(err.message, "already in use");
      }
    });
  });

  describe("update_config", () => {
    it("updates config parameters", async () => {
      const newCap = new anchor.BN(1_000_000_000); // 1000 USDC

      const tx = await program.methods
        .updateConfig(null, newCap, null)
        .accounts({
          config: configPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      console.log("  ✓ Config updated:", tx);

      const config = await (program.account as any).config.fetch(configPda);
      assert.equal(config.maxLockPerVault.toString(), newCap.toString());
    });

    it("fails when non-admin tries to update", async () => {
      try {
        await program.methods
          .updateConfig(null, MAX_LOCK_PER_VAULT, null)
          .accounts({
            config: configPda,
            admin: creator.publicKey,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed");
      } catch (err) {
        assert.include(err.message, "has_one");
      }
    });

    it("pauses and unpauses vault creation", async () => {
      // Pause
      await program.methods
        .updateConfig(null, null, true)
        .accounts({
          config: configPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      let config = await (program.account as any).config.fetch(configPda);
      assert.equal(config.paused, true);

      // Unpause
      await program.methods
        .updateConfig(null, null, false)
        .accounts({
          config: configPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      config = await (program.account as any).config.fetch(configPda);
      assert.equal(config.paused, false);
    });
  });

  describe("create_vault", () => {
    const nameHash = Buffer.alloc(32, 1); // Mock name hash
    let unlockUnix: anchor.BN;

    before(async () => {
      // Set unlock time to 10 minutes from now
      const now = Math.floor(Date.now() / 1000);
      unlockUnix = new anchor.BN(now + 600);

      // Derive PDAs
      [counterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault_counter"), creator.publicKey.toBuffer()],
        programId
      );

      [vaultPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("vault"),
          creator.publicKey.toBuffer(),
          Buffer.from(new Uint8Array(new BigUint64Array([BigInt(1)]).buffer).slice(0, 8)),
        ],
        programId
      );

      // Derive vault token account (ATA)
      [vaultTokenAccount] = PublicKey.findProgramAddressSync(
        [
          vaultPda.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          usdcMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
    });

    it("creates vault successfully", async () => {
      const tx = await program.methods
        .createVault(beneficiary.publicKey, unlockUnix, Array.from(nameHash))
        .accounts({
          config: configPda,
          counter: counterPda,
          vault: vaultPda,
          vaultTokenAccount,
          usdcMint,
          creator: creator.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      console.log("  ✓ Vault created:", tx);

      // Verify vault state
      const vault = await (program.account as any).vault.fetch(vaultPda);
      assert.equal(vault.creator.toBase58(), creator.publicKey.toBase58());
      assert.equal(vault.beneficiary.toBase58(), beneficiary.publicKey.toBase58());
      assert.equal(vault.usdcMint.toBase58(), usdcMint.toBase58());
      assert.equal(vault.amountLocked.toString(), "0");
      assert.equal(vault.unlockUnix.toString(), unlockUnix.toString());
      assert.equal(vault.released, false);
      assert.equal(vault.vaultId.toString(), "1");

      // Verify counter
      const counter = await (program.account as any).vaultCounter.fetch(counterPda);
      assert.equal(counter.lastId.toString(), "1");

      // Verify token account exists
      const tokenAccount = await getAccount(provider.connection, vaultTokenAccount);
      assert.equal(tokenAccount.mint.toBase58(), usdcMint.toBase58());
      assert.equal(tokenAccount.owner.toBase58(), vaultPda.toBase58());
    });

    it("fails with unlock time in the past", async () => {
      const pastUnlock = new anchor.BN(Math.floor(Date.now() / 1000) - 100);
      const [badVaultPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("vault"),
          creator.publicKey.toBuffer(),
          Buffer.from(new Uint8Array(new BigUint64Array([BigInt(2)]).buffer).slice(0, 8)),
        ],
        programId
      );
      const [badVaultTokenAccount] = PublicKey.findProgramAddressSync(
        [
          badVaultPda.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          usdcMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      try {
        await program.methods
          .createVault(beneficiary.publicKey, pastUnlock, Array.from(nameHash))
          .accounts({
            config: configPda,
            counter: counterPda,
            vault: badVaultPda,
            vaultTokenAccount: badVaultTokenAccount,
            usdcMint,
            creator: creator.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed");
      } catch (err) {
        assert.include(err.message, "InvalidUnlockTime");
      }
    });

    it("fails when paused", async () => {
      // Pause vault creation
      await program.methods
        .updateConfig(null, null, true)
        .accounts({
          config: configPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();

      const [pausedVaultPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("vault"),
          creator.publicKey.toBuffer(),
          Buffer.from(new Uint8Array(new BigUint64Array([BigInt(2)]).buffer).slice(0, 8)),
        ],
        programId
      );
      const [pausedVaultTokenAccount] = PublicKey.findProgramAddressSync(
        [
          pausedVaultPda.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          usdcMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      try {
        await program.methods
          .createVault(beneficiary.publicKey, unlockUnix, Array.from(nameHash))
          .accounts({
            config: configPda,
            counter: counterPda,
            vault: pausedVaultPda,
            vaultTokenAccount: pausedVaultTokenAccount,
            usdcMint,
            creator: creator.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed");
      } catch (err) {
        assert.include(err.message, "Paused");
      }

      // Unpause for next tests
      await program.methods
        .updateConfig(null, null, false)
        .accounts({
          config: configPda,
          admin: admin.publicKey,
        })
        .signers([admin])
        .rpc();
    });

    it("enforces USDC mint", async () => {
      // Create wrong mint
      const wrongMint = await createMint(
        provider.connection,
        admin,
        admin.publicKey,
        null,
        6
      );

      const [wrongVaultPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("vault"),
          creator.publicKey.toBuffer(),
          Buffer.from(new Uint8Array(new BigUint64Array([BigInt(2)]).buffer).slice(0, 8)),
        ],
        programId
      );
      const [wrongVaultTokenAccount] = PublicKey.findProgramAddressSync(
        [
          wrongVaultPda.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          wrongMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      try {
        await program.methods
          .createVault(beneficiary.publicKey, unlockUnix, Array.from(nameHash))
          .accounts({
            config: configPda,
            counter: counterPda,
            vault: wrongVaultPda,
            vaultTokenAccount: wrongVaultTokenAccount,
            usdcMint: wrongMint,
            creator: creator.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed");
      } catch (err) {
        assert.include(err.message, "address");
      }
    });
  });

  describe("deposit_usdc", () => {
    const depositAmount = new anchor.BN(100_000_000); // 100 USDC

    before(async () => {
      // Create creator's USDC token account and mint tokens
      creatorUsdcAta = await createAccount(
        provider.connection,
        creator,
        usdcMint,
        creator.publicKey
      );

      await mintTo(
        provider.connection,
        admin,
        usdcMint,
        creatorUsdcAta,
        admin,
        200_000_000 // 200 USDC
      );
    });

    it("deposits USDC successfully", async () => {
      const tx = await program.methods
        .depositUsdc(depositAmount)
        .accounts({
          config: configPda,
          vault: vaultPda,
          counter: counterPda,
          vaultTokenAccount,
          usdcMint,
          creatorUsdcAta,
          creator: creator.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      console.log("  ✓ USDC deposited:", tx);

      // Verify vault balance updated
      const vault = await (program.account as any).vault.fetch(vaultPda);
      assert.equal(vault.amountLocked.toString(), depositAmount.toString());

      // Verify token account balance
      const tokenAccount = await getAccount(provider.connection, vaultTokenAccount);
      assert.equal(tokenAccount.amount.toString(), depositAmount.toString());

      // Verify creator balance decreased
      const creatorAccount = await getAccount(provider.connection, creatorUsdcAta);
      assert.equal(creatorAccount.amount.toString(), "100000000"); // 100 USDC remaining
    });

    it("fails with zero amount", async () => {
      try {
        await program.methods
          .depositUsdc(new anchor.BN(0))
          .accounts({
            config: configPda,
            vault: vaultPda,
            counter: counterPda,
            vaultTokenAccount,
            usdcMint,
            creatorUsdcAta,
            creator: creator.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed");
      } catch (err) {
        assert.include(err.message, "InvalidAmount");
      }
    });

    it("fails when exceeding vault cap", async () => {
      const excessAmount = new anchor.BN(500_000_000); // Would total 600 USDC

      try {
        await program.methods
          .depositUsdc(excessAmount)
          .accounts({
            config: configPda,
            vault: vaultPda,
            counter: counterPda,
            vaultTokenAccount,
            usdcMint,
            creatorUsdcAta,
            creator: creator.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed");
      } catch (err) {
        assert.include(err.message, "AboveVaultCap");
      }
    });
  });

  describe("release", () => {
    let releasableVaultPda: PublicKey;
    let releasableVaultTokenAccount: PublicKey;
    let releasableUnlockUnix: anchor.BN;

    before(async () => {
      // Create a vault with unlock time in the past (for immediate release)
      const now = Math.floor(Date.now() / 1000);
      releasableUnlockUnix = new anchor.BN(now - 100); // Already unlocked

      [releasableVaultPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("vault"),
          creator.publicKey.toBuffer(),
          Buffer.from(new Uint8Array(new BigUint64Array([BigInt(2)]).buffer).slice(0, 8)),
        ],
        programId
      );

      [releasableVaultTokenAccount] = PublicKey.findProgramAddressSync(
        [
          releasableVaultPda.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          usdcMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Create vault
      await program.methods
        .createVault(beneficiary.publicKey, releasableUnlockUnix, Array.from(Buffer.alloc(32, 2)))
        .accounts({
          config: configPda,
          counter: counterPda,
          vault: releasableVaultPda,
          vaultTokenAccount: releasableVaultTokenAccount,
          usdcMint,
          creator: creator.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Deposit funds
      await program.methods
        .depositUsdc(new anchor.BN(50_000_000))
        .accounts({
          config: configPda,
          vault: releasableVaultPda,
          counter: counterPda,
          vaultTokenAccount: releasableVaultTokenAccount,
          usdcMint,
          creatorUsdcAta,
          creator: creator.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      // Derive beneficiary ATA
      [beneficiaryUsdcAta] = PublicKey.findProgramAddressSync(
        [
          beneficiary.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          usdcMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
    });

    it("fails before unlock time", async () => {
      // Try to release the first vault (still locked)
      const [beneficiaryAta] = PublicKey.findProgramAddressSync(
        [
          beneficiary.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          usdcMint.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      try {
        await program.methods
          .release()
          .accounts({
            vault: vaultPda,
            counter: counterPda,
            vaultTokenAccount,
            usdcMint,
            beneficiaryUsdcAta: beneficiaryAta,
            beneficiary: beneficiary.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([beneficiary])
          .rpc();
        assert.fail("Should have failed");
      } catch (err) {
        assert.include(err.message, "InvalidUnlockTime");
      }
    });

    it("releases funds successfully after unlock", async () => {
      const tx = await program.methods
        .release()
        .accounts({
          vault: releasableVaultPda,
          counter: counterPda,
          vaultTokenAccount: releasableVaultTokenAccount,
          usdcMint,
          beneficiaryUsdcAta,
          beneficiary: beneficiary.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([beneficiary])
        .rpc();

      console.log("  ✓ Funds released:", tx);

      // Verify vault marked as released
      const vault = await (program.account as any).vault.fetch(releasableVaultPda);
      assert.equal(vault.released, true);

      // Verify beneficiary received funds
      const beneficiaryAccount = await getAccount(provider.connection, beneficiaryUsdcAta);
      assert.equal(beneficiaryAccount.amount.toString(), "50000000");

      // Verify vault token account is empty
      const vaultAccount = await getAccount(provider.connection, releasableVaultTokenAccount);
      assert.equal(vaultAccount.amount.toString(), "0");
    });

    it("fails to release twice", async () => {
      try {
        await program.methods
          .release()
          .accounts({
            vault: releasableVaultPda,
            counter: counterPda,
            vaultTokenAccount: releasableVaultTokenAccount,
            usdcMint,
            beneficiaryUsdcAta,
            beneficiary: beneficiary.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([beneficiary])
          .rpc();
        assert.fail("Should have failed");
      } catch (err) {
        assert.include(err.message, "AlreadyReleased");
      }
    });
  });

  describe("close_vault", () => {
    it("closes vault and reclaims rent", async () => {
      // Get creator's SOL balance before
      const balanceBefore = await provider.connection.getBalance(creator.publicKey);

      const tx = await program.methods
        .closeVault()
        .accounts({
          vault: releasableVaultPda,
          vaultTokenAccount: releasableVaultTokenAccount,
          creator: creator.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      console.log("  ✓ Vault closed:", tx);

      // Verify vault account is closed
      try {
        await (program.account as any).vault.fetch(releasableVaultPda);
        assert.fail("Vault should be closed");
      } catch (err) {
        assert.include(err.message, "Account does not exist");
      }

      // Verify token account is closed
      try {
        await getAccount(provider.connection, releasableVaultTokenAccount);
        assert.fail("Token account should be closed");
      } catch (err) {
        assert.include(err.message, "could not find account");
      }

      // Verify creator received rent (balance should increase)
      const balanceAfter = await provider.connection.getBalance(creator.publicKey);
      assert.isTrue(balanceAfter > balanceBefore - 10000); // Account for tx fee
    });

    it("fails to close unreleased vault", async () => {
      try {
        await program.methods
          .closeVault()
          .accounts({
            vault: vaultPda,
            vaultTokenAccount,
            creator: creator.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed");
      } catch (err) {
        assert.include(err.message, "NotReleased");
      }
    });

    it("fails when non-creator tries to close", async () => {
      // Create and release another vault first
      const [vault3Pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("vault"),
          creator.publicKey.toBuffer(),
          Buffer.from(new Uint8Array(new BigUint64Array([BigInt(3)]).buffer).slice(0, 8)),
        ],
        programId
      );

      try {
        await program.methods
          .closeVault()
          .accounts({
            vault: vault3Pda,
            vaultTokenAccount,
            creator: beneficiary.publicKey, // Wrong signer
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([beneficiary])
          .rpc();
        assert.fail("Should have failed");
      } catch (err) {
        assert.include(err.message, "has_one");
      }
    });
  });
});
