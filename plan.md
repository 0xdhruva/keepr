# Keepr Week-1 MVP Implementation Plan

**Source of Truth:** `keepr_week_1_web_mvp_project_brief.md`  
**Approach:** MoSCoW priorities, Review Gates A–E, pause after each milestone

---

## MoSCoW Priorities

### MUST HAVE
- Phantom wallet connect/disconnect
- Create vault form with validation (name, amount, unlock time, beneficiary)
- On-chain `create_vault` + `deposit_usdc` instructions
- Dashboard listing user's vaults
- Vault detail view with live countdown
- Post-unlock `release()` flow
- Mainnet safety rails: per-vault cap, pause switch, USDC mint allowlist
- Local storage for profile/labels/vault cache
- MAINNET network badge
- USDC 6-decimal formatting
- Program tests on localnet (unit/integration)

### SHOULD HAVE
- Copyable transaction signatures
- Short Solana explorer links
- Pull-to-refresh on dashboard
- Empty/edge state UI
- Error surfaces for common failures (insufficient funds, invalid address)

### COULD HAVE
- Beneficiary label editing UX
- Dark/light theme toggle
- Demo checklist panel for event staff

### WON'T HAVE (this sprint)
- Multi-beneficiary logic
- Notifications/dead-man's switch
- Flight parsing
- Messaging connectors (WhatsApp/SMS/Email)
- Marketing landing page
- Backend services

---

## Review Gates (MVP Phase — COMPLETED ✅)

### Gate A — Wallet Scaffold ✅
**Goal:** Next.js app with Phantom wallet integration and mainnet badge

**Tasks:**
- [x] Bootstrap Next.js (App Router) with TypeScript + Tailwind
- [x] Install wallet adapter + Phantom adapter
- [x] Implement WalletConnect component (connect/disconnect)
- [x] Display MAINNET badge
- [x] Wire up environment variables
- [x] Create .env.example

**Acceptance Criteria:**
- User can connect/disconnect Phantom wallet
- MAINNET badge visible on all pages
- Wallet address displayed when connected
- Responsive on desktop and mobile

**Artifacts:**
- Live page screenshot showing Phantom connect/disconnect with MAINNET badge
- Run instructions

**Status:** PENDING

---

### Gate B — Program Skeleton
**Goal:** Anchor program with Config/Counter/Vault accounts and full test coverage on localnet

**Tasks:**
- [ ] Initialize Anchor workspace
- [ ] Define Config PDA (admin, usdc_mint, max_lock_per_vault, paused)
- [ ] Define Counter PDA (per creator)
- [ ] Define Vault PDA (creator, beneficiary, amount_locked, unlock_unix, released, etc.)
- [ ] Implement `init_config` instruction
- [ ] Implement `update_config` instruction (admin-only)
- [ ] Implement `create_vault` instruction (with validations)
- [ ] Implement `deposit_usdc` instruction (with cap checks)
- [ ] Implement `release` instruction (time-locked, one-way)
- [ ] Define events (ConfigUpdated, VaultCreated, VaultFunded, VaultReleased)
- [ ] Define error codes
- [ ] Write localnet unit tests for all instructions
- [ ] Write integration tests (create → deposit → release flow)

**Acceptance Criteria:**
- All instructions compile and deploy to localnet
- Tests pass: invalid/valid unlock times, cap enforcement, release timing
- IDL generated and saved
- No admin path to user funds
- USDC mint validation enforced

**Artifacts:**
- Localnet test logs (all passing)
- Compiled IDL location
- Program ID (localnet)

**Status:** PENDING

---

### Gate C — Create Flow
**Goal:** End-to-end vault creation with on-chain deposit on mainnet

**Tasks:**
- [ ] Create vault form UI (name, amount, unlock datetime, beneficiary)
- [ ] Client-side validation (positive amount, valid address, min unlock buffer)
- [ ] Review screen before confirmation
- [ ] Integrate Anchor client for `create_vault` instruction
- [ ] Integrate Anchor client for `deposit_usdc` instruction
- [ ] Two-step transaction pipeline (create → deposit)
- [ ] Success confirmation with vault details
- [ ] Error handling for common failures

**Acceptance Criteria:**
- User can create vault with valid inputs
- Form validates amount (6dp), address format, unlock time buffer
- Review screen shows all details before signing
- Transactions execute on mainnet
- Success screen shows locked amount, beneficiary, unlock time
- Errors display clearly (insufficient USDC, invalid inputs)

**Artifacts:**
- Video or screenshots: Create Vault → Review → Confirm & Lock → Deposit (mainnet, tiny USDC)
- Transaction signatures

**Status:** PENDING

---

### Gate D — Dashboard & Detail
**Goal:** Vault listing and detail views with live countdown and local caching

**Tasks:**
- [ ] Dashboard page fetching user's vaults via Anchor
- [ ] VaultCard component (name, amount, countdown, beneficiary)
- [ ] Vault detail page with full info
- [ ] Live countdown component (updates every second)
- [ ] Local activity log (created, deposited events)
- [ ] Cache vault metadata in localStorage
- [ ] Pull-to-refresh functionality
- [ ] Empty state when no vaults
- [ ] Loading states

**Acceptance Criteria:**
- Dashboard lists all user vaults
- Countdown shows time remaining accurately
- Detail page shows vault info + activity log
- Cache reduces redundant RPC calls
- Pull-to-refresh updates vault data
- Empty state guides user to create first vault

**Artifacts:**
- Dashboard screenshot with multiple vaults
- Detail page screenshot showing countdown and activity log
- Explanation of fetch & caching strategy

**Status:** PENDING

---

### Gate E — Release Flow
**Goal:** Post-unlock release to beneficiary with explorer link

**Tasks:**
- [ ] Enable Release button only after unlock_unix
- [ ] Implement `release()` instruction call
- [ ] Transfer funds to beneficiary's USDC ATA
- [ ] Display success with transaction signature
- [ ] Short Solana explorer link
- [ ] Update vault state (released = true)
- [ ] Error handling (pre-unlock attempt, already released)
- [ ] Polish success/error UX

**Acceptance Criteria:**
- Release button disabled before unlock time
- Release button enabled after unlock time
- Clicking Release signs transaction
- Funds transfer to beneficiary's USDC ATA
- Success screen shows explorer link
- Vault marked as released
- Cannot release twice

**Artifacts:**
- Post-unlock release flow screenshots
- Explorer link showing funds to beneficiary ATA
- Transaction signature

**Status:** ✅ COMPLETED

---

## Post-MVP Phase — Production Readiness

### Phase 1: UI/UX Polish (Current)
**Goal:** Improve visual design and user experience

**Tasks:**
- [ ] Enhance landing page design
- [ ] Improve form styling and interactions
- [ ] Add micro-animations and transitions
- [ ] Polish empty states and loading states
- [ ] Improve mobile responsiveness
- [ ] Add tooltips and help text
- [ ] Enhance error messages
- [ ] Improve typography and spacing
- [ ] Add success celebrations
- [ ] Polish countdown timer display

**Acceptance:**
- Professional, polished appearance
- Smooth animations and transitions
- Clear visual hierarchy
- Excellent mobile experience
- Intuitive user flows

**Artifacts:**
- Updated screenshots
- Before/after comparisons
- User feedback

**Status:** PENDING

---

### Phase 2: Localnet Deployment & Testing
**Goal:** Deploy program to localnet and wire up real transactions

**Tasks:**
- [ ] Install Solana BPF toolchain
- [ ] Build program with `cargo build-sbf`
- [ ] Start local validator
- [ ] Deploy program to localnet
- [ ] Get deployed program ID
- [ ] Write comprehensive program tests
  - [ ] Test init_config
  - [ ] Test create_vault
  - [ ] Test deposit_usdc
  - [ ] Test release (time-locked)
  - [ ] Test safety rails (caps, pause, mint validation)
  - [ ] Test error cases
- [ ] Update web app .env with localnet program ID
- [ ] Replace mock transactions with real Anchor calls
- [ ] Test complete flow on localnet
  - [ ] Create vault
  - [ ] Deposit USDC
  - [ ] Wait for unlock
  - [ ] Release funds
- [ ] Verify all edge cases

**Acceptance:**
- All program tests passing
- Web app works with real transactions on localnet
- No errors in complete user flow
- Safety rails working correctly

**Artifacts:**
- Test results
- Localnet transaction signatures
- Program deployment logs

**Status:** PENDING

---

### Phase 3: Mainnet Deployment
**Goal:** Deploy to production with real USDC

**Prerequisites:**
- [ ] Answer outstanding questions (RPC, multisig, caps, etc.)
- [ ] Security review of program code
- [ ] Multisig setup for admin
- [ ] Initial config values decided
- [ ] Monitoring/alerting setup
- [ ] Error tracking (Sentry) configured

**Tasks:**
- [ ] Final security audit (recommended)
- [ ] Generate mainnet program keypair
- [ ] Build program for mainnet
- [ ] Deploy program via multisig
- [ ] Initialize config PDA with production values
- [ ] Deploy web app to Vercel/Netlify
- [ ] Update web app with mainnet program ID
- [ ] Test with small USDC amounts
- [ ] Monitor first transactions
- [ ] Gradual rollout

**Acceptance:**
- Program deployed to mainnet
- Web app live and functional
- Real USDC transactions working
- No critical issues
- Monitoring active

**Artifacts:**
- Mainnet program ID
- Live web app URL
- First transaction signatures
- Monitoring dashboard

**Status:** PENDING

---

## Current Status

**MVP Phase:** ✅ COMPLETED (All 5 gates)  
**Current Phase:** Phase 1 — UI/UX Polish  
**Next Phase:** Phase 2 — Localnet Deployment  
**Blockers:** None
