# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Keepr is a crypto inheritance app for long-term planning and short-term emergencies. It's built as a monorepo with a Solana program (Anchor framework) and Next.js web frontend for creating time-locked USDC vaults on Solana mainnet.

**Key Architecture:**
- **Monorepo structure:** `programs/keepr-vault/` (Solana program) and `web/` (Next.js frontend) at root level
- **Program ID (devnet):** `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK`
- **Network:** Mainnet-first deployment with devnet for testing
- **Token standard:** Classic SPL Token (not Token-2022) for USDC

## Common Commands

### Solana Program

**Build program:**
```bash
cd programs/keepr-vault
cargo-build-sbf
```

**Build with Anchor (generates IDL):**
```bash
cd programs/keepr-vault
anchor build
```

**Deploy to devnet:**
```bash
cd programs/keepr-vault
anchor deploy --provider.cluster devnet
```

**Run tests (when implemented):**
```bash
cd programs/keepr-vault
anchor test
```

**Check IDL:**
```bash
anchor build
cat target/idl/keepr_vault.json | jq '.instructions | length'  # Should be 6
cat target/idl/keepr_vault.json | jq '.errors | length'         # Should be 12
```

### Web Application

**Development server:**
```bash
cd web
npm run dev
```

**Build for production:**
```bash
cd web
npm run build
```

**Start production server:**
```bash
cd web
npm start
```

**Lint:**
```bash
cd web
npm run lint
```

## Program Architecture

### Three PDA Types

1. **Config** (singleton) — `seeds: ["config"]`
   - Global safety parameters (usdc_mint, max_lock_per_vault, paused flag)
   - Admin-controlled, no withdrawal path for funds

2. **VaultCounter** (per creator) — `seeds: ["vault_counter", creator]`
   - Tracks `last_id` for deterministic vault addressing
   - Increments on each vault creation

3. **Vault** (per vault) — `seeds: ["vault", creator, vault_id_le]`
   - Stores creator, beneficiary, amount_locked, unlock_unix, released flag
   - PDA owns the associated token account (ATA) holding USDC
   - `vault_id` stored in struct for consistent PDA derivation

### Six Instructions

1. **init_config** — One-time admin setup (usdc_mint allowlist, vault cap, pause switch)
2. **update_config** — Admin adjusts parameters (no fund withdrawal capability)
3. **create_vault** — Creator initializes vault PDA and token account (no deposit)
4. **deposit_usdc** — Creator funds vault (separate from creation to avoid stack overflow)
5. **release** — Anyone can trigger post-unlock; PDA signs transfer to beneficiary's ATA
6. **close_vault** — Creator reclaims rent after release completes (requires `released==true` and `amount_locked==0`)

### Single-Signer UX Pattern

- **Creator signs:** create_vault, deposit_usdc, close_vault
- **Any signer can call release:** PDA signs token transfer via seeds (permissionless post-unlock)
- **No multi-sig required:** PDA authority pattern handles token operations

### Safety Invariants

- Per-vault cap enforced (default 500 USDC)
- USDC mint allowlist validated at all token operation points
- Admin can pause new vault creation but cannot withdraw funds
- One-way `released` flag prevents double-release
- Funds only move to beneficiary via `release()` after `unlock_unix`
- Checked math (`.checked_add()`) prevents overflow

## Web Application Architecture

### Stack

- **Framework:** Next.js 15+ (App Router, TypeScript strict mode, Turbopack)
- **Styling:** TailwindCSS 4
- **Wallet:** `@solana/wallet-adapter-react` (Phantom only for MVP)
- **State:** React Query for on-chain data + Zustand for UI state
- **Solana SDK:** `@solana/web3.js` + `@coral-xyz/anchor`

### Key Directories

- `web/app/_components/` — Reusable UI components (Header, WalletConnect, VaultCard, NetworkBadge, etc.)
- `web/app/_lib/` — Utilities (anchor.ts, solana.ts, storage.ts, validation.ts, format.ts)
- `web/app/_lib/keepr_vault.json` — Program IDL (copy from `target/idl/` after build)
- `web/app/page.tsx` — Landing page
- `web/app/create/page.tsx` — Vault creation flow
- `web/app/vaults/page.tsx` — Vault list (creator's vaults)
- `web/app/vaults/[vaultPda]/page.tsx` — Vault details with release and close actions
- `web/app/vaults/[vaultPda]/release/page.tsx` — ⚠️ DEPRECATED: Release flow (functionality moved to main vault page)

### Local Storage Schema

Three namespaced keys (non-critical metadata only):
- `keepr.profile` — User display name
- `keepr.labels` — Vault name labels (keyed by PDA)
- `keepr.vaultCache` — Cached vault data

### IDL Update Workflow

When program changes:
1. `cd programs/keepr-vault && anchor build`
2. Copy `target/idl/keepr_vault.json` to `web/app/_lib/keepr_vault.json`
3. Restart Next.js dev server

### User Flow (Current Implementation)

**Vault Creation:**
1. User fills form: name, beneficiary address, unlock date/time
2. Advanced settings (optional): notification window, grace period
3. Review screen shows calculated parameters with safety buffer
4. Two transactions: `create_vault` → `deposit_usdc`

**Vault Management (on details page):**
- **Before unlock:** Shows countdown timer, vault details
- **After unlock (not released):** Shows "Release Funds" button
  - Anyone can trigger release (connected wallet pays for beneficiary ATA if needed)
  - Entire balance transferred to beneficiary
  - Vault marked as `released=true`
- **After release:** Shows "Close Vault" button (creator only)
  - Closes vault account and token account
  - Reclaims rent to creator
  - Redirects to vault list

**Note:** Release and close are now on the same page (`/vaults/[vaultPda]`), not separate routes.

## Important Design Decisions

### Two-Step Vault Creation

**Why:** Combining create+deposit caused stack overflow (Solana 4KB limit). Separate instructions keep stack frames small.

**Flow:**
1. Call `create_vault` → initializes PDA + token account (amount_locked=0)
2. Call `deposit_usdc` → transfers USDC from creator's ATA to vault ATA

### Release Mechanism

**One-way:** `released` flag set to true, entire `amount_locked` transferred to beneficiary's ATA. No partial releases.

### Name Storage

**On-chain:** `name_hash` (keccak256, 32 bytes) for privacy and cost savings
**Client:** Full vault name stored in `localStorage.keepr.labels`

### Mobile Support

Phantom mobile browser provides seamless in-app wallet integration (responsive design with instructions).

## Testing Strategy

- **Program tests:** Localnet (fast iteration) — not yet implemented (see P1_PROGRAM_STRUCTURE.md)
- **Web manual testing:** Mainnet with tiny amounts for real-world validation
- **Devnet:** Available for deployment testing

## Critical Safety Notes

- **Mainnet USDC mint:** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **Network badge:** Persistent MAINNET indicator on all pages to prevent user confusion
- **Validation:** Client-side mirrors on-chain checks to reduce failed transactions
- **Error handling:** User-friendly messages to save transaction fees

## Critical Debugging Learnings

### Borsh Serialization Gotchas

**IMPORTANT:** When manually building instructions in `web/app/_lib/instructions.ts`:

1. **Fixed-size arrays `[u8; N]`** serialize WITHOUT length prefix (just N bytes)
   - Use `encodeFixedBytes()` for fields like `name_hash: [u8; 32]`
   - Example: 32-byte hash → 32 bytes in instruction data

2. **Dynamic vectors `Vec<u8>`** serialize WITH 4-byte length prefix + data
   - Use `encodeVecU8()` for dynamic-length fields
   - Example: Vec of 32 bytes → 36 bytes total (4 + 32)

3. **Common bug:** Using `Vec<u8>` encoding for fixed-size array causes 4-byte misalignment
   - Symptoms: Validation errors on fields that appear correct client-side
   - Root cause: Program reads garbage data due to offset mismatch

### Release Instruction Requirements

The `release` instruction requires a `payer` account even though release is permissionless:

- **Why:** Beneficiary ATA may not exist yet; `init_if_needed` constraint requires payer for rent
- **Who signs:** Any connected wallet (creator, beneficiary, or third party)
- **Fixed in:** `/web/app/_lib/instructions.ts` and vault details page

### Notification Window Validation

On-chain validation uses **strict inequality** (`<` not `<=`):
```rust
require!(notification_window_seconds < vault_period_seconds, ...)
```

**Client-side calculation must account for:**
- Wallet approval delay: 5-30 seconds
- Network propagation: 5-30 seconds (devnet slower than mainnet)
- On-chain execution delay: 1-10 seconds
- Clock skew: 0-30 seconds
- **Total safety buffer:** 90-130 seconds for short test vaults

## Known Limitations & Future Work

- **Manual release required:** User must click "Release Funds" button after unlock
  - Future: Implement automatic release via Clockwork, keeper bots, or incentivized release
- **No partial releases:** All-or-nothing fund transfer
- **No vault editing:** Cannot change beneficiary or unlock time after creation

## Reference Documentation

- **DECISIONS.md** — Chronological log of all architecture decisions with rationale
- **P1_PROGRAM_STRUCTURE.md** — Detailed program implementation summary (instructions, PDAs, events, errors)
- **SOLANA_PROGRAM_ISSUES_AND_LEARNINGS.md** — Comprehensive debugging log (serialization bugs, instruction errors, fixes)
- **README.md** — Basic project description
- **Anchor.toml** — Anchor version 0.30.1, devnet cluster config, test scripts
