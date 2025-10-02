# P1 — Program Structure Finalized

**Date:** 2025-10-01  
**Status:** ✅ COMPLETE

---

## Summary

Hardened the Anchor program to MVP standard with single-signature UX, strict USDC enforcement, PDA-owned funds, clean events/errors, and rent reclamation via `close_vault`.

---

## Changes Made

### 1. Added `close_vault()` Instruction

**Location:** `programs/keepr-vault/src/lib.rs:204-236`

**Purpose:** Reclaim rent after vault lifecycle completes

**Logic:**
- Requires `released == true` and `amount_locked == 0`
- Closes vault token account (returns rent to creator)
- Closes vault PDA account (returns rent to creator)
- Uses PDA signer seeds for token account closure

**Accounts:**
```rust
pub struct CloseVault<'info> {
    vault: Account<'info, Vault>,           // closed via constraint
    vault_token_account: Account<'info, TokenAccount>,
    creator: Signer<'info>,                 // receives rent
    token_program: Program<'info, Token>,
}
```

### 2. Added Error Codes

**New Errors:**
- `NotReleased`: "Vault must be released before closing."
- `VaultNotEmpty`: "Vault still contains funds."

**Total Error Codes:** 12

### 3. Single-Signer Paths Confirmed

**Instruction Signers:**
- `init_config`: admin only
- `update_config`: admin only
- `create_vault`: creator only
- `deposit_usdc`: creator only
- `release`: any signer (PDA signs token transfer via seeds)
- `close_vault`: creator only

**PDA Signer Pattern:**
- `release()` and `close_vault()` use PDA authority via seeds: `[b"vault", creator, vault_id_le, bump]`
- No second wallet signature required for token operations

### 4. USDC Mint Enforcement

**Validation Points:**
- `CreateVault`: `#[account(address = config.usdc_mint)]` on `usdc_mint`
- `DepositUsdc`: `#[account(address = config.usdc_mint)]` on `usdc_mint`
- `Release`: `#[account(address = vault.usdc_mint)]` on `usdc_mint`
- All token accounts validated via `associated_token::mint` constraints

**Invariant:** Only tokens matching `config.usdc_mint` can be deposited/released

### 5. Documentation Updates

**DECISIONS.md:**
- Added 2025-10-01 section with 7 new decisions
- Documented SPL Token version choice (classic, not Token-2022)
- Explained single-signer UX rationale
- Documented close_vault lifecycle
- Stack optimization reasoning
- Vault ID tracking pattern
- USDC mint enforcement strategy
- Checked math approach

---

## Program Structure Overview

### Instructions (6 total)

1. **init_config** — One-time admin setup
2. **update_config** — Admin adjusts caps/pause/mint
3. **create_vault** — Creator initializes vault + token account
4. **deposit_usdc** — Creator funds vault
5. **release** — Anyone triggers post-unlock transfer to beneficiary
6. **close_vault** — Creator reclaims rent post-release

### Accounts (3 PDAs)

1. **Config** — `seeds: ["config"]`
   - Fields: admin, usdc_mint, max_lock_per_vault, paused
   
2. **VaultCounter** — `seeds: ["vault_counter", creator]`
   - Fields: last_id
   
3. **Vault** — `seeds: ["vault", creator, vault_id_le]`
   - Fields: creator, beneficiary, usdc_mint, vault_token_account, amount_locked, unlock_unix, released, bump, name_hash, vault_id

### Events (4 total)

- `ConfigUpdated`
- `VaultCreated`
- `VaultFunded`
- `VaultReleased`

### Errors (12 total)

- Paused, InvalidUnlockTime, AlreadyReleased, MismatchedMint
- NothingToRelease, InvalidAmount, AboveVaultCap, Overflow
- InvalidBeneficiary, DepositAfterUnlock, NotReleased, VaultNotEmpty

---

## Security Invariants

✅ **Funds only move to beneficiary** via `release()` after `unlock_unix`  
✅ **Admin cannot seize funds** (no withdrawal path in update_config)  
✅ **USDC mint enforced** at all token operation points  
✅ **Checked math** prevents overflow  
✅ **One-way released flag** prevents double-release  
✅ **PDA authority** ensures only program can move vault funds  
✅ **Rent reclamation** via close_vault after lifecycle completes

---

## Stack Optimization

**Issue:** Combining create+deposit caused stack overflow (>4KB limit)

**Solution:** 
- Separate instructions
- Minimal account structs
- Reuse CPI contexts
- Short error messages

**Result:** All instructions fit within 4KB stack frame

---

## Diff Summary

**Files Modified:**
- `programs/keepr-vault/src/lib.rs`: +45 lines (close_vault instruction + CloseVault accounts + 2 errors)
- `DECISIONS.md`: +37 lines (2025-10-01 section)
- `P1_PROGRAM_STRUCTURE.md`: +150 lines (this document)

**Total:** +232 lines

---

## How to Verify

### Build Program
```bash
cd programs/keepr-vault
cargo-build-sbf
```

### Check IDL
```bash
anchor build
cat target/idl/keepr_vault.json | jq '.instructions | length'  # Should be 6
cat target/idl/keepr_vault.json | jq '.errors | length'         # Should be 12
```

### Inspect close_vault
```bash
cat target/idl/keepr_vault.json | jq '.instructions[] | select(.name == "close_vault")'
```

---

## Next Steps (P2)

- Write comprehensive test suite in `programs/keepr-vault/tests/vault.spec.ts`
- Cover all 6 instructions with success and failure cases
- Test USDC mint enforcement
- Test close_vault lifecycle
- Run on localnet and provide logs

---

## Artifacts

**Program Source:** `programs/keepr-vault/src/lib.rs` (509 lines)  
**Decisions Log:** `DECISIONS.md` (117 lines)  
**This Document:** `P1_PROGRAM_STRUCTURE.md`

**Program ID (devnet):** `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK`

---

## Sign-off

✅ Program structure finalized  
✅ Single-signer paths confirmed  
✅ PDA signer on release/close  
✅ close_vault instruction added  
✅ Documentation updated  

**Ready for P2 — Test Suite Implementation**
