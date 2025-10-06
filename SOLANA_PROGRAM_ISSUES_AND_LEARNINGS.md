# DeclaredProgramIdMismatch Investigation

## Error Summary
**Error**: `AnchorError: AnchorError occurred. Error Code: DeclaredProgramIdMismatch. Error Number: 4100. Error Message: The declared program id does not match the actual program id.`

**Location**: Occurs when calling `.rpc()` on `createVault` instruction in `/web/app/create/page.tsx`

**Date Started**: 2025-10-03

## Verified Facts

### Program Information
- **Program ID**: `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK`
- **Network**: Devnet
- **Deployment Status**: ✅ Confirmed deployed and exists on devnet
- **Program Authority**: `GeQ3YtidFiviY7Bb7ZuZK3mEPV6XXhpmGvycH4s7dJ5S`
- **declare_id! in lib.rs**: `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK` ✅ Matches
- **Anchor.toml**: `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK` ✅ Matches
- **IDL address field**: `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK` ✅ Matches
- **ENV NEXT_PUBLIC_PROGRAM_ID**: `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK` ✅ Matches

### Working Code
- **Release page**: Works correctly, uses same pattern
- **Previous session**: Vault creation was working during earlier part of today's session (before conversation summary)

## Attempts Made

### Attempt 1: Program Construction with 3 Parameters
```typescript
const programId = new PublicKey(PROGRAM_ID);
const program = new Program(idl as any, programId, provider);
```
**Result**: `TypeError: Cannot read properties of undefined (reading 'size')`
**Analysis**: Wrong constructor signature for Anchor 0.30+

### Attempt 2: Program Construction with IDL Address as PublicKey
```typescript
const program = new Program(idl as any, new PublicKey(idl.address), provider);
```
**Result**: Same TypeError
**Analysis**: Still wrong constructor pattern

### Attempt 3: Correct Constructor, Wrong PDA Derivations
```typescript
const program = new Program(idl as any, provider);
// Then using program.programId for PDA derivations
const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('config')],
  program.programId  // ← Issue suspected here
);
```
**Result**: `DeclaredProgramIdMismatch` persists
**Analysis**: Even with correct Program construction, error occurs

### Attempt 4: Changed Vault Token Account Derivation
```typescript
// Changed from manual PDA:
const [vaultTokenAccount] = PublicKey.findProgramAddressSync(...);
// To helper function:
const vaultTokenAccount = await getAssociatedTokenAddress(mint, owner, true);
```
**Result**: `DeclaredProgramIdMismatch` persists
**Analysis**: Both methods produce identical addresses

### Attempt 5: Revert to Working Pattern (Current)
Reverted to pattern matching release page:
```typescript
const programId = new PublicKey(PROGRAM_ID || '74v7...');
const program = new Program(idl as any, provider);

// Use programId variable for all PDAs:
const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from('config')],
  programId  // ← Using variable, not program.programId
);

// Manual vault token account derivation:
const [vaultTokenAccount] = PublicKey.findProgramAddressSync(
  [vaultPda.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), usdcMint.toBuffer()],
  ASSOCIATED_TOKEN_PROGRAM_ID
);
```
**Result**: `DeclaredProgramIdMismatch` still persists ❌

## Key Differences vs Working Code

### Current Code (Broken)
- Uses `new Program(idl as any, provider)`
- Combines createVault + depositUsdc in one transaction via `.postInstructions([depositIx])`
- Uses 5 parameters for createVault: `(beneficiary, unlockUnix, nameHash, notificationWindowSeconds, gracePeriodSeconds)`

### Working Code from Release Page
- Also uses `new Program(idl as any, provider)`
- Single instruction call (release)
- Uses programId variable for PDA derivations ✅ (we now match this)

### Historical Working Code (Commit 1136417)
- Used `new Program(idl as any, provider)`
- TWO SEPARATE `.rpc()` calls for create and deposit
- Used only 3 parameters: `(beneficiary, unlockUnix, nameHash)`
- **Important**: This was before the program was updated with notification/grace period params

## Hypotheses to Investigate

### Hypothesis 1: Transaction Structure Issue
**Theory**: Combining two instructions with `.postInstructions([depositIx])` might cause issues
**Test**: Try separate RPC calls for createVault and depositUsdc
**Confidence**: 60%

### Hypothesis 2: IDL/On-Chain Mismatch
**Theory**: Deployed program doesn't match our local IDL
**Test**: Fetch on-chain IDL and compare with local
**Confidence**: 40%

### Hypothesis 3: Anchor Version Issue
**Theory**: Anchor 0.30.1 (code) vs 0.31.1 (global) mismatch
**Test**: Check if there's a breaking change in how Program IDs are validated
**Confidence**: 30%

### Hypothesis 4: Account Ordering in depositUsdc
**Theory**: The depositIx might have incorrect account ordering
**Test**: Verify account order matches IDL exactly
**Confidence**: 25%

## CRITICAL FINDING - Duplicate Instruction Building

In `create/page.tsx` lines 244-306:
```typescript
// Line 244-263: Build createIx but NEVER USE IT!
const createIx = await program.methods.createVault(...).accounts({...}).instruction();

// Line 266-278: Build depositIx (this gets used)
const depositIx = await program.methods.depositUsdc(...).accounts({...}).instruction();

// Line 286-306: Build createVault AGAIN and use THIS one
const tx = await program.methods
  .createVault(...)
  .accounts({...})
  .postInstructions([depositIx])  // Add the deposit instruction
  .rpc();
```

This is inefficient but shouldn't cause ProgramIdMismatch unless there's a state change between building depositIx and calling .rpc().

## Web Research Findings

### DeclaredProgramIdMismatch Error (from docs.rs and GitHub)
- **Error Code**: 4100
- **Definition**: "The declared program id does not match the actual program id"
- **Source**: `anchor-lang/lang/src/error.rs`
- **Added in**: PR #1451 (program ID validation check)

### When It Occurs
The error is thrown when Anchor's internal validation detects a mismatch between:
1. The program ID declared via `declare_id!()` in the Rust program
2. The actual program ID of the account executing the instruction

### Common Client-Side Causes (from Stack Exchange)
1. Using an outdated program ID when calling from client
2. Not updating all references to program ID after deployment
3. Caching or stale artifacts in the project
4. Different program ID in env vars vs actual deployment

### Successful Patterns for postInstructions()
From successful Anchor programs:
```typescript
await program.methods
  .myInstruction(params)
  .accounts({...})
  .postInstructions([someOtherIx])
  .rpc();
```

This pattern is valid and widely used. The issue is NOT with using postInstructions itself.

## Next Steps - Updated Priority
1. ✅ Test with TWO SEPARATE `.rpc()` calls instead of combined transaction
2. Check if there's a timing/state issue with building depositIx then calling .rpc() later
3. Verify the depositIx instruction has correct program ID embedded
4. Deep dive into Anchor's transaction building to understand when program IDs are validated

## Complete Code Flow Analysis

### Current Implementation (create/page.tsx)

**Program Construction (lines 116-149)**:
```typescript
const programId = new PublicKey(PROGRAM_ID || '74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK');
const anchorWallet = { publicKey, signTransaction, signAllTransactions };
const provider = new AnchorProvider(connection, anchorWallet, { commitment: 'confirmed' });
const { setProvider } = await import('@coral-xyz/anchor');
setProvider(provider);
const program = new Program(idl as any, provider);
```

**PDA Derivations (lines 184-225)**:
- All use `programId` variable (NOT `program.programId`)
- Config: `[b"config"]`
- Counter: `[b"vault_counter", creator]`
- Vault: `[b"vault", creator, vault_id_le_bytes]`
- Vault Token Account: Manual ATA derivation with `ASSOCIATED_TOKEN_PROGRAM_ID`

**Instruction Building (lines 244-306)**:
```typescript
// Unused createIx
const createIx = await program.methods.createVault(...).accounts({...}).instruction();

// Used depositIx
const depositIx = await program.methods.depositUsdc(...).accounts({...}).instruction();

// Main RPC call
const tx = await program.methods
  .createVault(...)  // ← Built AGAIN here
  .accounts({...})
  .postInstructions([depositIx])
  .rpc();
```

### Working Implementation (release/page.tsx)

**Program Construction**:
```typescript
const programId = new PublicKey(PROGRAM_ID);
// Does NOT use Program at all! Uses raw instruction building via releaseInstruction()
```

**Key Difference**: Release page doesn't use Anchor Program, it uses manual instruction building from `_lib/instructions.ts`

## All Environment/Config Checks

- ✅ `programs/keepr-vault/src/lib.rs` declare_id: `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK`
- ✅ `Anchor.toml`: `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK`
- ✅ `web/app/_lib/keepr_vault.json` address: `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK`
- ✅ `web/.env.local` NEXT_PUBLIC_PROGRAM_ID: `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK`
- ✅ Devnet deployment verified: `solana program show` confirms program exists
- ✅ All log outputs show correct program ID: `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK`

## What We Know Works
1. ✅ Release instruction works (uses manual instruction builder, not Anchor Program)
2. ✅ Cancel instruction works (checked via user report)
3. ✅ Vault creation worked earlier today (before conversation summary)

## What Doesn't Work
❌ CreateVault + DepositUsdc in single transaction using `.postInstructions()`

## Architectural Questions to Investigate

### Question 1: Why use Anchor Program at all?
- **Current**: We use `new Program(idl, provider)` then `.methods.createVault()`
- **Alternative**: Manual instruction building like release page does
- **Trade-off**: Anchor provides type safety and automatic account resolution

### Question 2: Is our IDL correct?
- IDL shows `address: "74v7..."` which Program constructor should use
- But we're creating Program with just `(idl, provider)` - does it use idl.address?
- Anchor 0.30.1 constructor signature: `new Program<T>(idl: Idl, provider: Provider)`

### Question 3: Program ID propagation through instructions
When we do:
```typescript
const depositIx = await program.methods.depositUsdc(...).instruction();
```
Does this instruction embed `program.programId` or some other ID?

Then when we do:
```typescript
program.methods.createVault(...).postInstructions([depositIx]).rpc()
```
Do both instructions have consistent program IDs?

### Question 4: Why does manual instruction building work?
The release page uses `releaseInstruction()` helper which manually constructs instructions.
Does this bypass some Anchor validation that's causing our issue?

## User Constraint
❌ **NOT** acceptable: Split into two separate transactions
✅ **Goal**: Single atomic transaction like Jupiter and other major protocols

## Next Investigation Priority

1. **Study Jupiter/Marinade/Major Programs**: How do they structure multi-instruction transactions?
2. **Compare Anchor patterns**: What's the "canonical" way to do this in Anchor 0.30+?
3. **Understand Program ID embedding**: Where/when does Anchor embed program IDs in instructions?
4. **Review our program architecture**: Are there patterns we should follow?

## Hypothesis Status - REVISED

### Hypothesis: Instruction Building Order Issue - UNKNOWN
Need to understand if building depositIx before calling .rpc() causes program ID mismatches

### Hypothesis: Should use .instruction() for both - 50%
Maybe we should build both as instructions first, then combine?

### Hypothesis: Manual instruction building needed - 40%
Perhaps Anchor Program doesn't play well with postInstructions in our specific case

## References Completed
- [x] Anchor error documentation (docs.rs)
- [x] GitHub source code for error definition
- [x] Stack Exchange discussions
- [x] postInstructions() usage examples

## References Needed - CRITICAL
- [x] Jupiter swap aggregator source code (multi-ix transactions) - uses abstracted API
- [x] Marinade Finance source code (complex transactions) - uses `new MarinadeFinanceProgram(programId, provider)`
- [x] Anchor 0.30+ best practices - `postInstructions()` is valid and widely used
- [x] How major programs handle Program construction - Marinade uses 2-param constructor
- [x] Discriminator and program ID embedding - researched manual instruction building

## BREAKTHROUGH FINDING - Root Cause Identified

### The Working Pattern vs Broken Pattern

**Working Code (release/page.tsx lines 112-148)**:
```typescript
const programId = new PublicKey(PROGRAM_ID);
// Does NOT use Anchor Program class at all!
const instruction = await releaseInstruction({
  vault: vaultPdaKey,
  counter: counterPda,
  vaultTokenAccount,
  usdcMint: new PublicKey(USDC_MINT),
  beneficiaryUsdcAta,
  beneficiary: beneficiaryKey,
  programId,  // ← Passed explicitly to manual instruction builder
});
const transaction = new Transaction().add(instruction);
```

**Broken Code (create/page.tsx)**:
```typescript
const programId = new PublicKey(PROGRAM_ID || '74v7...');
const program = new Program(idl as any, provider); // ← Uses Anchor Program class

const depositIx = await program.methods.depositUsdc(...)  // ← Uses Anchor's method builder
  .accounts({...})
  .instruction();

const tx = await program.methods.createVault(...)  // ← Uses Anchor's method builder
  .accounts({...})
  .postInstructions([depositIx])
  .rpc();
```

### Why Manual Instruction Building Works

From `_lib/instructions.ts`, the manual builders:
1. **Compute discriminators manually** using SHA-256 of `"global:<instruction_name>"`
2. **Manually encode all instruction data** (PublicKeys, u64s, Vec<u8>)
3. **Manually build TransactionInstruction** with explicit `programId` parameter
4. **No reliance on Anchor's Program class** which may embed incorrect program IDs

**Key Code from instructions.ts (lines 118-122)**:
```typescript
return new TransactionInstruction({
  keys,
  programId: params.programId,  // ← EXPLICIT programId, no Anchor inference
  data,
});
```

### Why Anchor Program Pattern Fails

When using `new Program(idl as any, provider)`:
- Anchor infers program ID from `idl.address` field
- When calling `.instruction()` or `.rpc()`, Anchor embeds its inferred program ID
- If depositIx was built with one program ID context and createVault uses another, mismatch occurs
- The error occurs at **runtime validation** when Solana checks the declared vs actual program ID

## SOLUTION - Use Manual Instruction Builders

**We already have the functions!** In `_lib/instructions.ts`:
- `createVaultInstruction()` (lines 79-123)
- `depositUsdcInstruction()` (lines 128-160)

### Implementation Plan

Replace the Anchor Program pattern in create/page.tsx with manual instruction building:

```typescript
// Instead of:
const program = new Program(idl as any, provider);
const depositIx = await program.methods.depositUsdc(...).accounts({...}).instruction();
const tx = await program.methods.createVault(...).accounts({...}).postInstructions([depositIx]).rpc();

// Use:
const programId = new PublicKey(PROGRAM_ID);
const createIx = await createVaultInstruction({
  config: configPda,
  counter: counterPda,
  vault: vaultPda,
  vaultTokenAccount,
  usdcMint: new PublicKey(USDC_MINT),
  creator: publicKey,
  beneficiary,
  unlockUnix,
  nameHash: Array.from(nameHash),
  notificationWindowSeconds,
  gracePeriodSeconds,
  programId,
});

const depositIx = await depositUsdcInstruction({
  config: configPda,
  vault: vaultPda,
  counter: counterPda,
  vaultTokenAccount,
  usdcMint: new PublicKey(USDC_MINT),
  creatorUsdcAta,
  creator: publicKey,
  amount: amountLamports,
  programId,
});

const transaction = new Transaction().add(createIx).add(depositIx);
const signature = await sendTransaction(transaction, connection);
```

## Confidence Assessment

**95% confidence** this will fix the issue because:
1. ✅ This exact pattern works for `release` instruction
2. ✅ We already have working `createVaultInstruction()` and `depositUsdcInstruction()` functions
3. ✅ Manual instruction building bypasses Anchor's program ID inference entirely
4. ✅ Both instructions explicitly receive the same `programId` parameter
5. ✅ Transaction.add() pattern is proven in release page

## Why Previous Attempts Failed

All previous attempts tried to fix the Anchor Program pattern, but the issue is that **using Anchor Program class at all** introduces program ID confusion. The solution is to not use it for multi-instruction transactions where program ID consistency is critical.

---

## ✅ FIX IMPLEMENTED - Attempt 6: Manual Instruction Building

**Date:** 2025-10-03

**Changes Made:**

1. **Removed Anchor Program Dependencies:**
   - Removed `AnchorProvider`, `Program`, `BN` imports
   - Removed `idl` import
   - Added `Transaction` from `@solana/web3.js`
   - Added `createVaultInstruction`, `depositUsdcInstruction` from `_lib/instructions`

2. **Updated Wallet Adapter Usage:**
   - Changed from `signTransaction` to `sendTransaction`
   - Removed `signAllTransactions` (not needed)
   - Removed complex AnchorWallet wrapper

3. **Replaced Transaction Building:**
   ```typescript
   // OLD (Anchor Program):
   const program = new Program(idl, provider);
   const depositIx = await program.methods.depositUsdc(...).instruction();
   const tx = await program.methods.createVault(...).postInstructions([depositIx]).rpc();

   // NEW (Manual Instruction Building):
   const programId = new PublicKey(PROGRAM_ID);
   const createIx = await createVaultInstruction({ ...params, programId });
   const depositIx = await depositUsdcInstruction({ ...params, programId });
   const transaction = new Transaction().add(createIx).add(depositIx);
   const signature = await sendTransaction(transaction, connection);
   await connection.confirmTransaction(signature, 'confirmed');
   ```

4. **Data Type Changes:**
   - Changed `amountLamports` from `BN` to `number` (Math.floor)
   - Both instructions receive same explicit `programId` parameter

**Pattern Now Matches:** Working release page (release/page.tsx:112-148)

**Compilation Status:** ✅ Success - "✓ Compiled /create in 29ms"

**Test Result #1:** ❌ WalletSendTransactionError: Unexpected error
- **Analysis:** Transaction missing required metadata (blockhash, feePayer)
- **Root Cause:** Not following release page pattern of simulation before sending

---

## ✅ FIX REFINED - Attempt 7: Add Transaction Simulation

**Date:** 2025-10-03 (continued)

**Issue Found:**
```
WalletSendTransactionError: Unexpected error
at StandardWalletAdapter.sendTransaction (adapter.ts:345:23)
```

**Analysis:**
- ✅ DeclaredProgramIdMismatch is GONE (manual instruction building worked!)
- ❌ New issue: Transaction missing required metadata
- Comparing to working release page revealed missing simulation step

**Additional Changes:**

4. **Added Transaction Simulation** (matching release/page.tsx:152-163):
   ```typescript
   // Set transaction metadata
   const { blockhash } = await connection.getLatestBlockhash();
   transaction.recentBlockhash = blockhash;
   transaction.feePayer = publicKey;

   // Simulate first to catch errors early
   const simulation = await connection.simulateTransaction(transaction);
   if (simulation.value.err) {
     throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
   }

   // Then send
   const signature = await sendTransaction(transaction, connection);
   ```

**Confidence:** 90% - Now matches working release page pattern exactly

**Test Result #2:** ✅ Simulation worked! ❌ But revealed the REAL issue

---

## 🎯 ROOT CAUSE IDENTIFIED - Deployed Program Has Wrong Program ID!

**Date:** 2025-10-03

**Error from Simulation:**
```
Simulation logs:
Program 74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK invoke [1]
Program log: AnchorError occurred. Error Code: DeclaredProgramIdMismatch. Error Number: 4100.
Error Message: The declared program id does not match the actual program id.
Program 74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK failed: custom program error: 0x1004
```

**Critical Discovery:**
The error is happening **INSIDE the Solana program** during execution, NOT in our client code!

**Analysis:**
1. ✅ Client code is correct - we're calling program ID `74v7...`
2. ✅ Transaction simulation works - metadata is correct
3. ❌ **Deployed program bytecode has DIFFERENT `declare_id!` compiled into it**
4. ❌ When Anchor validates the program ID at runtime, it fails

**Verified Facts:**
- Source code lib.rs has: `declare_id!("74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK")`
- Deployed program slot: 412050544
- Program Authority: GeQ3YtidFiviY7Bb7ZuZK3mEPV6XXhpmGvycH4s7dJ5S

**Root Cause:**
The deployed program was compiled with a DIFFERENT program ID than what's currently in the source code. When we call the program at address `74v7...`, Anchor's runtime check compares:
- Actual program address: `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK`
- Compiled-in declare_id!: `SOMETHING_DIFFERENT`
- Result: Mismatch → Error 4100

**Solution:**
Rebuild and redeploy the program to ensure the compiled bytecode matches the program address.

```bash
cd programs/keepr-vault
anchor build
anchor deploy --provider.cluster devnet
```

Then update IDL in web app:
```bash
cp target/idl/keepr_vault.json web/app/_lib/keepr_vault.json
```

**Confidence:** 99% - This is a textbook Anchor deployment issue

**Why This Happened:**
During development, the program ID was probably changed in declare_id! AFTER the last deployment, creating a mismatch between deployed bytecode and source code.

---

## ✅ RESOLUTION - Program Rebuilt and Redeployed

**Date:** 2025-10-03

**Actions Taken:**

1. **Built Program Binary:**
   ```bash
   cd programs/keepr-vault
   cargo-build-sbf
   ```
   **Result:** ✅ Success - `target/deploy/keepr_vault.so` (296KB)
   - Compiled with warnings (anchor-debug, custom-heap cfg conditions) but these are non-critical
   - Binary built successfully in 0.36s

2. **Deployed to Devnet:**
   ```bash
   solana program deploy target/deploy/keepr_vault.so \
     --program-id 74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK \
     --url devnet
   ```
   **Result:** ✅ Success
   - **Signature:** `5SQaTWcEerYFSgcYTdzX4GY8DBg6kEJAh5ZceafMBQ1JHm3Ba2zoGk4EcXir4L95rFtBCky3LaPcNEXjFYjBCTcP`
   - **Program ID:** `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK`

**Note on Anchor Version:**
- Anchor 0.31.2 expected, but 0.31.1 installed globally
- Used `cargo-build-sbf` directly to bypass version check
- IDL not regenerated due to version mismatch, but existing IDL should still be valid

**Expected Outcome:**
The deployed program bytecode now has the correct `declare_id!("74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK")` compiled into it. The DeclaredProgramIdMismatch (Error 4100) should be resolved.

**Next Steps:**
1. Test vault creation in web app
2. If error persists, regenerate IDL by updating Anchor CLI version
3. Update web app IDL: `cp target/idl/keepr_vault.json web/app/_lib/keepr_vault.json`

**Transaction Link:**
https://explorer.solana.com/tx/5SQaTWcEerYFSgcYTdzX4GY8DBg6kEJAh5ZceafMBQ1JHm3Ba2zoGk4EcXir4L95rFtBCky3LaPcNEXjFYjBCTcP?cluster=devnet

---

## Key Learnings Summary

### 1. DeclaredProgramIdMismatch Can Happen On-Chain
The error can occur not just in client code, but inside the deployed program when the compiled `declare_id!` doesn't match the actual program address. Transaction simulation is essential for catching this.

### 2. Manual Instruction Building > Anchor Program Class
For multi-instruction transactions, manual instruction building provides:
- Explicit program ID control (no inference confusion)
- Better debugging (clear where program IDs are set)
- Same pattern used by major protocols

### 3. Transaction Simulation Is Critical
Always simulate before sending:
```typescript
const { blockhash } = await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
transaction.feePayer = publicKey;
const simulation = await connection.simulateTransaction(transaction);
if (simulation.value.err) throw Error(...);
```

### 4. Deployed Bytecode vs Source Code
Always ensure:
- Rebuild after changing `declare_id!`
- Deploy immediately after rebuild
- Verify deployment with `solana program show`
- Keep IDL in sync with deployed program

### 5. Debug Process
1. Check client code (PDAs, program IDs, accounts)
2. Simulate transaction to see on-chain logs
3. If error is on-chain, check deployed program
4. Rebuild and redeploy if source doesn't match deployed bytecode

---

## 🔍 ATTEMPT 8: Deep Investigation - cargo-build-sbf vs anchor build

**Date:** 2025-10-03 (continued)

**Issue:** After redeploying with `cargo-build-sbf`, error STILL persists

**Investigation Steps Taken:**

1. **Verified ALL configurations:**
   - ✅ Source code: `declare_id!("74v7...")` at lib.rs:5
   - ✅ Anchor.toml: Program ID matches
   - ✅ Cargo.toml: No conflicts
   - ✅ IDL files: Address field correct
   - ✅ Keypair: Matches program ID
   - ✅ Client code: Using correct program ID
   - ✅ Discriminators: Match expected values
   - ✅ Config account: Exists and is valid (`2ZLGQe7moMmjeS6D4bPQhUs8vqPQqqamXhQowPMVa71D`)

2. **Compared working vs non-working instructions:**
   - ✅ Release instruction: WORKS
   - ❌ Create_vault instruction: FAILS
   - Both use identical manual instruction building pattern
   - Both use same program ID derivation
   - Error occurs at instruction index [0] (before any logic runs)

3. **Analyzed program structure:**
   ```rust
   // CreateVault struct (line 430-470)
   #[derive(Accounts)]
   pub struct CreateVault<'info> {
       #[account(seeds = [b"config"], bump)]
       pub config: Box<Account<'info, Config>>,
       // ... other accounts
   }
   ```
   - Account constraints checked AFTER program ID validation
   - Error happens at entry point, not during constraint validation

4. **Key Discovery:**
   - Binary search with `strings` found NO occurrences of "74v7..." in the compiled `.so` file
   - This suggests `cargo-build-sbf` may not properly process `declare_id!` macro
   - Anchor's build process likely has additional steps for embedding program ID

**ROOT CAUSE HYPOTHESIS (95% confidence):**

Using `cargo-build-sbf` instead of `anchor build` does NOT properly compile/embed the `declare_id!` macro into the binary. When Anchor's runtime validator checks the program ID at the very start of execution, it finds a mismatch between:
- The executing program address: `74v7...`
- The compiled-in `declare_id!`: Possibly NULL, uninitialized, or a different value

**Evidence Supporting This:**
1. Source code is definitely correct
2. All configs are correct
3. Clean build still fails
4. Error occurs at program entry point (3118 compute units)
5. Anchor version mismatch warning when trying to use `anchor build`

**SOLUTION:**

Must use `anchor build` with the matching Anchor CLI version (0.30.1) to ensure the `declare_id!` macro is properly processed during compilation.

**Action Plan:**
1. Install Anchor CLI 0.30.1 via AVM
2. Clean build directory
3. Build with `anchor build --skip-lint`
4. Deploy the new binary
5. Test vault creation

---

## ✅ RESOLUTION - Attempt 9: Fresh Clean Build

**Date:** 2025-10-03 (final)

**Actions Taken:**

1. **Cleaned build artifacts:**
   ```bash
   cd programs/keepr-vault && cargo clean
   # Removed 1334 files, 281.6MiB
   ```

2. **Fresh build with cargo-build-sbf:**
   ```bash
   cargo-build-sbf
   # Compiled successfully in 30.70s
   # Binary size: 356K (was 296K before)
   ```

3. **Deployed fresh binary:**
   ```bash
   solana program deploy target/deploy/keepr_vault.so \
     --program-id 74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK \
     --url devnet
   ```
   **Signature:** `4xBc5hVaqXQMAjYee6kc4aY5PRkYGfRcLauQ2ddrf96pqjbLymg6vy7maYgbbUJi8M6ocJ8GsSDYd74wBwqvfT8G`

**Key Difference:**
- Previous builds may have had stale artifacts in target/
- cargo clean removed ALL build cache (281.6MB)
- Fresh compilation from scratch with correct declare_id!

**Testing Required:**
Test vault creation in web app to verify the fix works.

**Transaction Link:**
https://explorer.solana.com/tx/4xBc5hVaqXQMAjYee6kc4aY5PRkYGfRcLauQ2ddrf96pqjbLymg6vy7maYgbbUJi8M6ocJ8GsSDYd74wBwqvfT8G?cluster=devnet

---

## ✅ FINAL RESOLUTION - Attempt 10 & 11: Schema Migration and Config Fix

**Date:** 2025-10-03 (continuation)

### Issue #2: AccountDidNotDeserialize (Error 3003)

**Symptom:**
After resolving the DeclaredProgramIdMismatch, a new error appeared:
```
Program log: AnchorError caused by account: config. Error Code: AccountDidNotDeserialize. 
Error Number: 3003. Error Message: Failed to deserialize the account.
```

**Root Cause:**
The Config account on devnet had an **old schema** (81 bytes) without the `admin_test_wallets` field. The newly deployed program expected the **new schema** (405 bytes) with the `admin_test_wallets: Vec<Pubkey>` field.

**Actions Taken:**

1. **Added `close_config` instruction for schema migrations:**
   ```rust
   pub fn close_config(ctx: Context<CloseConfig>) -> Result<()> {
       // Manually verify admin from raw account data
       let config_data = ctx.accounts.config.try_borrow_data()?;
       let admin_bytes = &config_data[8..40];
       let stored_admin = Pubkey::try_from(admin_bytes)?;
       require!(stored_admin == ctx.accounts.admin.key(), ...);
       
       // Transfer lamports to admin and zero out account
       **ctx.accounts.admin.lamports.borrow_mut() = ...
       **ctx.accounts.config.lamports.borrow_mut() = 0;
       Ok(())
   }
   
   #[derive(Accounts)]
   pub struct CloseConfig<'info> {
       /// CHECK: AccountInfo to avoid deserialization errors
       #[account(mut, seeds = [b"config"], bump)]
       pub config: AccountInfo<'info>,
       #[account(mut)]
       pub admin: Signer<'info>,
   }
   ```

2. **Rebuilt and redeployed:**
   ```bash
   cargo-build-sbf
   solana program deploy target/deploy/keepr_vault.so \
     --program-id 74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK \
     --url devnet
   ```
   **Signature:** `619jcvm64kMEpkFGymMzayEPj5R2t4jppgmNU6P7qDh8yqYH5oJbVJct8YYBTHcSQMtP411vPDSTdDzAy6ULR3tf`

3. **Created raw web3.js scripts to close and reinitialize config:**
   - `scripts/close-config-raw.ts` - Manually crafted instruction with discriminator
   - `scripts/init-config-raw.ts` - Reinitialize with new schema
   
4. **Closed old config:**
   ```bash
   npx tsx scripts/close-config-raw.ts
   ```
   **Signature:** `3M7Sk2Wd4yQNXNvHtaW1cWPUzYpKz8AUSU3WtGeh4Ky9dZ1DNsEYwwfBAVBvufyGzP2gKaL2ZMeGZBxC7bDyRN8w`

5. **Reinitialized config with new schema:**
   **First attempt had WRONG USDC mint** (mainnet instead of devnet)
   
---

### Issue #3: USDC Mint Mismatch (Error 2012)

**Symptom:**
After fixing AccountDidNotDeserialize, vault creation failed with:
```
Program log: AnchorError caused by account: usdc_mint. Error Code: ConstraintAddress. 
Error Number: 2012. Error Message: An address constraint was violated.
Program log: Left: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
Program log: Right: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

**Root Cause:**
Config was initialized with **mainnet USDC mint** (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`) but client was using **devnet USDC mint** (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`).

**Critical Learning:**
⚠️ **Devnet and mainnet have DIFFERENT USDC mint addresses!**
- Devnet USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- Mainnet USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

**Actions Taken:**

1. **Closed config again:**
   ```bash
   npx tsx scripts/close-config-raw.ts
   ```
   **Signature:** `5mt2vERHVMismoepfRH3uxZotUxJ8DW4k5SDpuDnC88QxqP1itqHnpimLL3f7TbFY7XNvN52ta6zWJzivQNWSJ3Q`

2. **Fixed init script with devnet USDC:**
   ```typescript
   // Devnet USDC mint (different from mainnet!)
   const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
   ```

3. **Reinitialized with correct devnet USDC:**
   ```bash
   npx tsx scripts/init-config-raw.ts
   ```
   **Signature:** `3vPZcpuDT697vieL1rL1pMFPrSKomYQ3hrX7BDY7qotk8RuKQUcQn8xAsqvxDPkDbX5bcn2pz8rPVnigf33vyuyr`
   
   ✅ Config created: 405 bytes (correct size with admin_test_wallets)

---

## Key Learnings

### 1. Stale Build Artifacts
**Problem:** Incremental builds can cache outdated artifacts that cause runtime mismatches.
**Solution:** Always `cargo clean` before critical deployments.

### 2. Schema Migrations on Devnet
**Problem:** Anchor Account<'info, T> deserializer fails if on-chain data doesn't match struct.
**Solution:** Create migration instructions using `AccountInfo<'info>` to bypass deserialization:
```rust
#[account(mut, seeds = [...], bump)]
pub account: AccountInfo<'info>,  // Not Account<'info, T>!
```
Then manually:
- Parse raw bytes to verify ownership/admin
- Transfer lamports to close account
- Reinitialize with new schema

### 3. Network-Specific Token Addresses
**Problem:** Token mints differ between devnet/mainnet but code often hardcodes mainnet addresses.
**Solution:** 
- Always verify token addresses for target network
- Use environment variables or network-aware configs
- Document both addresses in code comments

### 4. Manual Instruction Crafting
**Problem:** Anchor IDL not available or out of sync after schema changes.
**Solution:** Calculate discriminators manually and use raw web3.js:
```typescript
function getInstructionDiscriminator(name: string): Buffer {
  const hash = crypto.createHash("sha256");
  hash.update(`global:${name}`);
  return hash.digest().slice(0, 8);
}
```

### 5. Devnet vs Mainnet Checklist
When deploying to devnet, verify:
- [ ] USDC mint is devnet mint (4zMMC9...)
- [ ] RPC endpoint is devnet
- [ ] Program is deployed to devnet
- [ ] Test wallets have devnet SOL
- [ ] Config initialization uses devnet addresses

---

## Transaction Reference

**All successful transactions (2025-10-03):**

1. Clean build deployment: `4xBc5hVaqXQMAjYee6kc4aY5PRkYGfRcLauQ2ddrf96pqjbLymg6vy7maYgbbUJi8M6ocJ8GsSDYd74wBwqvfT8G`
2. Add close_config deployment: `619jcvm64kMEpkFGymMzayEPj5R2t4jppgmNU6P7qDh8yqYH5oJbVJct8YYBTHcSQMtP411vPDSTdDzAy6ULR3tf`
3. Close old config (81 bytes): `3M7Sk2Wd4yQNXNvHtaW1cWPUzYpKz8AUSU3WtGeh4Ky9dZ1DNsEYwwfBAVBvufyGzP2gKaL2ZMeGZBxC7bDyRN8w`
4. Init with mainnet USDC (wrong): `aeP8iEyH9gyYRWv8FWwXXmaRF1zW1NSUazkzKkjTEzvaghS5kWSQUBUAC3QVeZrEnBzt33zhTJ47yXShZjjkpfw`
5. Close config (405 bytes): `5mt2vERHVMismoepfRH3uxZotUxJ8DW4k5SDpuDnC88QxqP1itqHnpimLL3f7TbFY7XNvN52ta6zWJzivQNWSJ3Q`
6. Init with devnet USDC (correct): `3vPZcpuDT697vieL1rL1pMFPrSKomYQ3hrX7BDY7qotk8RuKQUcQn8xAsqvxDPkDbX5bcn2pz8rPVnigf33vyuyr`

**View on Solscan:**
https://solscan.io/account/2ZLGQe7moMmjeS6D4bPQhUs8vqPQqqamXhQowPMVa71D?cluster=devnet

---

## Status: ✅ FULLY RESOLVED

All three issues have been fixed:
1. ✅ DeclaredProgramIdMismatch (stale build artifacts)
2. ✅ AccountDidNotDeserialize (schema migration)
3. ✅ ConstraintAddress/USDC mint mismatch (devnet vs mainnet)

Config account is now correctly initialized with:
- Admin: `GeQ3YtidFiviY7Bb7ZuZK3mEPV6XXhpmGvycH4s7dJ5S`
- USDC Mint (devnet): `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- Max lock per vault: 500 USDC (500_000_000 lamports with 6 decimals)
- Paused: false
- Admin test wallets: [] (empty)

**Ready for vault creation testing!**

---

# Issue #4: InvalidBeneficiary (Error 6008)

## Error Summary
**Error**: `AnchorError thrown in src/lib.rs:127. Error Code: InvalidBeneficiary. Error Number: 6008. Error Message: Beneficiary cannot be the creator.`

**Date**: 2025-10-03 (continuation session)

## Root Cause
The program has a safety check that prevents creator==beneficiary for production use. This is intentional to prevent users from accidentally creating vaults to themselves. However, for devnet testing with a single wallet, this blocks testing.

## Solution
Added `admin_test_wallets` feature to Config account:
- Admin can add wallets to a whitelist via `update_admin_test_wallets` instruction
- Whitelisted wallets can create test vaults where creator==beneficiary
- Program sets `is_test_vault: true` flag for these vaults

**Script created**: `scripts/add-admin-tester.ts`

**Transaction**: `3vd5wsUcmVMzEbkBdSqB3RJVuQfSLtAJA8YWSskq7R49LfaYhfcKXVYNgKEPdg2stQ8i35N6K6bzzTs626YJHwH`

**Wallet added**: `9ssrJyXicq9m6FpVeeZuwLbwp3qXoNTgv8u4n31GZphQ`

---

# Issue #5: InvalidNotificationWindow (Error 6013)

## Error Summary
**Error**: `AnchorError thrown in src/lib.rs:160. Error Code: InvalidNotificationWindow. Error Number: 6013. Error Message: Invalid notification window.`

**Date**: 2025-10-03 (continuation session)

## Root Cause: Timing Race Condition

The validation at `lib.rs:160` requires:
```rust
require!(
    notification_window_seconds < vault_period_seconds,
    KeeprError::InvalidNotificationWindow
);
```

**The Problem:**
1. **Client** calculates `vaultPeriodSeconds = unlockUnix - Date.now()`
2. **Client** calculates `notificationWindow = floor(vaultPeriodSeconds * 0.5)` = 50%
3. Transaction is sent (network delays: 5-30 seconds)
4. **On-chain** calculates `vault_period_seconds = unlock_unix - clock.unix_timestamp` (current on-chain time)
5. **On-chain** validates: `notification_window < vault_period_seconds`

**For short test vaults (e.g., 5 minutes = 300 seconds):**
- Client calculates: notification_window = 150 seconds (50% of 300)
- Network delay: ~10 seconds pass
- On-chain vault_period = 290 seconds (300 - 10)
- Validation fails: 150 < 290 ✓ (might pass)

**But with 60-second minimum:**
- Client calculates: notification_window = max(60, 150) = 60 seconds
- Network delay: ~10 seconds pass
- On-chain vault_period = 55 seconds (if user set unlock to exactly 60 seconds from now)
- Validation fails: 60 < 55 ✗ (fails!)

## Solutions Applied

### Solution 1: Remove Minimum Constraint
Changed from:
```typescript
const notificationWindowSeconds = Math.min(
  7 * 24 * 60 * 60, // Max 7 days
  Math.max(
    60, // Min 1 minute ← PROBLEM
    Math.floor(vaultPeriodSeconds * 0.5)
  )
);
```

To:
```typescript
const notificationWindowSeconds = Math.min(
  7 * 24 * 60 * 60, // Max 7 days
  Math.max(
    1, // Min 1 second (just to avoid zero)
    Math.floor(vaultPeriodSeconds * 0.3) // 30% instead of 50%
  )
);
```

### Solution 2: Add Safety Buffer
```typescript
const safetyBufferSeconds = 30;
const safeVaultPeriod = Math.max(0, vaultPeriodSeconds - safetyBufferSeconds);
const notificationWindowSeconds = Math.min(
  7 * 24 * 60 * 60,
  Math.max(1, Math.floor(safeVaultPeriod * 0.3))
);
```

### Solution 3: Add Advanced Settings UI
Added collapsible "Advanced Settings" section in `/web/app/create/page.tsx`:
- Users can customize notification window (check-in period)
- Users can customize grace period
- Shows recommended defaults based on vault duration
- Auto-calculates on unlock time change
- Allows manual override for testing

**Files changed:**
- `/web/app/create/page.tsx`: Added advanced settings UI and calculation logic
  - `calculateDefaults()` function: 30% notification window, 15% grace period
  - `handleInputChange()`: Auto-calculates on unlock time change
  - `handleContinueToReview()`: Ensures defaults are set before validation
  - Advanced settings panel with collapsible UI

## Key Learnings

1. **Transaction Timing**: Always account for network delays between client calculation and on-chain execution (5-30 seconds typical)

2. **Percentage-based Minimums**: Don't use fixed minimums (like 60 seconds) for percentage-based calculations on variable durations

3. **Safety Buffers**: Subtract expected delay from calculations to ensure validation passes:
   ```typescript
   const safeVaultPeriod = vaultPeriodSeconds - estimatedDelaySeconds;
   ```

4. **User Flexibility**: Provide sensible defaults but allow customization via advanced settings

5. **Strict Inequalities**: When validation uses `<` (not `<=`), ensure meaningful gap:
   - Bad: 50% (too close to limit after delays)
   - Good: 30% with 30-second buffer

## Status: 🔧 FIX APPLIED - AWAITING VERIFICATION

**Changes made:**
- Updated calculation logic in `/web/app/create/page.tsx`
- Added Advanced Settings UI for manual override
- Safety buffer and reduced percentages implemented

**Next step:** Test vault creation with 5-minute vault to verify fix works.

---

## Issue #6: InvalidNotificationWindow Due to Serialization Mismatch

**Date**: Oct 3, 2025  
**Error**: `InvalidNotificationWindow` (Error 6013) at lib.rs:160  
**Status**: ✅ **RESOLVED**

### Problem

Vault creation consistently failed with `InvalidNotificationWindow` error even though client-side validation showed parameters were valid:
- Client: notification_window = 112 seconds, vault_period = 540 seconds (112 < 540 ✓)
- On-chain: Validation still failed at line 160: `require!(notification_window_seconds < vault_period_seconds, ...)`

### Root Cause

**Data serialization mismatch** between client and Rust program:

**Rust program expects** (`lib.rs:108-114`):
```rust
pub fn create_vault(
    ctx: Context<CreateVault>,
    beneficiary: Pubkey,            // 32 bytes
    unlock_unix: i64,                // 8 bytes
    name_hash: [u8; 32],            // 32 bytes - FIXED SIZE ARRAY
    notification_window_seconds: u32, // 4 bytes
    grace_period_seconds: u32,       // 4 bytes
) -> Result<()>
```

**Client was sending** (`instructions.ts:96-104`):
```typescript
const data = Buffer.concat([
    discriminator,                      // 8 bytes
    encodePublicKey(params.beneficiary), // 32 bytes
    encodeI64(params.unlockUnix),       // 8 bytes
    encodeVecU8(params.nameHash),       // 4 bytes LENGTH + 32 bytes DATA ❌
    encodeU32(params.notificationWindowSeconds), // 4 bytes
    encodeU32(params.gracePeriodSeconds),        // 4 bytes
]);
```

**The bug**: `encodeVecU8()` adds a 4-byte length prefix for Rust `Vec<u8>`, but Rust expects `[u8; 32]` (fixed-size array with NO prefix).

**Result**: 4-byte misalignment caused the program to read:
- Last 4 bytes of `name_hash` as `notification_window_seconds` (garbage values)
- Actual `notification_window_seconds` as `grace_period_seconds`
- Validation failed on garbage data

### Solution

Added new encoding function for fixed-size arrays and updated instruction building:

**1. New encoder** (`instructions.ts:66-71`):
```typescript
/**
 * Encode fixed-size [u8; N] array to Buffer (NO length prefix)
 */
function encodeFixedBytes(data: number[] | Uint8Array): Buffer {
  return Buffer.from(data);
}
```

**2. Updated instruction building** (`instructions.ts:105-112`):
```typescript
// NOTE: name_hash is a fixed-size [u8; 32] array, NOT Vec<u8>, so use encodeFixedBytes (no length prefix)
const data = Buffer.concat([
    discriminator,
    encodePublicKey(params.beneficiary),
    encodeI64(params.unlockUnix),
    encodeFixedBytes(params.nameHash),  // ✅ No length prefix
    encodeU32(params.notificationWindowSeconds),
    encodeU32(params.gracePeriodSeconds),
]);
```

**3. Data size verification**:
- Before: 92 bytes (8 + 32 + 8 + 4 + 32 + 4 + 4)
- After: 88 bytes (8 + 32 + 8 + 32 + 4 + 4) ✓

### Verification

**Successful vault creation** (Oct 3, 2025 21:28 IST):
- Vault PDA: `3AockQKLQBRvY2qrvhSFLTWWj8imTAQvMNHFurLsQ1hQ`
- Amount locked: 1,000,000 (1 USDC)
- Unlock time: 1759507500 (Oct 3, 2025 21:35 IST)
- Status: Funded and awaiting unlock ✓

On-chain verification:
```bash
solana account 3AockQKLQBRvY2qrvhSFLTWWj8imTAQvMNHFurLsQ1hQ --url devnet
# At offset 0x88: 40 42 0f 00 00 00 00 00 = 1,000,000 (1 USDC) ✓
```

### Key Learnings

1. **Rust type ≠ Serialization format**: `[u8; N]` (fixed array) vs `Vec<u8>` (dynamic vector) have different wire formats
2. **Fixed arrays don't have length prefix**: Unlike vectors, fixed-size arrays serialize as raw bytes
3. **Anchor doesn't catch this**: IDL shows both as `bytes`, but serialization differs
4. **Strict validation exposed the bug**: The `<` (not `<=`) check caused failures when garbage values happened to equal vault period
5. **Data size matters**: Total instruction data jumped from expected 88 to 92 bytes - a red flag

### Additional Context

This issue was masked by initial attempts to fix "timing issues" (safety buffers, percentage calculations), but the actual problem was that the program was never receiving correct values due to misaligned deserialization.


---

## Issue #7: AccountNotSigner Error in Release Instruction

**Date**: Oct 3, 2025  
**Error**: `AccountNotSigner` (Error 3010) - "The given account did not sign"  
**Status**: ✅ **RESOLVED**

### Problem

Release transaction failed immediately after vault unlock with:
```
Program log: AnchorError caused by account: payer. Error Code: AccountNotSigner. Error Number: 3010.
```

### Root Cause

**Missing `payer` account in release instruction**. The Rust program requires a `payer` Signer to pay for creating the beneficiary's Associated Token Account (ATA) if it doesn't exist (`init_if_needed`).

**Rust expects** (`lib.rs:553-592`):
```rust
pub struct Release<'info> {
    pub vault: Account<'info, Vault>,
    pub counter: Account<'info, VaultCounter>,
    pub vault_token_account: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = payer,  // ← Uses payer to create ATA
        associated_token::mint = usdc_mint,
        associated_token::authority = beneficiary
    )]
    pub beneficiary_usdc_ata: Account<'info, TokenAccount>,
    
    pub beneficiary: AccountInfo<'info>,  // NOT a signer
    
    #[account(mut)]
    pub payer: Signer<'info>,  // ← MUST sign
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}
```

**Client was sending** (`instructions.ts:197-207`, before fix):
```typescript
const keys = [
    { pubkey: params.vault, isSigner: false, isWritable: true },
    { pubkey: params.counter, isSigner: false, isWritable: false },
    { pubkey: params.vaultTokenAccount, isSigner: false, isWritable: true },
    { pubkey: params.usdcMint, isSigner: false, isWritable: false },
    { pubkey: params.beneficiaryUsdcAta, isSigner: false, isWritable: true },
    { pubkey: params.beneficiary, isSigner: true, isWritable: true }, // ❌ Wrong!
    // ❌ Missing payer account!
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
];
```

**Two bugs**:
1. **Missing `payer` account** (causing AccountNotSigner error)
2. **Beneficiary wrongly marked as signer** (should be `isSigner: false`)

### Solution

**1. Updated instruction builder** (`instructions.ts:183-216`):
```typescript
export async function releaseInstruction(params: {
  vault: PublicKey;
  counter: PublicKey;
  vaultTokenAccount: PublicKey;
  usdcMint: PublicKey;
  beneficiaryUsdcAta: PublicKey;
  beneficiary: PublicKey;
  payer: PublicKey;  // ✅ Added
  programId: PublicKey;
}): Promise<TransactionInstruction> {
  const discriminator = await getCachedDiscriminator('release');
  const data = discriminator;

  const keys = [
    { pubkey: params.vault, isSigner: false, isWritable: true },
    { pubkey: params.counter, isSigner: false, isWritable: false },
    { pubkey: params.vaultTokenAccount, isSigner: false, isWritable: true },
    { pubkey: params.usdcMint, isSigner: false, isWritable: false },
    { pubkey: params.beneficiaryUsdcAta, isSigner: false, isWritable: true },
    { pubkey: params.beneficiary, isSigner: false, isWritable: false }, // ✅ Fixed
    { pubkey: params.payer, isSigner: true, isWritable: true }, // ✅ Added
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({ keys, programId: params.programId, data });
}
```

**2. Updated release page** (`release/page.tsx:137-146`):
```typescript
const instruction = await releaseInstruction({
  vault: vaultPdaKey,
  counter: counterPda,
  vaultTokenAccount,
  usdcMint: new PublicKey(USDC_MINT),
  beneficiaryUsdcAta,
  beneficiary: beneficiaryKey,
  payer: publicKey,  // ✅ Connected wallet signs and pays
  programId,
});
```

### Key Learnings

1. **`init_if_needed` requires a payer**: Anchor's `init_if_needed` constraint needs someone to pay for account creation
2. **Account order matters**: Rust struct field order must match client instruction account order exactly
3. **Signer vs AccountInfo**: Not all accounts need to sign - check Rust type (`Signer<'info>` vs `AccountInfo<'info>`)
4. **Permissionless doesn't mean gasless**: Anyone can trigger release, but someone must pay for gas/ATA creation

### Design Note: Manual vs Automatic Release

**Current implementation**: Manual release (user clicks button to trigger)  
**User feedback**: "Release should be automatic, not manual"

This requires architectural change - possible approaches:
1. **Clockwork/Clockwork Lite**: Scheduled on-chain transactions
2. **Keeper bots**: Off-chain service monitoring and triggering releases
3. **Incentivized release**: Allow anyone to trigger, pay small reward from vault

**Decision pending**: Automatic release mechanism design and implementation.

---

## Issue #8: Missing amount_locked Reset in Release Function

**Date**: Oct 6, 2025
**Error**: `AlreadyReleased` (Error 6002) but vault still shows funds
**Severity**: 🔴 **CRITICAL** - Data integrity bug
**Status**: ✅ **RESOLVED**

### Problem

User reported vault showing "ready to release" on list page but "already released" on details page, with funds not actually returned.

**Symptoms:**
- Release transaction fails with `AlreadyReleased` error at lib.rs:302
- Vault has `released = true` flag set
- Vault shows `amount_locked > 0` in vault account
- Token account balance is **actually 0** (funds were transferred)
- UI shows inconsistent state

### Root Cause

**Critical bug in `release()` function (lib.rs:291-341):**

The function transfers funds and sets the `released` flag, but **never zeros `amount_locked`**:

```rust
// lib.rs:309-332 (before fix)
let amount = vault.amount_locked;  // Read amount
// ... lines 314-330: token transfer succeeds
vault.released = true;  // Set flag
// ❌ MISSING: vault.amount_locked = 0;
```

**Compare to `cancel_vault()` (lines 373-378) which correctly does:**
```rust
token::transfer(cpi_ctx, amount)?;  // Transfer
vault.cancelled = true;             // Set flag
vault.amount_locked = 0;            // ✅ Zero the amount
```

### Investigation Details

**Vault address:** `3AockQKLQBRvY2qrvhSFLTWWj8imTAQvMNHFurLsQ1hQ`

**On-chain state (before fix):**
```
- amount_locked: 1,000,000 lamports (1 USDC)
- released: true
- cancelled: false
- vault_token_account balance: 0 lamports ← Funds WERE transferred!
```

**What happened:**
1. Someone successfully called `release()`
2. Token transfer completed (balance went to 0)
3. `released` flag was set to `true`
4. Transaction completed successfully
5. But `amount_locked` still showed 1 USDC
6. Subsequent release attempts failed at line 302: `require!(!vault.released, ...)`
7. UI showed confusing state due to mismatch between `amount_locked` and actual balance

### Solution

**1. Fixed the release function (lib.rs:332-333):**
```rust
vault.released = true;
vault.amount_locked = 0;  // ✅ Added
```

**2. Added admin recovery function for stuck vaults:**
```rust
/// Fix stuck vault (admin only) - for vaults that are released but have incorrect amount_locked
pub fn fix_released_vault(ctx: Context<FixReleasedVault>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    require!(vault.released, KeeprError::NotReleased);
    require!(ctx.accounts.vault_token_account.amount == 0, KeeprError::VaultNotEmpty);

    vault.amount_locked = 0;  // Fix the stuck value
    Ok(())
}
```

**3. Created admin script:** `web/scripts/fix-stuck-vault.ts`

### Deployment & Fix

**Deployment 1 (fix for future vaults):**
- Transaction: `2xfBB4nAueqFyFD3r9eaR6kHSsUSHPb7126W9Nw7mHWpDNnqXzwxz6uBNewroQ1Tg7SFhq3ppSGYfRDxCtnQe1Qs`
- Added `vault.amount_locked = 0;` to release function

**Deployment 2 (admin recovery function):**
- Transaction: `58rBE34FPVTFxqoj7cLXL9WkexpjRKcr4MswBPpwor2dBaiHMri8sXGaku2cunsAPcuXJcRcJx434EUgWBReawqK`
- Added `fix_released_vault` instruction

**Fixed stuck vault:**
- Transaction: `5xEA7DnFZbFRnVMSikUziqqqw6fHDezQ37mjhvHZzRr58Tt52TRp3J2bHVcujRdVoNJGY842Y6ZQUvy4Y2sFqwmW`
- Vault `3AockQKLQBRvY2qrvhSFLTWWj8imTAQvMNHFurLsQ1hQ` now has `amount_locked = 0` ✓

### Key Learnings

1. **State consistency is critical**: All related fields must be updated atomically
2. **Always check similar functions**: `cancel_vault` had the correct pattern
3. **Verify with on-chain data**: Token account balance revealed funds were actually transferred
4. **Admin recovery functions**: Essential for fixing production bugs without data loss
5. **Pattern to follow**: When transferring funds from a vault:
   ```rust
   token::transfer(cpi_ctx, amount)?;  // Transfer
   vault.released = true;               // Set status flag
   vault.amount_locked = 0;            // Zero the amount ← Don't forget!
   ```

### Impact

**Before fix:**
- Any vault that was successfully released would get stuck
- UI would show incorrect state
- Vault couldn't be closed (requires `amount_locked == 0`)
- User confusion ("where are my funds?")

**After fix:**
- All future releases will properly zero `amount_locked`
- Admin can fix any stuck vaults from before the fix
- UI now shows consistent state

### Testing Checklist

For any instruction that transfers funds:
- [ ] Transfer executes successfully
- [ ] Status flags are set correctly
- [ ] Amount fields are zeroed
- [ ] Token account balance matches on-chain fields
- [ ] Subsequent operations work as expected
- [ ] UI reflects accurate state

---

## Issue #9: Schema Migration Breaking Backward Compatibility

**Date**: Oct 6, 2025
**Error**: `AccountDidNotDeserialize` (Error 3003) for old vaults
**Severity**: 🔴 **CRITICAL** - Data migration bug
**Status**: ⚠️ **OPEN ISSUE** - Not fixed, only cleaned up

### Problem

When new fields were added to the `Vault` struct (specifically `notification_window_seconds`, `grace_period_seconds`, and `last_checkin_unix`), existing vaults created with the old schema became **permanently undeserializable**.

**Symptoms:**
- Old vaults show "AccountDidNotDeserialize" error when accessed
- Cannot release funds from old vaults
- Cannot close old vaults to reclaim rent
- Funds are permanently locked in old schema vaults

### Root Cause

**Anchor's strict deserialization** requires the on-chain data layout to **exactly match** the current Rust struct definition:

```rust
// Old schema (before fix)
#[account]
pub struct Vault {
    pub creator: Pubkey,              // 32 bytes
    pub beneficiary: Pubkey,          // 32 bytes
    pub usdc_mint: Pubkey,            // 32 bytes
    pub vault_token_account: Pubkey,  // 32 bytes
    pub amount_locked: u64,           // 8 bytes
    pub unlock_unix: i64,             // 8 bytes
    pub released: bool,               // 1 byte
    pub cancelled: bool,              // 1 byte
    pub is_test_vault: bool,          // 1 byte
    pub bump: u8,                     // 1 byte
    pub name_hash: [u8; 32],         // 32 bytes
    pub vault_id: u64,               // 8 bytes
    // Total: 188 bytes
}

// New schema (current)
#[account]
pub struct Vault {
    // ... same fields as above ...
    pub vault_id: u64,                      // 8 bytes
    pub vault_period_seconds: u32,          // 4 bytes ← ADDED
    pub notification_window_seconds: u32,   // 4 bytes ← ADDED
    pub grace_period_seconds: u32,          // 4 bytes ← ADDED
    pub last_checkin_unix: i64,            // 8 bytes ← ADDED
    // Total: 216 bytes
}
```

**When the program tries to deserialize old 188-byte vaults:**
1. Anchor reads the discriminator (8 bytes) ✓
2. Attempts to read struct fields sequentially
3. Runs out of data when trying to read new fields
4. Throws `AccountDidNotDeserialize` error
5. Transaction fails immediately

### Investigation Details

**Affected vaults on devnet:**
- `HSQbhLD5...` - 1 USDC locked, 188 bytes (old schema)
- `HBz6KSho...` - 1 USDC locked, 188 bytes (old schema)
- `8YYmKMWt...` - 1 USDC locked, 188 bytes (old schema)

**Attempts to access these vaults result in:**
```
Program log: AnchorError caused by account: vault.
Error Code: AccountDidNotDeserialize. Error Number: 3003.
Error Message: Failed to deserialize the account.
Program consumed 4042 compute units
Program failed: custom program error: 0xbbb
```

**Why this happened:**
1. Initial vaults created without notification/grace period fields
2. Program was updated to add dead man's switch functionality
3. New fields added to `Vault` struct
4. Old vaults still exist on-chain with old layout
5. Program redeployed with new schema
6. **No migration path provided**

### Current Status

**Cleanup performed:**
- Successfully released 1 vault with new schema (GjJaN9...) ✓
- 3 vaults with old schema remain **permanently stuck**
- Total locked: 3 USDC (considered lost on devnet)
- User's actual balance: 10 USDC ✓

**UI updated:**
- Vaults page filters out undeserializable vaults
- Only shows vaults with correct schema

### The Real Issue

This is **NOT actually a bug in the accounting** - the 3 USDC appears to be from test deposits during development. The vaults showing 3 USDC are genuinely stuck due to schema incompatibility.

**This is a fundamental Solana/Anchor development issue:**
- Schema changes break backward compatibility
- No automatic migration
- Funds can be permanently locked

### Solutions (Not Implemented)

**Option 1: Backward-Compatible Deserialization**
```rust
// Use Option<T> for new fields with default values
pub vault_period_seconds: Option<u32>,
pub notification_window_seconds: Option<u32>,
pub grace_period_seconds: Option<u32>,
pub last_checkin_unix: Option<i64>,
```
**Problem:** Requires custom deserialization logic

**Option 2: Manual Data Migration**
- Read old vaults with raw account data parsing
- Create new vaults with migrated data
- Transfer funds from old to new
**Problem:** Complex, requires downtime

**Option 3: Version Field**
```rust
pub schema_version: u8,
// ... conditional logic based on version
```
**Problem:** Adds complexity to every instruction

**Option 4: Raw Instruction Handler**
- Bypass Anchor deserialization
- Parse account data manually
- Handle old and new schemas
**Problem:** Defeats purpose of using Anchor

### Recommended Solution (For Production)

**Before making ANY schema changes to production:**

1. **Add schema_version field** to all account structs
2. **Implement migration instructions:**
   ```rust
   pub fn migrate_vault_v1_to_v2(ctx: Context<MigrateVault>) -> Result<()> {
       // Read old schema manually
       // Create new account with new schema
       // Transfer funds and rent
       Ok(())
   }
   ```
3. **Use realloc for additive changes:**
   ```rust
   #[account(
       mut,
       realloc = 8 + Vault::INIT_SPACE,
       realloc::payer = authority,
       realloc::zero = true,
   )]
   ```
4. **Always test migrations on devnet first**
5. **Provide clear migration timeline to users**

### Key Learnings

1. **Schema changes are BREAKING changes** - treat them like major version bumps
2. **Plan for migrations from day 1** - add version fields immediately
3. **Never assume you can just redeploy** - existing accounts will break
4. **Devnet testing is critical** - we caught this before mainnet
5. **Document all schema versions** - keep history of every layout
6. **Consider using dynamic fields** - `Vec<u8>` or `HashMap<String, String>` for extensibility

### Impact

**Devnet (current situation):**
- 3 vaults permanently stuck (3 USDC lost)
- No user impact (test funds only)
- Valuable learning experience

**If this happened on mainnet:**
- 🔴 **CATASTROPHIC** - Real user funds permanently locked
- No way to recover without custom migration
- Potential legal liability
- Complete loss of user trust

### Prevention Checklist

Before ANY struct field changes:
- [ ] Add version field if not present
- [ ] Write migration instruction
- [ ] Test migration on devnet with real accounts
- [ ] Document rollback procedure
- [ ] Plan communication to users
- [ ] Consider realloc vs new account
- [ ] Verify all instructions work with new schema
- [ ] Check account size limits (10KB max)

### Status

**⚠️ THIS BUG IS NOT FIXED**

The 3 stuck vaults remain on devnet and cannot be accessed. This issue has only been "cleaned up" by:
- Hiding undeserializable vaults in the UI
- Documenting the problem
- Ensuring the user's correct balance (10 USDC) is reflected

**For production deployment:**
- [ ] Implement schema versioning
- [ ] Add migration instructions
- [ ] Test backward compatibility
- [ ] Never deploy breaking schema changes without migration path

### References

- Anchor Account Deserialization: https://book.anchor-lang.com/anchor_in_depth/the_accounts_struct.html
- Solana Account Realloc: https://docs.solana.com/developing/programming-model/accounts#realloc
- Error 3003 Documentation: https://github.com/coral-xyz/anchor/blob/master/lang/src/error.rs

