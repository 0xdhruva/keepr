# CRITICAL: Program Architecture Bug

## The Problem

There is an **encoding inconsistency** in the program's PDA derivation that will break ALL instructions after vault creation.

## Evidence

### CreateVault (lib.rs:352)
```rust
seeds = [b"vault", creator.key().as_ref(), &(counter.last_id + 1).to_le_bytes()]
//                                          ^^^^^^^^^^^^^^^^^^^^^^^
//                                          counter.last_id is u64 → 8 bytes
```

### DepositUsdc (lib.rs:383)
```rust
seeds = [b"vault", creator.key().as_ref(), &vault.vault_id.to_le_bytes()]
//                                          ^^^^^^^^^^^^^^^^^^^
//                                          vault.vault_id is u32 → 4 bytes
```

### CheckIn, Release, CloseVault
Same pattern - all use `vault.vault_id.to_le_bytes()` which is **u32 → 4 bytes**.

## Type Definitions

```rust
pub struct VaultCounter {
    pub last_id: u64,  // ← 8 bytes
}

pub struct Vault {
    pub vault_id: u32,  // ← 4 bytes
    // ...
}
```

## Why This Breaks Everything

1. **CreateVault** derives PDA using: `u64 vault_id` (8 bytes)
2. Stores in vault: `vault.vault_id = vault_id as u32` (truncates to 4 bytes)
3. **DepositUsdc, CheckIn, Release, CloseVault** all derive PDA using: `u32 vault_id` (4 bytes)
4. **PDAs will NEVER match!**

Example with vault_id = 10:
- CreateVault PDA seeds: `["vault", creator, 0x0A00000000000000]` (8 bytes)
- DepositUsdc PDA seeds: `["vault", creator, 0x0A000000]` (4 bytes)
- Result: **Different PDAs!**

## Impact

**After CreateVault succeeds:**
- DepositUsdc will fail with ConstraintSeeds error
- CheckIn will fail
- Release will fail
- CloseVault will fail

**The vault will be permanently locked and unusable!**

## Root Cause

The program has mixed types:
- Counter uses u64 for scalability (can have >4 billion vaults)
- Vault stores u32 (assumes <4 billion vaults per creator)
- Seeds derivation is inconsistent between instructions

## The Fix

The program must be consistent. Two options:

### Option A: Use u64 everywhere
```rust
// In Vault struct
pub vault_id: u64,  // Change from u32 to u64

// All seeds become 8 bytes
seeds = [b"vault", creator.key().as_ref(), &vault.vault_id.to_le_bytes()]
```

### Option B: Use u32 everywhere
```rust
// In VaultCounter
pub last_id: u32,  // Change from u64 to u32

// CreateVault seeds
seeds = [b"vault", creator.key().as_ref(), &((counter.last_id + 1) as u32).to_le_bytes()]

// All seeds become 4 bytes
seeds = [b"vault", creator.key().as_ref(), &vault.vault_id.to_le_bytes()]
```

**Recommendation: Option A** - Keep u64 for future scalability, change vault.vault_id to u64.

## Current Deployment Status

The program is deployed to devnet with this bug. Counter is at last_id = 9, meaning 9 vaults were created but likely all are broken (deposit/release/check-in won't work).

## Immediate Action Required

1. Fix the program code (change vault.vault_id to u64)
2. Redeploy to devnet with new program ID
3. Update all client code to use 8-byte encoding
4. DO NOT deploy to mainnet with this bug
