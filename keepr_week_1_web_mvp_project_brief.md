# Keepr — Week‑1 Web MVP Project Brief (Mainnet)

**Tagline:** Peace of mind in minutes.

**One‑liner:** Keepr lets you lock a chosen amount of USDC into a time‑locked vault that automatically becomes claimable by your beneficiary after a set unlock time — simple, human, and on‑chain.

---

## 1) Product Brief

### Purpose

Give crypto users a dead‑simple way to create a beneficiary‑oriented, time‑locked vault on Solana. The Week‑1 scope is a **web dapp** (desktop + mobile via Phantom in‑app browser) that runs directly on **mainnet** with tight risk controls and zero backend.

### Core Value

- **Clarity:** One screen to set amount, unlock time, and beneficiary.
- **Safety:** Funds sit in a PDA‑owned USDC account; no admin withdrawal; strict caps and pause switch.
- **Credibility:** Pure on‑chain logic, minimal dependencies, auditable.

### Primary Use Case (Week‑1)

**Travel Safe Vault** for Token2049 attendees:

> “I’m traveling; if something happens during the trip, my beneficiary can receive the funds once the timer elapses.”

### Target Users

- **Crypto‑native travelers** (founders, devs, investors) who carry on‑chain balances and want a simple contingency.
- **Builders & power users** who value minimalism and trust minimization.

### Non‑Goals (this sprint)

- Multi‑beneficiary logic, notifications/dead‑man’s switch, flight parsing, WhatsApp/SMS/Email connectors, Seeker‑specific features, marketing site/landing.

### Constraints & Principles

- **Mainnet from day one** with small, enforceable caps.
- **No backend** (Week‑1). Local storage for non‑critical metadata.
- **Program upgradeable** under multisig for fixes; *no admin path to user funds*.
- **Use only audited primitives** (SPL Token, ATA, System, Clock).

---

## 2) User Flow (Web Dapp)

1. **Land / Onboard**
   - Hero + one‑line explainer; prominent **Connect Wallet** (Phantom).
2. **Connect**
   - User connects Phantom (desktop extension or Phantom in‑app browser on mobile).
3. **Create Vault**
   - User opens **Create Vault** form and enters:
     - Vault name (free text)
     - Deposit amount (USDC)
     - Unlock date & time (datetime picker; min buffer enforced)
     - Beneficiary address (validated Solana address)
   - **Review** screen → **Confirm & Lock** → sign tx(s) in Phantom → return.
4. **Confirmation**
   - Show locked amount, beneficiary, unlock date/time, live countdown.
5. **Dashboard**
   - List user’s vaults with: name, USDC locked, time remaining, beneficiary.
6. **Vault Detail**
   - Countdown, details, local activity log (created, deposited). When unlock elapses, **Release** becomes enabled.
7. **Release**
   - User clicks **Release to beneficiary** after unlock → sign → success; show tx signature and short explorer link.

**Mobile note:** Instruct users to open the URL **inside Phantom → Browser** for the smoothest flow.

---

## 3) Product Requirements

### Functional

- Connect/disconnect Phantom.
- Create vault with validated inputs (name, amount, unlock time, beneficiary).
- On‑chain deposit of USDC into PDA‑owned token account.
- Dashboard & detail views with live countdown.
- Post‑unlock **Release** to beneficiary ATA.
- Local activity log (client‑side events) and cached vault metadata.

### Non‑Functional

- No backend; use `localStorage` for profile, labels, cache.
- Mainnet safety rails: per‑vault cap; pause switch; USDC mint allowlist.
- Clear network badge (MAINNET) and correct USDC 6‑dp formatting.

---

## 4) Architecture Overview

### Web App

- **Framework:** Next.js (App Router), TypeScript, TailwindCSS.
- **Wallet:** `@solana/wallet-adapter-react` + Phantom adapter.
- **Chain:** `@coral-xyz/anchor` client + SPL helpers.
- **State:** React Query (on‑chain fetch) + lightweight Zustand for UI/local state.
- **Persistence:** `localStorage` only.
- **Hosting:** Vercel (or equivalent https host).

### On‑Chain Program (Anchor, upgradeable under multisig)

- PDAs: global **Config**, per‑creator **Counter**, per‑vault **Vault**.
- Instructions: `init_config`, `update_config`, `create_vault`, `deposit_usdc`, `release`.
- CPIs only to SPL Token, Associated Token, System, Clock.

---

## 5) Solana Program Specification (Anchor)

### Accounts

**Config PDA** (singleton; seeds `["config"]`)

```rust
pub struct Config {
  pub admin: Pubkey,              // multisig/authority
  pub usdc_mint: Pubkey,          // mainnet USDC mint
  pub max_lock_per_vault: u64,    // e.g., 500 * 10^6 (6dp)
  pub paused: bool,               // pause new vaults
}
```

**Counter PDA** (per creator; seeds `["vault_counter", creator]`)

```rust
pub struct VaultCounter { pub last_id: u64 }
```

**Vault PDA** (per vault; seeds `["vault", creator, vault_id]`)

```rust
pub struct Vault {
  pub creator: Pubkey,
  pub beneficiary: Pubkey,
  pub usdc_mint: Pubkey,
  pub vault_token_account: Pubkey, // PDA’s USDC ATA
  pub amount_locked: u64,          // base units
  pub unlock_unix: i64,            // epoch seconds
  pub released: bool,
  pub bump: u8,
  pub name_hash: [u8; 32],         // keccak256(name) client‑side
}
```

### Instructions

- `init_config(admin, usdc_mint, max_lock_per_vault, paused=false)`

  - Admin‑only; one‑time initializer; emits `ConfigUpdated`.

- `update_config(usdc_mint?, max_lock_per_vault?, paused?)`

  - Admin‑only; adjust caps/mint/pause; **no path to seize user funds**.

- `create_vault(beneficiary, unlock_unix, name_hash)`

  - Require: `!config.paused`, `unlock_unix > now + MIN_BUFFER`.
  - Create/seed PDAs + USDC ATA; set fields; emit `VaultCreated`.

- `deposit_usdc(amount)`

  - Require: `amount > 0`, `amount_locked + amount <= config.max_lock_per_vault`.
  - Transfer `creator_usdc_ata → vault_token_account`; emit `VaultFunded`.

- `release()`

  - Require: `now >= unlock_unix`, `!released`, `amount_locked > 0`.
  - Transfer **all** from `vault_token_account → beneficiary_usdc_ata`; set `released = true`; emit `VaultReleased`.

### Events / Errors

```rust
#[event] pub struct ConfigUpdated { pub admin: Pubkey }
#[event] pub struct VaultCreated  { pub creator: Pubkey, pub vault: Pubkey, pub beneficiary: Pubkey, pub unlock_unix: i64 }
#[event] pub struct VaultFunded   { pub vault: Pubkey,   pub amount: u64 }
#[event] pub struct VaultReleased { pub vault: Pubkey,   pub amount: u64, pub to: Pubkey }

#[error_code]
pub enum KeeprError {
  #[msg("Paused.")] Paused,
  #[msg("Unlock time must be in the future.")] InvalidUnlockTime,
  #[msg("Already released.")] AlreadyReleased,
  #[msg("USDC mint mismatch.")] MismatchedMint,
  #[msg("Nothing to release.")] NothingToRelease,
  #[msg("Invalid amount.")] InvalidAmount,
  #[msg("Per‑vault cap exceeded.")] AboveVaultCap,
}
```

### Safety Invariants

- Funds can only move **to the beneficiary’s USDC ATA** via `release()` **after** `unlock_unix`.
- Admin can **pause** and adjust caps/mint; **cannot** move user funds.
- USDC mint enforced; ATAs must match owner+mint; one‑way `released` flag; checked math.

---

## 6) Client Behavior & Local Data

### Wallet & Network

- Phantom connect/disconnect; MAINNET badge always visible.

### Create & Deposit

- Validate: positive amount (USDC 6dp), valid address, unlock time > now + buffer.
- Two‑step tx pipeline: `create_vault` then `deposit_usdc`.

### Monitoring

- Dashboard fetches user vaults via Anchor; caches minimal metadata for responsiveness.
- Detail view shows live countdown and local activity log entries.

### Release

- Enabled only post‑unlock; shows success toast and explorer link after tx.

### Local Storage Keys

- `keepr.profile`: `{ wallet, displayName?, createdAt, lastSeen }`
- `keepr.labels`: `[{ address, label }]`
- `keepr.vaultCache`: `VaultMeta[]` (with `lastRefreshed` timestamps)

---

## 7) MoSCoW Prioritization (Week‑1)

### Must‑Have

- Phantom connect/disconnect.
- Create vault (name, amount, unlock time, beneficiary) with full validation.
- On‑chain `create_vault` + `deposit_usdc` logic and UI.
- Dashboard & detail views with live countdown.
- Post‑unlock `release()` flow and UI.
- Mainnet safety rails: per‑vault cap, pause switch, USDC mint allowlist.
- Local storage for profile/labels/cache; network badge; 6‑dp formatting.

### Should‑Have

- Copyable tx signatures; short explorer links.
- Pull‑to‑refresh on dashboard; basic empty/edge states.
- Simple error surfaces for common failures (insufficient funds, bad address).

### Could‑Have

- Beneficiary label editing UX.
- Minimal theming (dark/light) via tokens.
- Small demo checklist panel for event staff.

### Won’t‑Have (this sprint)

- Multi‑beneficiary; notifications/dead‑man’s switch; flight parsing; messaging connectors; device‑specific features; marketing site.

---

## 8) ENV & Config

Create `.env.local` and `.env.example`:

```
# Solana
SOLANA_CLUSTER=mainnet-beta
RPC_URL=https://<your-mainnet-rpc>
PROGRAM_ID=<set-after-deploy>
USDC_MINT=<mainnet-usdc-mint>
MIN_UNLOCK_BUFFER_SECS=300
MAX_LOCK_PER_VAULT=500000000   # 500 USDC (6dp)
MULTISIG_ADDR=<upgrade-authority>

# App
NEXT_PUBLIC_APP_NAME=Keepr
NEXT_PUBLIC_NETWORK_BADGE=MAINNET
```

---

## 9) Repository Layout

```
web/
  app/
    page.tsx
    create/page.tsx
    vaults/page.tsx
    vaults/[vaultPda]/page.tsx
    _components/
      WalletConnect.tsx
      VaultCard.tsx
      AmountInput.tsx
      AddressInput.tsx
      Countdown.tsx
    _lib/
      anchor.ts        # IDL/program client
      spl.ts           # ATA/USDC helpers
      solana.ts        # connection
      format.ts
      storage.ts       # localStorage helpers
    _state/
      wallet.ts
      ui.ts
      cache.ts
    styles/globals.css
  public/
  env.d.ts
programs/keepr-vault/
  Anchor.toml
  Cargo.toml
  src/lib.rs
  tests/vault.spec.ts
```

---

## 10) Review Gates (no timeboxing)

- **Gate A — Wallet Scaffold:** Next.js up; Phantom connect/disconnect; MAINNET badge.
- **Gate B — Program Skeleton:** Anchor program with Config/Counter/Vault; unit tests (localnet); IDL ready.
- **Gate C — Create Flow:** Form + validation; on‑chain `create_vault` + `deposit_usdc`; review screen.
- **Gate D — Dashboard & Detail:** Listing, detail with countdown; local cache + activity log.
- **Gate E — Release Flow:** Post‑unlock release; explorer signature link; UX polish for success/error.

---

## 11) Test Plan

### Program (unit/integration on localnet)

- Create vault: invalid/valid unlock; name\_hash set; USDC mint enforced.
- Deposit: positive amounts; cap respected; balance changes.
- Release: pre‑unlock fails; post‑unlock transfers full balance; `released` one‑way.

### Web (manual on mainnet, small sums)

- Connect, create, deposit, countdown, release end‑to‑end on desktop and mobile (Phantom browser).
- Validate formatting, error states, and signature display.

---

## 12) Demo Checklist (Event Use)

- QR link tested in Phantom mobile browser.
- Test wallet pre‑funded with small USDC.
- Beneficiary test wallet prepared; verify receipt post‑release.
- Pause switch and caps documented in README for safety.

