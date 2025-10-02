# Admin Playbook — Keepr Vault

**Version:** 1.0  
**Date:** 2025-10-01  
**Network:** Mainnet (adapt for devnet)

---

## Overview

This playbook covers admin-only operations for the Keepr Vault program:
- Initial configuration setup
- Parameter updates (caps, mint, pause)
- Emergency pause/unpause
- Monitoring and safety

**Admin Authority:** Multisig wallet (recommended) or single keypair

---

## Prerequisites

### Required Tools
```bash
# Solana CLI
solana --version  # v1.18+

# Anchor CLI
anchor --version  # v0.30+

# Node.js
node --version  # v18+
```

### Environment Setup
```bash
# Set network
solana config set --url mainnet-beta

# Set admin keypair
solana config set --keypair /path/to/admin-keypair.json

# Verify
solana address
solana balance
```

### Program Information
```bash
PROGRAM_ID="<deployed-program-id>"
CONFIG_PDA="<derived-config-pda>"  # Seeds: ["config"]
```

---

## Initial Configuration

### 1. Derive Config PDA

**Using Anchor:**
```typescript
import { PublicKey } from "@solana/web3.js";

const programId = new PublicKey("<PROGRAM_ID>");
const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  programId
);

console.log("Config PDA:", configPda.toBase58());
```

**Using Solana CLI:**
```bash
# Use anchor idl or custom script to derive PDA
```

### 2. Initialize Config

**Command:**
```bash
anchor run init-config
```

**Or via TypeScript:**
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

const provider = anchor.AnchorProvider.env();
const program = new Program(idl, provider);

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const MAX_LOCK_PER_VAULT = new anchor.BN(500_000_000); // 500 USDC
const PAUSED = false;

const tx = await program.methods
  .initConfig(USDC_MINT, MAX_LOCK_PER_VAULT, PAUSED)
  .accounts({
    config: configPda,
    admin: provider.wallet.publicKey,
    systemProgram: anchor.web3.SystemProgram.programId,
  })
  .rpc();

console.log("Config initialized:", tx);
```

**Parameters:**
- `usdc_mint`: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (mainnet USDC)
- `max_lock_per_vault`: `500_000_000` (500 USDC with 6 decimals)
- `paused`: `false` (allow vault creation)

**Verification:**
```bash
# Check config account
solana account <CONFIG_PDA>

# Or fetch via Anchor
anchor idl fetch <PROGRAM_ID> --provider.cluster mainnet
```

---

## Update Configuration

### Update Vault Cap

**Scenario:** Increase per-vault limit to 1000 USDC

```typescript
const newCap = new anchor.BN(1_000_000_000); // 1000 USDC

const tx = await program.methods
  .updateConfig(null, newCap, null)
  .accounts({
    config: configPda,
    admin: provider.wallet.publicKey,
  })
  .rpc();

console.log("Cap updated:", tx);
```

**Parameters:**
- `usdc_mint`: `null` (no change)
- `max_lock_per_vault`: `1_000_000_000` (new cap)
- `paused`: `null` (no change)

### Change USDC Mint

**Scenario:** Update to different token (not recommended for mainnet)

```typescript
const newMint = new PublicKey("<NEW_MINT>");

const tx = await program.methods
  .updateConfig(newMint, null, null)
  .accounts({
    config: configPda,
    admin: provider.wallet.publicKey,
  })
  .rpc();

console.log("Mint updated:", tx);
```

**⚠️ Warning:** Changing mint affects all new vaults. Existing vaults unaffected.

### Pause Vault Creation

**Scenario:** Emergency pause (e.g., security issue discovered)

```typescript
const tx = await program.methods
  .updateConfig(null, null, true)
  .accounts({
    config: configPda,
    admin: provider.wallet.publicKey,
  })
  .rpc();

console.log("Vault creation PAUSED:", tx);
```

**Effect:**
- New `create_vault` calls will fail with `Paused` error
- Existing vaults unaffected (deposits, releases still work)
- Unpause to resume vault creation

### Unpause Vault Creation

```typescript
const tx = await program.methods
  .updateConfig(null, null, false)
  .accounts({
    config: configPda,
    admin: provider.wallet.publicKey,
  })
  .rpc();

console.log("Vault creation UNPAUSED:", tx);
```

---

## Emergency Procedures

### Scenario 1: Security Issue Discovered

**Actions:**
1. **Pause immediately:**
   ```typescript
   await program.methods.updateConfig(null, null, true).rpc();
   ```

2. **Announce to users** (Twitter, Discord, etc.)

3. **Investigate issue** (review logs, transactions)

4. **Deploy fix** (if program upgrade needed)

5. **Unpause after verification:**
   ```typescript
   await program.methods.updateConfig(null, null, false).rpc();
   ```

### Scenario 2: Excessive Vault Creation

**Actions:**
1. **Lower cap temporarily:**
   ```typescript
   const lowerCap = new anchor.BN(100_000_000); // 100 USDC
   await program.methods.updateConfig(null, lowerCap, null).rpc();
   ```

2. **Monitor creation rate**

3. **Restore cap when safe:**
   ```typescript
   const normalCap = new anchor.BN(500_000_000);
   await program.methods.updateConfig(null, normalCap, null).rpc();
   ```

### Scenario 3: Wrong Mint Configured

**Actions:**
1. **Pause immediately:**
   ```typescript
   await program.methods.updateConfig(null, null, true).rpc();
   ```

2. **Update to correct mint:**
   ```typescript
   const correctMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
   await program.methods.updateConfig(correctMint, null, null).rpc();
   ```

3. **Unpause:**
   ```typescript
   await program.methods.updateConfig(null, null, false).rpc();
   ```

---

## Monitoring

### Check Config State

```typescript
const config = await program.account.config.fetch(configPda);

console.log("Admin:", config.admin.toBase58());
console.log("USDC Mint:", config.usdcMint.toBase58());
console.log("Max Lock Per Vault:", config.maxLockPerVault.toString());
console.log("Paused:", config.paused);
```

### Monitor Events

```typescript
// Listen for ConfigUpdated events
program.addEventListener("ConfigUpdated", (event) => {
  console.log("Config updated by:", event.admin.toBase58());
});

// Listen for VaultCreated events
program.addEventListener("VaultCreated", (event) => {
  console.log("Vault created:", event.vault.toBase58());
  console.log("Creator:", event.creator.toBase58());
  console.log("Beneficiary:", event.beneficiary.toBase58());
  console.log("Unlock:", new Date(event.unlockUnix.toNumber() * 1000));
});
```

### Query Vault Count

```typescript
// Get all vaults for a creator
const creatorPubkey = new PublicKey("<CREATOR>");
const [counterPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault_counter"), creatorPubkey.toBuffer()],
  programId
);

const counter = await program.account.vaultCounter.fetch(counterPda);
console.log("Total vaults created by user:", counter.lastId.toString());
```

---

## Safety Invariants

### Admin Powers (What Admin CAN Do)
✅ Pause/unpause vault creation  
✅ Adjust per-vault cap  
✅ Change USDC mint (affects new vaults only)  
✅ Transfer admin role (via program upgrade)

### Admin Limitations (What Admin CANNOT Do)
❌ Withdraw user funds  
❌ Modify existing vault unlock times  
❌ Change existing vault beneficiaries  
❌ Prevent releases after unlock  
❌ Close user vaults  

**Funds are ALWAYS safe** — only beneficiary can receive after unlock.

---

## Multisig Setup (Recommended)

### Using Squads Protocol

1. **Create Squads multisig:**
   - Visit https://squads.so
   - Create new squad with 3-5 members
   - Set threshold (e.g., 3-of-5)

2. **Transfer admin authority:**
   ```typescript
   // Deploy program with multisig as upgrade authority
   solana program deploy \
     --program-id <PROGRAM_KEYPAIR> \
     --upgrade-authority <SQUADS_MULTISIG> \
     keepr_vault.so
   ```

3. **Update config via multisig:**
   - Create proposal in Squads UI
   - Members vote
   - Execute when threshold reached

### Using Solana Native Multisig

```bash
# Create multisig
solana-keygen new --outfile multisig.json

# Set as admin
# (requires program upgrade or initial deploy with multisig)
```

---

## Upgrade Procedures

### Program Upgrade

1. **Build new version:**
   ```bash
   anchor build
   ```

2. **Deploy upgrade:**
   ```bash
   solana program deploy \
     --program-id <PROGRAM_KEYPAIR> \
     --upgrade-authority <ADMIN_KEYPAIR> \
     target/deploy/keepr_vault.so
   ```

3. **Verify upgrade:**
   ```bash
   solana program show <PROGRAM_ID>
   ```

4. **Update IDL:**
   ```bash
   anchor idl upgrade <PROGRAM_ID> \
     --filepath target/idl/keepr_vault.json
   ```

---

## Checklist

### Pre-Launch (Mainnet)
- [ ] Program deployed with multisig upgrade authority
- [ ] Config initialized with correct USDC mint
- [ ] Per-vault cap set appropriately (start low, e.g., 100 USDC)
- [ ] Paused = false (allow vault creation)
- [ ] Admin playbook reviewed by all multisig members
- [ ] Emergency procedures tested on devnet
- [ ] Monitoring scripts deployed
- [ ] Event listeners active

### Post-Launch
- [ ] Monitor vault creation rate
- [ ] Check for unusual activity
- [ ] Verify releases execute correctly
- [ ] Track total value locked (TVL)
- [ ] Gradually increase cap if stable

### Regular Maintenance
- [ ] Weekly config state check
- [ ] Monthly security review
- [ ] Quarterly cap adjustment (if needed)
- [ ] Annual multisig member rotation (if applicable)

---

## Support

### Documentation
- Brief: `keepr_week_1_web_mvp_project_brief.md`
- Decisions: `DECISIONS.md`
- Risks: `RISKS.md`
- Changelog: `CHANGELOG.md`

### Addresses
- See: `memory/addresses.json`

### Emergency Contacts
- [Add team contacts]
- [Add multisig members]

---

**Last Updated:** 2025-10-01  
**Version:** 1.0  
**Maintainer:** Keepr Team
