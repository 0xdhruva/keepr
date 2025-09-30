# Devnet Testing Guide

**Program ID:** `74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK`  
**Network:** Devnet  
**Web App:** http://localhost:3000

---

## Step 1: Get Devnet USDC

### Option A: Use Devnet USDC Faucet (Easiest)
1. Go to https://faucet.circle.com/ (Circle's devnet faucet)
2. Or use https://spl-token-faucet.com/
3. Enter your wallet address: `GeQ3YtidFiviY7Bb7ZuZK3mEPV6XXhpmGvycH4s7dJ5S`
4. Request devnet USDC

### Option B: Use Phantom Wallet
1. Switch Phantom to Devnet
2. Use built-in devnet faucet
3. Get devnet USDC directly

### Option C: Manual Token Account (If needed)
```bash
# Create USDC token account
spl-token create-account EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Check balance
spl-token balance EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

---

## Step 2: Connect Wallet to Web App

1. Open http://localhost:3000
2. Click "Select Wallet" (should show DEVNET badge)
3. Connect your Phantom wallet
4. **Important:** Switch Phantom to Devnet network
   - Settings → Developer Settings → Testnet Mode → Devnet

---

## Step 3: Create Test Vault

### Test Scenario: 5-Minute Vault
- **Name:** "Test Vault 1"
- **Amount:** 1 USDC
- **Unlock Time:** 5 minutes from now
- **Beneficiary:** Your same address (for easy testing)

### Steps:
1. Click "Create Vault"
2. Fill in the form:
   - Name: `Test Vault 1`
   - Amount: `1` USDC
   - Unlock Date: Today
   - Unlock Time: Current time + 5 minutes
   - Beneficiary: `GeQ3YtidFiviY7Bb7ZuZK3mEPV6XXhpmGvycH4s7dJ5S`
3. Click "Review"
4. Confirm transaction in Phantom
5. Wait for confirmation

---

## Step 4: Verify Vault Created

1. Go to "View My Vaults"
2. You should see your vault card (lavender color = locked)
3. Click on the vault to see details
4. Verify:
   - Amount: 1 USDC
   - Status: Locked
   - Countdown timer showing ~5 minutes

---

## Step 5: Wait for Unlock

- Wait 5 minutes (or however long you set)
- Refresh the vault detail page
- Card should turn mint green (unlocked)
- Status should show "Ready to Release"

---

## Step 6: Release Funds

1. Click "Release Funds" button
2. Confirm transaction in Phantom
3. Wait for confirmation
4. Verify:
   - Status changes to "Released"
   - Card turns rose pink
   - USDC appears in beneficiary wallet

---

## Troubleshooting

### Issue: No USDC in wallet
**Solution:** Use Circle's devnet faucet or Phantom's built-in faucet

### Issue: Transaction fails
**Solution:** 
- Check you're on devnet
- Check you have enough SOL for fees (~0.01 SOL)
- Check USDC balance

### Issue: Wallet not connecting
**Solution:**
- Switch Phantom to devnet
- Refresh page
- Try disconnecting and reconnecting

### Issue: "Program not found"
**Solution:**
- Verify .env.local has correct program ID
- Restart dev server: `npm run dev`

---

## Expected Costs

- **Create Vault:** ~0.002 SOL (rent + fees)
- **Deposit USDC:** ~0.001 SOL (fees)
- **Release:** ~0.001 SOL (fees)
- **Total:** ~0.004 SOL per complete flow

---

## Verification

### Check on Solana Explorer
- Vault creation: https://explorer.solana.com/address/[vault_address]?cluster=devnet
- Transactions: https://explorer.solana.com/tx/[signature]?cluster=devnet

### Check Program State
```bash
# View program
solana program show 74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK

# Check SOL balance
solana balance
```

---

## Quick Test Checklist

- [ ] Devnet USDC obtained
- [ ] Wallet connected to devnet
- [ ] Web app running on localhost:3000
- [ ] DEVNET badge visible in header
- [ ] Create vault transaction succeeds
- [ ] Vault appears in dashboard
- [ ] Countdown timer works
- [ ] Unlock time passes
- [ ] Status changes to "Ready to Release"
- [ ] Release transaction succeeds
- [ ] USDC received by beneficiary

---

## Next Steps After Testing

1. Test edge cases (invalid amounts, past dates, etc.)
2. Test with different beneficiary address
3. Test multiple vaults
4. Test error handling
5. Prepare for mainnet deployment

---

**Ready to test! Start at Step 1 to get devnet USDC.** 🚀
