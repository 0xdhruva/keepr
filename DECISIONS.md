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
