# Phase 2: Localnet Deployment & Testing Plan

**Goal:** Deploy Anchor program to localnet and wire up real on-chain transactions

**Approach:** Similar to Gates A-E, we'll break this into reviewable checkpoints

---

## Checkpoint 1: Environment Setup & Build

**Goal:** Install toolchain and build the program

### Tasks
- [ ] Install Solana CLI (if not installed)
- [ ] Install Rust BPF toolchain
- [ ] Configure Solana CLI for localnet
- [ ] Build program with `anchor build` or `cargo build-sbf`
- [ ] Verify program compiles successfully
- [ ] Generate program keypair

### Commands
```bash
# Install Solana (if needed)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Configure for localnet
solana config set --url localhost

# Build program
cd programs/keepr-vault
anchor build
# OR
cargo build-sbf
```

### Acceptance
- ✅ Solana CLI installed
- ✅ Program builds without errors
- ✅ .so file generated in target/deploy/
- ✅ Program keypair exists

### Artifacts
- Build output logs
- Program .so file
- Program keypair JSON

---

## Checkpoint 2: Localnet Deployment

**Goal:** Start validator and deploy program

### Tasks
- [ ] Start local Solana validator
- [ ] Airdrop SOL to deployer wallet
- [ ] Deploy program to localnet
- [ ] Verify deployment
- [ ] Get deployed program ID
- [ ] Update IDL with program ID

### Commands
```bash
# Start validator (separate terminal)
solana-test-validator

# Airdrop SOL
solana airdrop 10

# Deploy program
anchor deploy
# OR
solana program deploy target/deploy/keepr_vault.so

# Get program ID
solana address -k target/deploy/keepr_vault-keypair.json
```

### Acceptance
- ✅ Validator running
- ✅ Program deployed successfully
- ✅ Program ID obtained
- ✅ Program account exists on-chain

### Artifacts
- Deployment transaction signature
- Program ID
- Validator logs

---

## Checkpoint 3: Program Tests

**Goal:** Write and run comprehensive Anchor tests

### Tasks
- [ ] Set up test file structure
- [ ] Write test: Initialize config
- [ ] Write test: Create vault
- [ ] Write test: Deposit USDC
- [ ] Write test: Release funds (after time lock)
- [ ] Write test: Safety rails (caps, pause, mint validation)
- [ ] Write test: Error cases (invalid inputs, unauthorized access)
- [ ] Run all tests
- [ ] Verify 100% pass rate

### Test Structure
```typescript
// tests/keepr-vault.ts
describe("keepr-vault", () => {
  it("Initializes config", async () => { ... });
  it("Creates vault", async () => { ... });
  it("Deposits USDC", async () => { ... });
  it("Releases funds after unlock", async () => { ... });
  it("Enforces vault cap", async () => { ... });
  it("Respects pause switch", async () => { ... });
  it("Validates USDC mint", async () => { ... });
  it("Prevents early release", async () => { ... });
  it("Prevents unauthorized release", async () => { ... });
});
```

### Commands
```bash
# Run tests
anchor test

# Or with logs
anchor test -- --nocapture
```

### Acceptance
- ✅ All tests written
- ✅ All tests passing
- ✅ Edge cases covered
- ✅ Error cases handled

### Artifacts
- Test file (tests/keepr-vault.ts)
- Test output logs
- Coverage report

---

## Checkpoint 4: Web App Integration

**Goal:** Replace mock transactions with real Anchor calls

### Tasks
- [ ] Update .env with localnet program ID
- [ ] Update RPC endpoint to localhost
- [ ] Remove mock transaction delays
- [ ] Implement real `create_vault` call
- [ ] Implement real `deposit_usdc` call
- [ ] Implement real `release` call
- [ ] Add proper error handling
- [ ] Test transaction signing
- [ ] Verify on-chain state changes

### Files to Update
- `web/.env.local` - Add program ID
- `web/app/_lib/solana.ts` - Update RPC
- `web/app/create/page.tsx` - Real create vault
- `web/app/vaults/[vaultPda]/release/page.tsx` - Real release

### Code Changes
```typescript
// Before (mock)
await new Promise(resolve => setTimeout(resolve, 2500));
const mockSig = 'mock_signature_' + Date.now();

// After (real)
const tx = await program.methods
  .createVault(name, unlockUnix, beneficiaryPubkey)
  .accounts({ ... })
  .rpc();
```

### Acceptance
- ✅ Real transactions executing
- ✅ Vaults created on-chain
- ✅ USDC deposited
- ✅ Funds released after unlock
- ✅ Explorer links work

### Artifacts
- Updated code
- Transaction signatures
- On-chain vault accounts

---

## Checkpoint 5: End-to-End Testing

**Goal:** Test complete user flow on localnet

### Test Scenarios

**Scenario 1: Happy Path**
1. Connect wallet
2. Create vault (name, amount, unlock time, beneficiary)
3. Confirm transaction
4. Verify vault appears in dashboard
5. View vault details
6. Wait for unlock time (or manipulate clock)
7. Release funds
8. Verify funds transferred

**Scenario 2: Edge Cases**
1. Try to release before unlock → Should fail
2. Try to exceed vault cap → Should fail
3. Try with invalid beneficiary → Should fail
4. Try with paused config → Should fail
5. Try with wrong USDC mint → Should fail

**Scenario 3: Multiple Vaults**
1. Create 3 vaults with different unlock times
2. Verify all appear in dashboard
3. Release them in order
4. Verify state updates

### Acceptance
- ✅ All scenarios pass
- ✅ No console errors
- ✅ Proper error messages
- ✅ State updates correctly
- ✅ Explorer links valid

### Artifacts
- Test checklist (completed)
- Screenshots/videos
- Transaction signatures
- Bug reports (if any)

---

## Checkpoint 6: Documentation & Handoff

**Goal:** Document setup and prepare for mainnet

### Tasks
- [ ] Update README with localnet instructions
- [ ] Document program ID
- [ ] Document test results
- [ ] Create deployment guide
- [ ] List known issues
- [ ] Update CHANGELOG
- [ ] Prepare mainnet checklist

### Documents to Create
- LOCALNET_DEPLOYMENT.md
- LOCALNET_TEST_RESULTS.md
- MAINNET_CHECKLIST.md

### Acceptance
- ✅ All docs updated
- ✅ Deployment reproducible
- ✅ Tests documented
- ✅ Ready for mainnet

### Artifacts
- Documentation files
- Deployment guide
- Test results
- Mainnet checklist

---

## Timeline Estimate

- **Checkpoint 1:** 30 min (setup & build)
- **Checkpoint 2:** 20 min (deploy)
- **Checkpoint 3:** 90 min (write tests)
- **Checkpoint 4:** 60 min (web integration)
- **Checkpoint 5:** 45 min (E2E testing)
- **Checkpoint 6:** 30 min (docs)

**Total:** ~4.5 hours

---

## Prerequisites

### Required
- Solana CLI installed
- Rust toolchain
- Anchor framework
- Node.js & npm
- Phantom wallet with devnet/localnet support

### Nice to Have
- Solana Explorer (local)
- Transaction inspector
- Log viewer

---

## Success Criteria

✅ Program deployed to localnet  
✅ All tests passing  
✅ Web app using real transactions  
✅ Complete user flow works  
✅ Edge cases handled  
✅ Documentation complete  

---

## Next Steps After Completion

1. Review and fix any issues
2. Security audit of program code
3. Answer outstanding questions (QUESTIONS.md)
4. Prepare for mainnet deployment
5. Set up monitoring/alerting

---

**Ready to start with Checkpoint 1: Environment Setup & Build?**
