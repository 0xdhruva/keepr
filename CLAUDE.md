# CLAUDE.md - Keepr Project Context

**Purpose:** Essential context for Claude Code to work effectively with Keepr.
**Maintenance:** Keep this file under 700 lines. Archive detailed debugging to SOLANA_PROGRAM_ISSUES_AND_LEARNINGS.md.

---

## What is Keepr?

**Mission:** Crypto inheritance dead man's switch for Solana/USDC
**Mechanism:** Recurring check-ins with automatic beneficiary release on missed deadlines
**Key Insight:** NOT a time-locked vault—it's a rolling deadline dead man's switch

**Business Model:**
- Tiered creation fees: $1 (Base) → $500 (Lifetime)
- Optional early closing fees (waived for Lifetime tier)
- Keeper bot funded by treasury (future: decentralized keeper network)

---

## Quick Start (5 Minutes)

### Mental Model

```
Creator Check-In Period (e.g., 30 days)
    ↓
Timer Expires → Notification Window (7 days warning)
    ├─→ Check in → Timer resets ✅
    └─→ Miss → Grace Period (3 days final warning)
        ├─→ Check in → Timer resets ✅
        └─→ Miss → Keeper bot auto-releases funds to beneficiary
```

**Critical Rules:**
- Cannot cancel during grace period (prevents gaming the system)
- Check-in resets timer back to full period
- Release is permissionless (anyone can trigger, keeper bot pays gas)

### Running the System

```bash
# Solana Program
cd programs/keepr-vault
anchor build --skip-lint
anchor deploy --provider.cluster devnet
cp target/idl/keepr_vault.json ../web/app/_lib/keepr_vault.json

# Web App
cd web
npm install && npm run dev  # localhost:3000

# Keeper Bot (auto-releases expired vaults)
export KEEPER_PRIVATE_KEY=<base58_key>
npm run keeper-bot

# Environment (.env.local)
NEXT_PUBLIC_SOLANA_CLUSTER=devnet  # or mainnet
NEXT_PUBLIC_PROGRAM_ID=74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK
NEXT_PUBLIC_USDC_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr  # devnet
```

---

## Current Status

| Component | Status | Blockers |
|-----------|--------|----------|
| **Solana Program** | ✅ Deployed (devnet) | None |
| **Web UI** | ✅ Working | None |
| **Keeper Bot** | ✅ Working | Needs separate hosting (not on Vercel) |
| **Notifications** | 🟡 Incomplete | Bell not populating from vault state |

### Active Blockers

**🔴 CRITICAL: UI Allows Cancel After Grace Period**
- **Error:** Cancel button shows after grace period expires
- **Impact:** User can cancel when presumed dead/incapacitated
- **Location:** web/app/vaults/[vaultPda]/page.tsx:729
- **Fix:** Update cancel visibility: `!vault.released && isCreator && !isInNotificationWindow && !isInGracePeriod && !canRelease`

**🟡 MEDIUM: Notification System**
- **Error:** NotificationBanner doesn't display alerts
- **Files:** web/app/_lib/notifications.ts, web/app/_components/NotificationBanner.tsx
- **Debug:** Check NotificationContext state updates

---

## Architecture

### Three-PDA Pattern

```
Config (singleton: seeds=["config"])
  ├─ Global params: USDC mint, vault cap, paused, treasury, admin_test_wallets
  └─ Admin-controlled, no fund withdrawal capability

VaultCounter (per creator: seeds=["vault_counter", creator])
  └─ Tracks last_id for deterministic vault addressing

Vault (per vault: seeds=["vault", creator, vault_id_bytes])
  ├─ All vault data (creator, beneficiary, amount, unlock_time, tier, etc.)
  └─ Owns Associated Token Account (ATA) holding USDC
```

### Six Instructions

| Instruction | Caller | Purpose | Rent |
|-------------|--------|---------|------|
| `init_config` | Admin (once) | Creates Config PDA | Admin pays |
| `update_config` | Admin | Updates parameters | - |
| `create_vault` | Creator | Creates Vault PDA + ATA | Creator pays |
| `deposit_usdc` | Creator | Transfers USDC to vault | - |
| `check_in` | Creator | Resets unlock deadline | - |
| `cancel_vault` | Creator | Returns funds minus fee | Rent to creator |
| `release` | Anyone | Sends USDC to beneficiary | - |
| `close_vault` | Anyone | Closes empty vault | Rent to creator |

**Key Insight:** `release` and `close_vault` are permissionless—vault PDA signs via seeds.

### Network Config System

**Problem:** Mainnet uses days, but testing with 30-day periods is too slow.
**Solution:** Dynamic time units based on environment variable.

```typescript
// Devnet: Minutes for fast iteration
{ timeUnit: 'minutes', minCheckinPeriod: 120, defaultCheckinPeriod: 5 }

// Mainnet: Days for production
{ timeUnit: 'days', minCheckinPeriod: 86400, defaultCheckinPeriod: 30 }

// Usage
const config = getNetworkConfig();
const seconds = timeToSeconds(5);  // Devnet: 300s, Mainnet: 432000s
const display = formatTimeValue(secondsToTime(seconds));  // "5 minutes" or "5 days"
```

**Testing on Devnet:** 5-minute vault expires in ~6 minutes (vs 30+ days on mainnet).

---

## Critical Constraints

### 1. Solana 4KB Stack Limit
**Problem:** Combining create + deposit in one instruction causes stack overflow.
**Solution:** Separate instructions, combined in single atomic transaction on client.

### 2. Schema Breaking Changes
**Problem:** Changing Vault struct size (188→237 bytes) breaks old vaults.
**Impact:** `AccountDidNotDeserialize (3003)` errors.
**Solution (Devnet):** Redeploy and ignore old vaults.
**Solution (Mainnet):** NEVER change Vault size post-launch. Close old vaults manually before redeployment.

### 3. DeclaredProgramIdMismatch → Always Use `anchor build`
**Problem:** `cargo-build-sbf` doesn't embed `declare_id!` correctly.
**Symptoms:** Error 4100 - program ID mismatch.
**Fix:**
```bash
cargo clean
anchor build --skip-lint  # NOT cargo-build-sbf!
anchor deploy --provider.cluster devnet
# Wait 5-10 minutes for RPC cache to clear
```

### 4. Devnet vs Mainnet Token Addresses
**Critical:** USDC mint differs between networks!
- **Devnet:** `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`
- **Mainnet:** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

### 5. Devnet RPC Caching
**Problem:** RPC nodes cache program bytecode for 5-10 minutes.
**Solution:** Wait after deployment OR use alternative RPC (Helius, QuickNode).

---

## Common Operations

### Build & Deploy

```bash
# Full rebuild
cd programs/keepr-vault
cargo clean
anchor build --skip-lint

# Verify IDL
cat target/idl/keepr_vault.json | jq '.instructions | length'  # Should be 8
cat target/idl/keepr_vault.json | jq '.errors | length'        # Should be 21+

# Copy to web app
cp target/idl/keepr_vault.json ../web/app/_lib/keepr_vault.json

# Deploy
anchor deploy --provider.cluster devnet

# Wait 5-10 minutes before testing!
```

### Run Keeper Bot

```bash
# First time: Generate keeper wallet
solana-keygen new --no-bip39-passphrase --force --outfile keeper-keypair.json
solana airdrop 2 $(solana-keygen pubkey keeper-keypair.json) --url devnet

# Convert to base58
node -e "const bs58=require('bs58'); const key=JSON.parse(require('fs').readFileSync('keeper-keypair.json')); console.log(bs58.default.encode(Buffer.from(key)));"

# Run (add to .env.keeper, don't commit!)
export KEEPER_PRIVATE_KEY=<base58_from_above>
npm run keeper-bot
```

### Test Vault End-to-End

```bash
# 1. Create vault via web UI (5-minute check-in on devnet)
# 2. Get vault PDA from success screen
# 3. Verify vault token account exists

node -e "
const { PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
(async () => {
  const vaultPda = new PublicKey('<VAULT_PDA>');
  const usdcMint = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');
  const ata = await getAssociatedTokenAddress(usdcMint, vaultPda, true);
  console.log('Vault Token Account:', ata.toBase58());
})();
"

# 4. Check if ATA exists
solana account <vault_token_account> --url devnet
```

---

## Tech Stack

| Component | Technology | Location |
|-----------|-----------|----------|
| **Solana Program** | Rust, Anchor 0.30.1-0.31.1 | `programs/keepr-vault/src/lib.rs` |
| **Web App** | Next.js 15+, TypeScript, TailwindCSS 4 | `web/` |
| **Wallet** | `@solana/wallet-adapter-react` (Phantom MVP) | - |
| **Keeper Bot** | Node.js/TypeScript | `scripts/keeper-bot/` |
| **State** | React hooks + localStorage | No global state manager |

**Key Directories:**
- `web/app/_components/` - UI components
- `web/app/_lib/` - Utilities (solana.ts, validation.ts, config.ts, instructions.ts)
- `web/app/create/page.tsx` - Vault creation flow
- `web/app/vaults/[vaultPda]/page.tsx` - Vault details + actions

---

## Debugging Quick Reference

### Error Decoder

| Error | Cause | Fix |
|-------|-------|-----|
| `AccountNotInitialized` | ATA doesn't exist | Add `init_if_needed` + `payer` constraint |
| `DeclaredProgramIdMismatch (4100)` | Used `cargo-build-sbf` or RPC cache | `cargo clean && anchor build --skip-lint`, wait 10min |
| `AccountDidNotDeserialize (3003)` | Schema mismatch (old vault) | Redeploy program, reinit Config, ignore old vaults (devnet) |
| `ConstraintAddress (2012)` | Wrong USDC mint (devnet vs mainnet) | Verify USDC mint matches network |
| `InvalidUnlockTime` | Unlock time in past | Check client-side time calculation |
| `CannotCancelDuringWatchdog` | User in grace period | Expected—show user message |
| `InsufficientBalanceForClosingFee` | Not enough USDC | Check user balance |

### Debug Checklist

**When something breaks:**
1. What network? (devnet vs mainnet)
2. Program deployed recently? (check tx signature)
3. Schema mismatch? (old vault size vs new)
4. DeclaredProgramIdMismatch? (rebuild with `anchor build`)
5. Simulate transaction to see on-chain logs
6. If on-chain error, check deployed program bytecode

**Common Patterns:**
- Transaction simulation: Essential for catching on-chain errors early
- Manual instruction building: Better for multi-ix transactions (see `_lib/instructions.ts`)
- Config account: Must match program schema (close and reinit if schema changes)

---

## Mainnet Pre-Flight Checklist

Before deploying to mainnet:
- [ ] Vault struct size is FINAL (cannot change without migration)
- [ ] Config has correct `treasury` address
- [ ] USDC mint is mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- [ ] Minimum check-in period is 24 hours (not 2 minutes!)
- [ ] Keeper bot deployed to production (Railway/Render)
- [ ] Keeper wallet funded with SOL
- [ ] Notification system live (email/SMS)
- [ ] Test with small amount first (0.01 USDC)

---

## How to Maintain This File

### Adding New Learnings

**Where to add:**
- **Active blockers** → "Current Status" section
- **New error pattern** → "Debugging Quick Reference" error decoder
- **Architecture change** → "Architecture" section (keep it brief!)
- **Detailed debugging history** → SOLANA_PROGRAM_ISSUES_AND_LEARNINGS.md (NOT here)

### Compacting Process (every ~10 sessions)

1. **Move resolved blockers:** From "Current Status" to error decoder or delete
2. **Archive detailed debugging:** Move verbose troubleshooting to SOLANA_PROGRAM_ISSUES_AND_LEARNINGS.md
3. **Consolidate redundancy:** If same info appears in multiple sections, keep most concise version
4. **Update "Current Status":** Reflect latest component states
5. **Keep under 700 lines:** If over, archive historical content

### Template for New Error

```markdown
## [Error Name] - [Date]

**Error:** [Exact error message]
**Impact:** [What breaks]
**Root Cause:** [Why it happens]
**Fix:** [How to solve]
**Location:** [File:line if applicable]
```

After resolving, add to error decoder table and archive detailed investigation to SOLANA_PROGRAM_ISSUES_AND_LEARNINGS.md.

---

## Known Limitations & Roadmap

**Current Limitations:**
- No partial releases (all-or-nothing)
- Cannot edit vault post-creation
- No vault pausing (only cancel for fee)
- USDC only

**Planned Features:**
- Multi-beneficiary splits
- Guardian recovery
- Vault templates
- Mobile app
- Email/SMS notifications

**Infrastructure Needs:**
- Production keeper bot (Railway)
- Monitoring/alerting for keeper failures
- Database for user profiles + notification preferences

---

## Reference Docs

- **SOLANA_PROGRAM_ISSUES_AND_LEARNINGS.md** - Detailed debugging history and solutions
- **DECISIONS.md** - Architecture decisions log
- **CHANGELOG.md** - Project changelog
- **Anchor.toml** - Anchor version config, cluster settings
