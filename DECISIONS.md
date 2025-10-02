# Architecture & Design Decisions

**Format:** `[YYYY-MM-DD] Decision — Rationale`

---

## 2025-09-30

### Repository Structure
**Decision:** Monorepo with `web/` and `programs/keepr-vault/` at root level.  
**Rationale:** Follows brief Section 9; keeps program and web app co-located for easier development and deployment coordination.

### Web Framework
**Decision:** Next.js 14+ with App Router, TypeScript strict mode, TailwindCSS.  
**Rationale:** Modern React patterns, built-in routing, excellent Vercel deployment, TypeScript for type safety, Tailwind for rapid UI development.

### Wallet Integration
**Decision:** `@solana/wallet-adapter-react` with Phantom adapter only (Week-1).  
**Rationale:** Brief specifies Phantom for desktop + mobile (in-app browser). Adapter provides standard connect/disconnect UX.

### State Management
**Decision:** React Query for on-chain data fetching + Zustand for lightweight UI state.  
**Rationale:** React Query handles caching/refetching/loading states elegantly. Zustand is minimal and sufficient for wallet/UI state without Redux overhead.

### Local Storage Schema
**Decision:** Three keys: `keepr.profile`, `keepr.labels`, `keepr.vaultCache`.  
**Rationale:** Per brief Section 6; namespaced to avoid collisions; minimal non-critical metadata only.

### Program Architecture
**Decision:** Three PDA types: Config (singleton), Counter (per creator), Vault (per vault).  
**Rationale:** Per brief Section 5; Counter enables deterministic vault addressing; Config enforces global safety rails.

### Safety Rails
**Decision:** 
- Per-vault cap (500 USDC default)
- Pause switch (admin can halt new vaults)
- USDC mint allowlist (only mainnet USDC)
- No admin withdrawal path (funds only move to beneficiary via `release()`)

**Rationale:** Non-negotiable per brief; protects mainnet deployment during MVP phase.

### Two-Step Vault Creation
**Decision:** Separate `create_vault` and `deposit_usdc` instructions.  
**Rationale:** Allows vault PDA to exist before funding; cleaner separation of concerns; easier to handle partial failures.

### Release Mechanism
**Decision:** One-way `released` flag; transfers entire `amount_locked` to beneficiary's USDC ATA.  
**Rationale:** Simplest safe design; no partial releases; clear finality.

### Testing Strategy
**Decision:** Program tests on localnet; web app manual testing on mainnet with tiny amounts.  
**Rationale:** Per brief Section 11; localnet for fast iteration; mainnet for real-world validation.

### Environment Variables
**Decision:** `.env.local` for secrets (not committed); `.env.example` as template.  
**Rationale:** Standard practice; prevents accidental secret commits; clear documentation for setup.

### Network Badge
**Decision:** Persistent MAINNET badge on all pages.  
**Rationale:** Critical safety indicator; prevents user confusion about network; always visible.

### Countdown Implementation
**Decision:** Client-side countdown using `setInterval`, updates every second.  
**Rationale:** Smooth UX; no server needed; acceptable drift for this use case (unlock checked on-chain).

### Explorer Links
**Decision:** Solscan for mainnet transaction links.  
**Rationale:** Clean UI, widely used, reliable.

### Mobile Support
**Decision:** Responsive design + instructions to use Phantom in-app browser.  
**Rationale:** Per brief Section 2; Phantom mobile browser provides seamless wallet integration.

### Error Handling
**Decision:** Client-side validation mirrors on-chain checks; display user-friendly error messages.  
**Rationale:** Reduces failed transactions; better UX; saves user transaction fees.

### Naming Convention
**Decision:** Vault name stored as `name_hash` (keccak256) on-chain; full name in localStorage.  
**Rationale:** Saves on-chain storage costs; privacy; client reconstructs display name from cache.

---

## 2025-10-01 (afternoon)

### Theme Guide Creation
**Decision:** Created THEME_GUIDE.md as quick-reference companion to DESIGN_SYSTEM.md.
**Rationale:** Developers need fast access to tokens (colors, spacing, motion) without reading full design system. Focuses on implementation patterns and code examples.

### Beneficiary Safety UX Enhancements
**Decision:** Added identicon, chunked address display (AAAA·BBBB·…·ZZZZ), and last-4-character confirmation to Create Vault flow.
**Rationale:** Critical safety feature to prevent wrong-address errors. Identicon provides visual confirmation, chunked display improves address legibility, and typing last 4 chars forces user attention before locking funds. Aligns with "beneficiary clarity > everything" principle from brief.

**Implementation Details:**
- Identicon: 5×5 symmetric grid generated from address hash with HSL colors
- Chunked format: First 12 chars (3 groups of 4) + "…" + last 4 chars
- Confirmation input: Uppercase, monospace, 4-char limit, disabled button until correct
- Visual feedback: Emerald borders/backgrounds for valid states, smooth animations

### Landing Page Redesign
**Decision:** Restructured home page with hero text, vault templates, and How it Works modal.
**Rationale:** User requested clearer value proposition and specific use case templates (Token2049 travel vault and Legacy forever vault) to guide users to the right vault type.

**Changes:**
- Hero: "Peace of mind for your assets in minutes" without card wrapper
- Two action buttons: "Create a new Vault" and "How it works"
- Vault Templates section: Token2049 (travel safe) and Legacy (forever with check-ins)
- How it Works modal: 4-step explanation with safety features
- Template links pass query params to pre-configure vault creation

### Date/Time Picker Visibility Fix
**Decision:** Changed text color from `text-white` to `text-warm-900` in DateTimeInput component.
**Rationale:** Bug fix — white text on white background made datetime picker invisible. Discovered during user testing.

### Date/Time Picker Overhaul
**Decision:** Completely redesigned the datetime picker with better visual feedback, proper styling, and confirmation display.
**Rationale:** User reported picker was "janky" — needed better UX with clear states and feedback.

**Improvements:**
- Border-2 with color-coded states (gray → sage green when filled, rose on error)
- Added checkmark icon when valid date selected
- Shows formatted unlock time in a sage-colored info box below input
- Better focus states with ring-4 for accessibility
- Color-scheme: light to ensure proper browser rendering
- Helper text changes based on state

### Hero Banner Redesign
**Decision:** Major visual overhaul with animated background elements, trust signals, and improved typography.
**Rationale:** User requested "prettier" design with sense of calm and trust.

**Changes:**
- Animated gradient blobs (sage and lavender) with pulse effect
- "Secured on Solana" trust badge at top
- Larger hero text (text-6xl) with sage-600 accent on "in minutes"
- Descriptive subheading
- Larger, more prominent action buttons with better shadows
- Social proof badges below (non-custodial, open source, transparent fees)
- Staggered animations (600ms, 700ms, 800ms, 900ms, 1000ms) for smooth entrance

### Why Keepr Section Layout
**Decision:** Changed from vertical stack to horizontal 3-column grid layout.
**Rationale:** User requested horizontal layout for better visual balance and modern design.

**Changes:**
- Grid with md:grid-cols-3 for responsive layout
- Centered text and icons
- Larger icons (w-14 h-14) in sage-100 backgrounds
- Gradient background (warm-50 to sage-50/30) for subtle depth

---

## 2025-10-01 (morning)

### SPL Token Version (Week-1)
**Decision:** Use classic SPL Token program (not Token-2022) for MVP.  
**Rationale:** Mainnet USDC uses classic SPL Token; simpler, battle-tested, no extension complexity; aligns with brief's "audited primitives only" constraint.

### Single-Signer UX
**Decision:** 
- `create_vault` + `deposit_usdc`: creator signs only
- `release()`: any signer can call (beneficiary typically); PDA signs via seeds for token transfer
- `close_vault()`: creator signs only

**Rationale:** Minimizes signature burden; PDA authority pattern is standard Solana practice; release can be triggered by anyone post-unlock (permissionless).

### Close Vault Instruction
**Decision:** Add `close_vault()` to reclaim rent after release completes.  
**Rationale:** Returns SOL rent to creator; cleans up on-chain state; standard lifecycle pattern; requires `released==true` and `amount_locked==0` for safety.

### Stack Optimization
**Decision:** Keep account structs minimal; avoid large stack allocations in handlers.  
**Rationale:** Solana stack limit is 4KB; previous attempt to combine create+deposit hit stack overflow; two-step flow is necessary.

### Vault ID Tracking
**Decision:** Store `vault_id` in Vault struct; use for PDA derivation in all instructions.  
**Rationale:** Fixes PDA derivation bugs; ensures consistent addressing across create/deposit/release/close; counter increments once during create.

### USDC Mint Enforcement
**Decision:** Validate `usdc_mint == config.usdc_mint` in all token operations; use Anchor constraints where possible.  
**Rationale:** Prevents wrong-token attacks; enforces allowlist; critical security invariant per brief.

### Checked Math
**Decision:** Use `.checked_add()` for all arithmetic; return `Overflow` error on failure.  
**Rationale:** Prevents integer overflow attacks; Rust best practice; explicit error handling.
