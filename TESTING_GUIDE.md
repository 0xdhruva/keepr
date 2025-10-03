# Dead Man's Switch Testing Guide

## Quick Setup

### 1. Admin Status ✅
- **Your wallet:** `GeQ3YtidFiviY7Bb7ZuZK3mEPV6XXhpmGvycH4s7dJ5S`
- **You are admin:** YES
- **Devnet balance:** 4.55 SOL
- **Program ID:** `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK`

### 2. Initialize Config (Required First Step)

The config PDA needs to be initialized before you can create vaults. Run this from the project root:

```bash
# Using the web app (easiest way)
# Go to http://localhost:3000 and it should auto-initialize on first vault creation

# OR manually via Solana CLI:
# (This will fail with current anchor version mismatch, so use web app instead)
```

**Config Settings:**
- **USDC Mint (test):** `BTYDiUpZuxzswKhbg8C8sJcYNjua4D7186rU2fzxUjjt`
- **Max lock per vault:** 500,000,000 (500 USDC with 6 decimals)
- **Paused:** false

### 3. Get Test USDC

You need test USDC tokens on devnet:

```bash
# Check if you have test USDC
spl-token accounts --url devnet

# If you need to mint test USDC (you're the mint authority):
spl-token mint BTYDiUpZuxzswKhbg8C8sJcYNjua4D7186rU2fzxUjjt 100 --url devnet
```

## Testing Scenarios

### Scenario 1: Quick Test (5 minutes total)

Create a vault with very short periods to test the full flow quickly:

**Modify the create page temporarily** to use short periods:
```typescript
// In web/app/create/page.tsx, change:
notificationWindowSeconds: 60,        // 1 minute (instead of 7 days)
gracePeriodSeconds: 60,               // 1 minute (instead of 7 days)
```

**Set unlock time:** 3 minutes from now

**Timeline:**
- **0:00** - Create vault with 1 USDC
- **2:00** - Notification window starts (can check in)
- **2:30** - Test check-in at `/vaults/[vault-pda]/checkin`
- **3:00** - Unlock time reached (grace period starts)
- **4:00** - Grace period ends, release allowed
- **4:00** - Test release at `/vaults/[vault-pda]/release`

### Scenario 2: Realistic Test (7 days notification + 7 days grace)

Use default settings (already in code):
- **Notification window:** 7 days before unlock
- **Grace period:** 7 days after unlock
- **Total vault period:** 14+ days

**Timeline:**
- Create vault with unlock time = 14 days from now
- Days 1-6: No check-in allowed (too early)
- Days 7-14: Notification window (check-in allowed)
- Day 14: Unlock time reached
- Days 14-21: Grace period (can still check in to reset)
- Day 21: Release allowed

### Scenario 3: Check-In Reset Test

1. Create vault with 3 min unlock, 1 min notification, 1 min grace
2. Wait until notification window
3. Check in → should reset unlock time by adding vault_period_seconds
4. Check on-chain data to verify new unlock_unix

## How to Test Each Feature

### A. Create Vault
1. Go to `http://localhost:3000/create`
2. Fill in form:
   - Name: "Test Vault"
   - Amount: 1 USDC
   - Beneficiary: Your other wallet or a test address
   - Unlock Time: Set based on scenario above
3. Confirm and wait for both transactions (create + deposit)

### B. Check-In
1. Go to `http://localhost:3000/vaults` to find your vault
2. Click on the vault
3. Go to `/vaults/[vault-pda]/checkin`
4. Click "Check In"
5. Wait for confirmation

**Expected behavior:**
- ✅ Works during notification window
- ✅ Works during grace period
- ❌ Fails if too early (before notification window)
- ❌ Fails if already released

### C. Release
1. Wait until grace period ends
2. Go to `/vaults/[vault-pda]/release`
3. Anyone can trigger release (not just beneficiary)
4. Funds go to beneficiary's ATA

**Expected behavior:**
- ❌ Fails before `unlock_unix + grace_period_seconds`
- ✅ Works after grace period ends
- ✅ Permissionless (anyone can call)

### D. Close Vault
After release completes:
- Vault has `released = true` and `amount_locked = 0`
- Anyone can call `close_vault`
- Creator receives rent refund (~0.002 SOL)

## Debugging Tips

### Check Vault State On-Chain

```bash
# Get vault account data
solana account <VAULT_PDA> --url devnet --output json | jq '.data'

# Decode specific fields (you have scripts for this)
node scripts/decode-vault.js
```

### Check Transaction Logs

```bash
# View transaction details
solana confirm <TX_SIGNATURE> --url devnet -v
```

### Check Program Logs

All program logs appear in browser console when using the web app.

### Common Errors

| Error | Meaning | Solution |
|-------|---------|----------|
| `NotInNotificationWindow` | Too early to check in | Wait until 7 days before unlock |
| `InvalidUnlockTime` | Trying to release during grace | Wait until grace period ends |
| `AlreadyReleased` | Vault already released | Can't check in after release |
| `Unauthorized` | Not the creator | Only creator can check in |

## Admin Controls

As admin, you can:

### Update Config
```typescript
program.methods
  .updateConfig(
    new PublicKey(newUsdcMint),  // or null to keep current
    new BN(1000000000),          // new cap, or null
    true                          // pause creation, or null
  )
  .accounts({
    config: configPda,
    admin: yourWallet,
  })
  .rpc();
```

### Pause Vault Creation
```typescript
program.methods
  .updateConfig(null, null, true)  // Set paused = true
  .accounts({ config: configPda, admin: yourWallet })
  .rpc();
```

### Change USDC Mint
```typescript
program.methods
  .updateConfig(
    new PublicKey('NEW_MINT_ADDRESS'),
    null,
    null
  )
  .accounts({ config: configPda, admin: yourWallet })
  .rpc();
```

## Verification Checklist

- [ ] Config initialized successfully
- [ ] Can create vault with default settings (7d/7d)
- [ ] Can create vault with custom settings
- [ ] Check-in fails before notification window
- [ ] Check-in works during notification window
- [ ] Check-in resets unlock time correctly
- [ ] Release fails during grace period
- [ ] Release works after grace period
- [ ] Release is permissionless (non-beneficiary can trigger)
- [ ] Funds go to correct beneficiary
- [ ] Close vault works and rent goes to creator
- [ ] Close vault is permissionless

## Next Steps

After testing on devnet:
1. Review RISKS.md for security considerations
2. Consider audit before mainnet
3. Update mainnet deployment plan
4. Set up proper admin multisig for mainnet

## Support

Check these files for more info:
- `CLAUDE.md` - Development guide
- `DECISIONS.md` - Architecture decisions
- `P1_PROGRAM_STRUCTURE.md` - Program structure
- `RISKS.md` - Security considerations
