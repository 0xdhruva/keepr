# Transaction Failure Diagnosis

## Root Cause

**You don't have any devnet USDC tokens.** The transaction is failing because your wallet doesn't have a USDC token account on devnet.

## What I Found

### ✅ Program is correctly deployed
- Program ID: `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK`
- Config account exists and is properly initialized
- Admin: `GeQ3YtidFiviY7Bb7ZuZK3mEPV6XXhpmGvycH4s7dJ5S` (your wallet)
- USDC Mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (devnet USDC)
- Max lock per vault: 500 USDC
- Paused: false

### ✅ Web app configuration is correct
- `.env.local` has the correct devnet USDC mint
- Program ID matches deployed program
- Network is set to devnet

### ❌ Missing: Devnet USDC tokens
- Your wallet: `GeQ3YtidFiviY7Bb7ZuZK3mEPV6XXhpmGvycH4s7dJ5S`
- Expected token account: `3TiwxzSc1pbb6XSQsXQt6zqD8Xh8CHesQt2DnAfbBPnr`
- Status: **DOES NOT EXIST**

## Why Transactions Were Failing

When you tried to create a vault, the transaction simulation failed because:
1. You don't have a USDC token account
2. Even if the account existed, it would have 0 balance
3. The `depositUsdc` instruction can't transfer tokens that don't exist

## Solution

You need to get devnet USDC tokens. There are two options:

### Option 1: Use SPL Token Faucet (Easiest)
```bash
spl-token create-account 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU --url devnet
```

Then you'll need to find a devnet USDC faucet or airdrop service.

### Option 2: Manual Setup
I'll create a script that:
1. Creates your USDC token account
2. Mints some test USDC (if you have mint authority)
3. Shows your balance

## Next Steps

1. Get devnet USDC tokens
2. Verify balance with `npm run check-balance` (I'll create this script)
3. Try creating a vault again

## What We Learned

The error message "This transaction has already been processed" was misleading. What actually happened:
- Transaction simulation probably failed earlier
- The error we saw was from a retry or different issue
- The real problem is missing tokens, not IDL or program issues

## Technical Details

- **Devnet USDC Mint:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **Your Token Account (to be created):** `3TiwxzSc1pbb6XSQsXQt6zqD8Xh8CHesQt2DnAfbBPnr`
- **Config PDA:** `2ZLGQe7moMmjeS6D4bPQhUs8vqPQqqamXhQowPMVa71D`
