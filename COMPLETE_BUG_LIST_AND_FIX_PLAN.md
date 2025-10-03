# Complete Bug List & Fix Plan

## All Bugs Found (7 Total)

### CRITICAL BUGS (3)

#### Bug #1: PDA Encoding Inconsistency
**Location:** `programs/keepr-vault/src/lib.rs`
- **Lines:** 352 (CreateVault) vs 383, 419, 435, 475 (all other instructions)
- **Issue:** CreateVault uses u64 (8 bytes), others use u32 (4 bytes)
- **Impact:** **ALL vaults permanently broken** - cannot deposit, check-in, release, or close
- **Evidence:** 9 vaults on devnet, all created with u64, all inaccessible

**Fix:**
```rust
// Change Vault struct (line ~528)
pub vault_id: u64,  // Change from u32 to u64

// All seeds become consistent (8 bytes everywhere)
```

---

#### Bug #2: Client PDA Derivation - Off by One
**Location:** `web/app/create/page.tsx:170-182`
- **Issue:** Uses `counter.last_id` instead of `counter.last_id + 1`
- **Impact:** Client derives wrong PDA, transaction fails with ConstraintSeeds

**Fix:**
```typescript
let nextVaultId = 1;  // ✅ First vault is ID 1
if (counterAccount) {
  const lastId = Number(...);
  nextVaultId = lastId + 1;  // ✅ Must add 1
}
```

---

#### Bug #3: Client PDA Derivation - Wrong Encoding
**Location:** `web/app/create/page.tsx:186-193`
- **Issue:** Uses u32 (4 bytes) instead of u64 (8 bytes)
- **Impact:** Client derives wrong PDA even with correct ID

**Fix:**
```typescript
const vaultIdBuffer = Buffer.alloc(8);  // ✅ 8 bytes for u64
vaultIdBuffer.writeBigUInt64LE(BigInt(nextVaultId), 0);  // ✅ u64
```

---

### CRITICAL BUGS (Cont.)

#### Bug #4: Release Page - Wrong Beneficiary
**Location:** `web/app/vaults/[vaultPda]/release/page.tsx:143`
- **Issue:** Passes current user's pubkey instead of vault's beneficiary
- **Impact:** Release will fail if current user is not the beneficiary (which is the whole point!)

**Current (WRONG):**
```typescript
beneficiary: publicKey,  // ❌ Current user
```

**Fix:**
```typescript
beneficiary: beneficiaryKey,  // ✅ Actual beneficiary from vault
```

---

### MEDIUM BUGS (2)

#### Bug #5: Counter init_if_needed Race Condition
**Location:** `programs/keepr-vault/src/lib.rs:340-345`
- **Issue:** Two concurrent txs can both initialize counter with last_id = 0
- **Impact:** Vault ID collision, potential fund loss

**Fix:**
```rust
// Option A: Add validation
if counter.last_id == 0 && vault_id != 1 {
    return err!(KeeprError::CounterNotInitialized);
}

// Option B: Remove init_if_needed, require explicit init
#[account(init, ...)]  // Fails if exists
```

---

#### Bug #6: Unsafe u64 to u32 Cast
**Location:** `programs/keepr-vault/src/lib.rs:106`
- **Issue:** Silent truncation if vault_id > 2^32
- **Impact:** Vault collision after 4 billion vaults

**Fix:**
```rust
vault.vault_id = u64::try_from(vault_id)
    .map_err(|_| KeeprError::VaultIdOverflow)?;

// Or better: use u64 everywhere (see Bug #1)
```

---

### LOW BUGS (1)

#### Bug #7: Missing Validation for Dead Man's Switch Params
**Location:** `web/app/_lib/validation.ts`
- **Issue:** No validation for notificationWindowSeconds and gracePeriodSeconds
- **Impact:** User could set invalid values (0, negative, or > unlock period)

**Fix:**
```typescript
export function validateDeadManSwitch(
  unlockTime: string,
  notificationWindowSeconds: number,
  gracePeriodSeconds: number
): ValidationError | null {
  const unlockUnix = Math.floor(new Date(unlockTime).getTime() / 1000);
  const nowUnix = Math.floor(Date.now() / 1000);
  const vaultPeriod = unlockUnix - nowUnix;

  if (notificationWindowSeconds <= 0) {
    return { field: 'notificationWindow', message: 'Must be greater than 0' };
  }

  if (gracePeriodSeconds <= 0) {
    return { field: 'gracePeriod', message: 'Must be greater than 0' };
  }

  if (notificationWindowSeconds > vaultPeriod) {
    return { field: 'notificationWindow', message: 'Cannot be longer than vault period' };
  }

  return null;
}
```

---

## Additional Issues (Not Bugs, But Important)

### Issue #8: No Program-Side Validation for Dead Man's Switch
**Location:** `programs/keepr-vault/src/lib.rs:61-120`
- **Issue:** Program doesn't validate notification_window_seconds and grace_period_seconds
- **Impact:** User could pass 0 or invalid values, breaking check-in logic

**Fix:**
```rust
// In create_vault
require!(
    notification_window_seconds > 0 && notification_window_seconds < vault_period_seconds,
    KeeprError::InvalidNotificationWindow
);

require!(
    grace_period_seconds > 0,
    KeeprError::InvalidGracePeriod
);
```

---

### Issue #9: Vault Lookup Problem
**Current:** Client cannot find vaults by creator (no reverse lookup)
**Impact:** Users can't see their vaults after page refresh

**Solutions:**
- Option A: Event indexing (index VaultCreated events)
- Option B: getProgramAccounts filtering (expensive)
- Option C: Local storage tracking (current approach, fragile)

**Recommendation:** Implement event indexing in Phase 2

---

## Fix Plan - Comprehensive

### Phase 1: Critical Program Fixes (HIGH PRIORITY)
**Estimated time: 3-4 hours**

1. **Fix vault_id type**
   - [ ] Change `pub vault_id: u32` to `pub vault_id: u64` in Vault struct
   - [ ] Remove unsafe cast at line 106
   - [ ] Ensure all seeds use u64 consistently

2. **Fix counter race condition**
   - [ ] Add validation: if last_id == 0, vault_id must be 1
   - [ ] OR: Change to explicit init (remove init_if_needed)

3. **Add dead man's switch validation**
   - [ ] Validate notification_window_seconds > 0 and < vault_period
   - [ ] Validate grace_period_seconds > 0

4. **Build and test program**
   - [ ] `cargo build-sbf` or `anchor build`
   - [ ] Write unit test for PDA consistency
   - [ ] Verify no stack overflow

---

### Phase 2: Critical Client Fixes (HIGH PRIORITY)
**Estimated time: 2-3 hours**

5. **Fix client PDA derivation**
   - [ ] Change `nextVaultId = lastId` to `nextVaultId = lastId + 1`
   - [ ] Change to u64 encoding (8 bytes, BigUint64)
   - [ ] Update all vault PDA derivations (create, release, checkin)

6. **Fix release page**
   - [ ] Change `beneficiary: publicKey` to `beneficiary: beneficiaryKey`

7. **Add client-side validation**
   - [ ] Add validateDeadManSwitch function
   - [ ] Integrate into vault form validation

8. **Update instructions.ts**
   - [ ] Verify all encoding helpers are correct
   - [ ] Ensure nameHash uses proper array encoding

---

### Phase 3: Deployment & Testing (HIGH PRIORITY)
**Estimated time: 2-3 hours**

9. **Deploy to fresh devnet**
   - [ ] Deploy program with new program ID
   - [ ] Initialize config account
   - [ ] Update .env.local with new PROGRAM_ID

10. **Update IDL**
    - [ ] Copy new IDL from target/idl/keepr_vault.json
    - [ ] Update web/app/_lib/keepr_vault.json
    - [ ] Verify discriminators match

11. **End-to-end testing**
    - [ ] Create vault (should succeed)
    - [ ] Deposit USDC (should succeed - CRITICAL TEST)
    - [ ] Check-in (should succeed - CRITICAL TEST)
    - [ ] Release after grace period (should succeed - CRITICAL TEST)
    - [ ] Close vault (should succeed)

---

### Phase 4: Quality Improvements (MEDIUM PRIORITY)
**Estimated time: 3-4 hours**

12. **Write comprehensive tests**
    - [ ] Program unit tests for each instruction
    - [ ] PDA derivation consistency tests
    - [ ] Client integration tests
    - [ ] Concurrent creation stress test

13. **Improve error handling**
    - [ ] Add user-friendly error messages in client
    - [ ] Map Anchor errors to readable messages
    - [ ] Add retry logic for transient failures

14. **Documentation**
    - [ ] Update DECISIONS.md with architectural fixes
    - [ ] Document PDA derivation logic
    - [ ] Add deployment checklist

---

### Phase 5: Future Enhancements (LOW PRIORITY)
**Estimated time: 4-6 hours**

15. **Event indexing**
    - [ ] Set up event listener
    - [ ] Index VaultCreated events
    - [ ] Build vault discovery API

16. **Monitoring & Analytics**
    - [ ] Track counter growth
    - [ ] Monitor vault states
    - [ ] Alert on unusual patterns

---

## Testing Checklist

### Before Deployment
- [ ] All unit tests pass
- [ ] PDA derivation verified with test script
- [ ] Stack usage documented (< 3500 bytes)
- [ ] No unsafe type casts
- [ ] All error paths tested

### After Deployment (Devnet)
- [ ] Config initialized successfully
- [ ] First vault creation succeeds
- [ ] Deposit works on created vault (**CRITICAL**)
- [ ] Check-in works during notification window
- [ ] Release works after grace period
- [ ] Close vault succeeds after release
- [ ] Concurrent vault creation handled correctly

### Before Mainnet
- [ ] All devnet tests pass
- [ ] Security audit completed
- [ ] Upgrade authority configured
- [ ] Emergency procedures documented
- [ ] User funds recovery plan in place

---

## Risk Assessment

### Current State (Devnet)
- **9 broken vaults** - Cannot be recovered
- **Counter at 9** - Already has state
- **No user funds at risk** - Devnet only

### If Deployed to Mainnet (Current Code)
- **100% fund loss** - All vaults would be permanently locked
- **No recovery possible** - PDA mismatch is unfixable
- **Critical severity** - Would require emergency shutdown

### After Fixes
- **High confidence** - Architecture sound
- **Well tested** - Comprehensive test coverage
- **Safe for mainnet** - All critical bugs resolved

---

## Execution Order

**Do NOT skip steps or change order:**

1. ✅ Fix program (Phase 1)
2. ✅ Fix client (Phase 2)
3. ✅ Deploy & test (Phase 3)
4. ⚠️ Quality improvements (Phase 4)
5. 📋 Future enhancements (Phase 5)

**Critical path: Steps 1-3 must be completed before mainnet consideration**

---

## Summary

**Total bugs: 7**
- Critical: 4 (PDA encoding, off-by-one, wrong encoding, wrong beneficiary)
- Medium: 2 (race condition, unsafe cast)
- Low: 1 (missing validation)

**Total issues: 2**
- Program validation gaps
- Vault lookup limitations

**Estimated fix time: 10-14 hours total**
- Critical fixes: 7-10 hours
- Quality improvements: 3-4 hours

**Next step: Begin Phase 1 - Critical Program Fixes**
