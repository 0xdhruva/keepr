# Risk Register

**Format:** `[Risk] — Likelihood / Impact — Mitigation`

---

## Mainnet Exposure Risks

### Funds Loss via Program Bug
**Likelihood:** Low (with testing) / **Impact:** Critical  
**Mitigation:**
- Comprehensive localnet unit/integration tests before mainnet deploy
- Per-vault cap (500 USDC) limits blast radius
- Pause switch allows immediate halt if issue discovered
- Program upgradeable under multisig for emergency fixes
- No admin path to user funds (architectural safeguard)
- Use only audited primitives (SPL Token, ATA, System, Clock)

### Incorrect USDC Mint
**Likelihood:** Low / **Impact:** High  
**Mitigation:**
- USDC mint address hardcoded in Config PDA
- Validated on every relevant instruction
- Client-side checks before transaction submission
- Documented in .env.example with correct mainnet USDC mint

### Premature Release
**Likelihood:** Low / **Impact:** High  
**Mitigation:**
- On-chain time check: `Clock::get()?.unix_timestamp >= vault.unlock_unix`
- Client disables Release button until unlock time
- One-way `released` flag prevents double-spend
- Integration tests verify time-lock enforcement

### Cap Exceeded
**Likelihood:** Medium / **Impact:** Medium  
**Mitigation:**
- On-chain check: `amount_locked + amount <= config.max_lock_per_vault`
- Client-side validation before transaction
- Clear error message to user
- Admin can adjust cap via `update_config` if needed

### Paused State Confusion
**Likelihood:** Low / **Impact:** Low  
**Mitigation:**
- Client checks `config.paused` before showing Create form
- Clear UI message when paused
- Existing vaults unaffected (can still release)
- Admin-only control

---

## Technical Risks

### RPC Rate Limits
**Likelihood:** Medium / **Impact:** Medium  
**Mitigation:**
- Use paid RPC provider (Helius, QuickNode)
- Implement client-side caching (localStorage)
- React Query deduplicates requests
- Exponential backoff on failures

### Wallet Connection Failures
**Likelihood:** Medium / **Impact:** Medium  
**Mitigation:**
- Clear instructions for Phantom mobile browser
- Graceful error handling with retry prompts
- Support both desktop extension and mobile in-app browser
- Fallback messaging if wallet not detected

### Transaction Failures
**Likelihood:** Medium / **Impact:** Medium  
**Mitigation:**
- Client-side validation reduces invalid transactions
- Clear error messages for common failures (insufficient SOL, insufficient USDC)
- Transaction retry mechanism
- Display transaction signature for debugging

### Local Storage Loss
**Likelihood:** Medium / **Impact:** Low  
**Mitigation:**
- All critical data on-chain (vault state, balances)
- localStorage only for non-critical metadata (labels, cache)
- Vault discovery via on-chain fetch (getProgramAccounts)
- User can rebuild cache from chain

### Clock Drift
**Likelihood:** Low / **Impact:** Low  
**Mitigation:**
- Unlock time checked on-chain (authoritative)
- Client countdown is UX only
- Release instruction will fail if called too early

---

## User Experience Risks

### Incorrect Beneficiary Address
**Likelihood:** Medium / **Impact:** High  
**Mitigation:**
- Client validates Solana address format (base58, length)
- Review screen shows beneficiary before confirmation
- Clear warning about irreversibility
- Consider checksum/confirmation in future sprint

### Insufficient USDC Balance
**Likelihood:** Medium / **Impact:** Low  
**Mitigation:**
- Client checks user USDC balance before transaction
- Clear error message with current balance
- Suggest amount adjustment

### Insufficient SOL for Fees
**Likelihood:** Medium / **Impact:** Low  
**Mitigation:**
- Client checks SOL balance for rent + fees
- Clear error message
- Estimate and display required SOL

### Unlock Time Too Short
**Likelihood:** Low / **Impact:** Low  
**Mitigation:**
- Enforce MIN_UNLOCK_BUFFER (300 seconds default)
- Client validation before transaction
- Clear error message with minimum time

### Mobile UX Issues
**Likelihood:** Medium / **Impact:** Medium  
**Mitigation:**
- Responsive design tested on mobile
- Clear instructions to use Phantom in-app browser
- Touch-friendly UI elements
- Test on iOS and Android

---

## Operational Risks

### Multisig Key Management
**Likelihood:** Low / **Impact:** Critical  
**Mitigation:**
- Document multisig setup and key holders
- Test upgrade process on devnet first
- Clear procedures for emergency pause
- Backup key storage

### Program Upgrade Failures
**Likelihood:** Low / **Impact:** High  
**Mitigation:**
- Test upgrades on devnet
- Verify IDL compatibility
- Coordinate with web app deployment
- Rollback plan

### Vercel Deployment Issues
**Likelihood:** Low / **Impact:** Medium  
**Mitigation:**
- Preview deployments for testing
- Environment variables configured correctly
- Rollback to previous deployment if needed
- Monitor uptime

---

## Compliance & Legal Risks

### Regulatory Uncertainty
**Likelihood:** Medium / **Impact:** High  
**Mitigation:**
- No custody (user controls wallet)
- No backend/no KYC (Week-1)
- Clear disclaimers
- Legal review recommended before scaling

### Terms of Service
**Likelihood:** Low / **Impact:** Medium  
**Mitigation:**
- Add ToS and disclaimer before mainnet launch
- User accepts risks explicitly
- No guarantees on fund recovery

---

## Monitoring & Response

### Issue Detection
- Manual testing after each gate
- User feedback during demo events
- Transaction monitoring (success/failure rates)
- RPC error logging

### Incident Response
1. Assess severity (funds at risk? UX issue?)
2. If critical: invoke pause switch immediately
3. Investigate root cause
4. Deploy fix via multisig upgrade
5. Communicate with affected users
6. Document in CHANGELOG.md

### Escalation Path
- Critical (funds at risk): Immediate pause + multisig emergency meeting
- High (UX broken): Fix within 24h
- Medium (degraded UX): Fix in next sprint
- Low (cosmetic): Backlog
