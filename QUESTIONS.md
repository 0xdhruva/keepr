# Open Questions

**Format:** `[YYYY-MM-DD] Question — Context — Proposed Default`

---

## 2025-09-30

### Xcode License Agreement
**Question:** Can you accept the Xcode license agreement to enable Rust compilation?  
**Context:** macOS requires Xcode license acceptance for C compiler (cc) which Rust uses for linking. This blocks all Rust/Anchor compilation.  
**Proposed Action:** Run `sudo xcodebuild -license` and type `agree`. This is a one-time setup and enables all Rust tooling.

---

## 2025-09-30 (Earlier)

### Mainnet RPC Provider
**Question:** Which RPC provider should we use for mainnet?  
**Context:** Need reliable, rate-limit-friendly RPC for production. Options: Helius, QuickNode, Alchemy, public endpoint.  
**Proposed Default:** Helius (generous free tier, good Solana support). Will use public endpoint in .env.example with note to upgrade.

### Multisig Address
**Question:** What is the multisig address for program upgrade authority?  
**Context:** Need to set as upgrade authority before mainnet deploy.  
**Proposed Default:** Will use deployer wallet for initial deploy, then transfer to multisig once provided. Document in .env.example.

### Initial Per-Vault Cap
**Question:** Confirm 500 USDC per-vault cap for Week-1?  
**Context:** Brief suggests 500 USDC (500000000 base units with 6dp).  
**Proposed Default:** 500 USDC as specified. Can adjust via `update_config` if needed.

### MIN_UNLOCK_BUFFER
**Question:** Confirm 300 seconds (5 minutes) minimum unlock buffer?  
**Context:** Brief specifies 300 seconds; prevents accidental immediate unlocks.  
**Proposed Default:** 300 seconds as specified.

### Mainnet USDC Mint Address
**Question:** Confirm mainnet USDC mint address?  
**Context:** Need correct address for Config initialization.  
**Proposed Default:** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (Circle's USDC on Solana mainnet).

### Demo Event Details
**Question:** When/where is Token2049 or target demo event?  
**Context:** Brief mentions Token2049 as primary use case; affects timeline urgency.  
**Proposed Default:** Proceed with implementation; can adjust timeline once event date confirmed.

### Theme Preference
**Question:** Dark mode, light mode, or both?  
**Context:** "Could-Have" in MoSCoW; affects initial design.  
**Proposed Default:** Start with dark mode (crypto-native preference), add light mode toggle if time permits.

### Error Tracking
**Question:** Should we integrate error tracking (Sentry, etc.)?  
**Context:** Helpful for production monitoring but adds complexity.  
**Proposed Default:** Skip for Week-1; add in future sprint if needed. Use console logging for now.

---

## Resolved

_(Questions will move here once answered)_
