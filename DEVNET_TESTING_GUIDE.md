# Devnet Testing Guide — Keepr Vault

**Date:** 2025-10-01  
**Network:** Devnet  
**Status:** Ready for Testing

---

## Quick Start

### 1. Server Running
✅ Development server started at: **http://localhost:3000**

### 2. Prerequisites

**Wallet:**
- Phantom wallet installed (Chrome extension or mobile app)
- Wallet connected to **Devnet** network

**Funds Needed:**
- ~0.5 SOL for transaction fees (get from devnet faucet)
- Test USDC tokens (we'll provide)

---

## Setup Instructions

### Step 1: Configure Phantom for Devnet

1. Open Phantom wallet
2. Click Settings (gear icon)
3. Go to "Developer Settings"
4. Enable "Testnet Mode"
5. Select "Devnet" from network dropdown
6. Verify you see "Devnet" badge in wallet

### Step 2: Get Devnet SOL

**Option A: Phantom Faucet**
1. In Phantom, click "Receive"
2. Click "Airdrop" button
3. Select amount (1-2 SOL)
4. Wait for confirmation

**Option B: CLI Faucet**
```bash
solana airdrop 1 <YOUR_WALLET_ADDRESS> --url devnet
```

**Option C: Web Faucet**
- Visit: https://faucet.solana.com
- Paste your wallet address
- Request airdrop

### Step 3: Get Test USDC

**Your Wallet Address:** (copy from Phantom)

**Send me your address and I'll send you test USDC tokens!**

Or use this command if you have the test mint:
```bash
spl-token transfer BTYDiUpZuxzswKhbg8C8sJcYNjua4D7186rU2fzxUjjt \
  <AMOUNT> <YOUR_WALLET> \
  --url devnet \
  --fund-recipient
```

---

## Testing Flows

### Flow 1: Create Vault + Deposit

**Objective:** Create a vault and deposit test USDC

**Steps:**
1. **Open App**
   - Navigate to http://localhost:3000
   - Click "Connect Wallet"
   - Approve connection in Phantom

2. **Create Vault**
   - Click "Create Vault" button
   - Fill in form:
     - **Vault Name:** "Test Vault 1"
     - **Amount:** 1 (or any amount you have)
     - **Beneficiary:** Your wallet address (for testing) or another address
     - **Unlock Date/Time:** 5 minutes from now
   - Click "Review"

3. **Review Screen**
   - Verify all details are correct
   - Note the warning about irreversibility
   - Click "Confirm & Lock"

4. **Sign Transaction 1 (Create)**
   - Phantom will pop up
   - Review transaction details
   - Click "Approve"
   - Wait for confirmation (~2-5 seconds)

5. **Sign Transaction 2 (Deposit)**
   - Phantom will pop up again
   - Review token transfer
   - Click "Approve"
   - Wait for confirmation

6. **Success Screen**
   - Note the vault address
   - Copy transaction signature
   - Click "View Vault" or "Create Another"

**Expected Results:**
- ✅ Vault created successfully
- ✅ Test USDC deducted from your balance
- ✅ Vault appears in dashboard
- ✅ Countdown timer shows time remaining

**Verification:**
```bash
# Check vault account
solana account <VAULT_ADDRESS> --url devnet

# Check vault token account balance
spl-token accounts BTYDiUpZuxzswKhbg8C8sJcYNjua4D7186rU2fzxUjjt --url devnet
```

---

### Flow 2: View Dashboard

**Objective:** View all your vaults

**Steps:**
1. Click "My Vaults" in header
2. Observe vault cards with:
   - Vault name
   - Amount locked
   - Countdown timer
   - Status badge (Locked/Unlocked)
   - Beneficiary address

3. Click on a vault card

**Expected Results:**
- ✅ All vaults listed
- ✅ Countdown updates every second
- ✅ Status badges correct
- ✅ Click navigates to detail page

---

### Flow 3: View Vault Detail

**Objective:** View detailed vault information

**Steps:**
1. From dashboard, click a vault
2. Observe:
   - Full vault details
   - Large countdown timer
   - Activity log
   - Release button state

**Expected Results:**
- ✅ All vault info displayed
- ✅ Countdown accurate
- ✅ Activity log shows create + deposit events
- ✅ Release button disabled (if locked)
- ✅ Release button enabled (if unlocked)

---

### Flow 4: Release Funds (After Unlock)

**Objective:** Release funds to beneficiary after unlock time

**Prerequisites:**
- Vault unlock time has passed
- Connected as beneficiary wallet

**Steps:**
1. Navigate to vault detail page
2. Observe "Release Funds" button is enabled
3. Click "Release Funds"
4. Review confirmation screen
5. Click "Confirm Release"
6. Sign transaction in Phantom
7. Wait for confirmation

**Expected Results:**
- ✅ Transaction succeeds
- ✅ Beneficiary receives test USDC
- ✅ Vault marked as "Released"
- ✅ Success screen shows transaction signature

**Verification:**
```bash
# Check beneficiary balance increased
spl-token accounts BTYDiUpZuxzswKhbg8C8sJcYNjua4D7186rU2fzxUjjt --url devnet

# Check vault token account is empty
spl-token account-info <VAULT_TOKEN_ACCOUNT> --url devnet
```

---

## Test Scenarios

### Scenario 1: Happy Path
- ✅ Create vault with 5-minute unlock
- ✅ Deposit 1 test USDC
- ✅ Wait 5 minutes
- ✅ Release to beneficiary
- ✅ Verify funds received

### Scenario 2: Multiple Vaults
- ✅ Create 3 vaults with different unlock times
- ✅ Verify all appear in dashboard
- ✅ Verify countdowns are independent
- ✅ Release each after unlock

### Scenario 3: Different Beneficiaries
- ✅ Create vault with your address as beneficiary
- ✅ Create vault with different address as beneficiary
- ✅ Verify release works for both

### Scenario 4: Edge Cases
- ⚠️ Try creating vault with past unlock time (should fail)
- ⚠️ Try depositing 0 amount (should fail)
- ⚠️ Try releasing before unlock (should fail)
- ⚠️ Try releasing twice (should fail)

---

## Known Behaviors

### Two Signatures Required
**Why:** Solana stack limit (4KB) prevents combining create + deposit in one transaction  
**Impact:** Users sign twice (acceptable tradeoff)  
**Status:** Expected behavior

### Test Token vs Real USDC
**Why:** Devnet doesn't have real USDC  
**Impact:** Using test token with same properties (6 decimals)  
**Status:** Expected behavior

### Countdown Drift
**Why:** Client-side countdown may drift from on-chain time  
**Impact:** Release button may enable slightly early/late  
**Status:** Release transaction validates on-chain time (authoritative)

---

## Troubleshooting

### "Insufficient SOL for transaction"
**Solution:** Get more devnet SOL from faucet

### "Insufficient USDC balance"
**Solution:** Request test USDC tokens (see Setup Step 3)

### "Transaction simulation failed"
**Possible Causes:**
- Unlock time in the past
- Amount exceeds cap (500 USDC)
- Wrong network (check Phantom is on Devnet)
- Insufficient balance

**Solution:** Check error message, verify inputs, try again

### "Wallet not connected"
**Solution:** Click "Connect Wallet" and approve in Phantom

### Countdown shows negative time
**Cause:** Vault already unlocked  
**Solution:** This is normal, release button should be enabled

### Release button disabled after unlock
**Cause:** Page needs refresh or countdown hasn't updated  
**Solution:** Refresh page or wait a few seconds

---

## Explorer Links

### View Transactions
**Devnet Explorer:** https://explorer.solana.com/?cluster=devnet

**Check Transaction:**
```
https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet
```

### View Accounts

**Program:**
```
https://explorer.solana.com/address/74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK?cluster=devnet
```

**Config PDA:**
```
https://explorer.solana.com/address/2ZLGQe7moMmjeS6D4bPQhUs8vqPQqqamXhQowPMVa71D?cluster=devnet
```

**Your Vault:**
```
https://explorer.solana.com/address/<VAULT_ADDRESS>?cluster=devnet
```

---

## Testing Checklist

### Pre-Testing
- [ ] Phantom wallet installed
- [ ] Wallet set to Devnet
- [ ] Devnet SOL acquired (~0.5 SOL)
- [ ] Test USDC tokens acquired
- [ ] Dev server running (http://localhost:3000)

### Create Flow
- [ ] Connect wallet successful
- [ ] Form validation works
- [ ] Review screen shows correct data
- [ ] Transaction 1 (create) succeeds
- [ ] Transaction 2 (deposit) succeeds
- [ ] Success screen displays
- [ ] Vault appears in dashboard

### Dashboard
- [ ] All vaults listed
- [ ] Countdown timers update
- [ ] Status badges correct
- [ ] Click vault navigates to detail

### Detail Page
- [ ] All vault info displayed
- [ ] Countdown accurate
- [ ] Activity log populated
- [ ] Release button state correct

### Release Flow
- [ ] Release button enables after unlock
- [ ] Confirmation screen shows
- [ ] Transaction succeeds
- [ ] Beneficiary receives funds
- [ ] Vault marked as released

### Edge Cases
- [ ] Past unlock time rejected
- [ ] Zero amount rejected
- [ ] Premature release rejected
- [ ] Double release rejected

---

## Support

### Get Help
- Check console for errors (F12 → Console tab)
- Check Phantom for transaction details
- View transaction on explorer
- Share error messages for debugging

### Report Issues
- Screenshot error messages
- Copy transaction signatures
- Note wallet address
- Describe steps to reproduce

---

## Next Steps After Testing

1. **Document Results**
   - Note any issues found
   - Capture screenshots
   - Record transaction signatures

2. **Provide Feedback**
   - UX improvements
   - Error messages clarity
   - Performance observations

3. **Prepare for Mainnet**
   - Review test results
   - Address any issues
   - Update documentation

---

**Testing URL:** http://localhost:3000  
**Network:** Devnet  
**Program ID:** 74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK  
**Test USDC:** BTYDiUpZuxzswKhbg8C8sJcYNjua4D7186rU2fzxUjjt  

**Ready to test!** 🚀
