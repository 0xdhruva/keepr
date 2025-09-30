# Gate C Test Guide — Create Vault Flow

**Status:** Ready for testing  
**URL:** http://localhost:3000

---

## Quick Sanity Check

### 1. Start Dev Server
```bash
cd web
npm run dev
```

Open http://localhost:3000

### 2. Connect Wallet
- Click "Select Wallet" in header
- Choose Phantom
- Approve connection
- ✅ Verify: Wallet address shows in header, green dot visible

### 3. Navigate to Create Vault
- Click "Create Vault" button on homepage
- ✅ Verify: Redirects to `/create` page

### 4. Test Form Validation

**Empty Form:**
- Click "Continue to Review" without filling anything
- ✅ Verify: All 4 fields show error messages

**Invalid Amount:**
- Enter "abc" in amount → ✅ Should not allow letters
- Enter "1000" → ✅ Should show "Amount cannot exceed 500 USDC"
- Enter "0" → Continue → ✅ Should show "Amount must be greater than 0"

**Invalid Address:**
- Enter "invalid" in beneficiary
- Continue
- ✅ Verify: Shows "Invalid Solana address"

**Valid Address:**
- Enter any valid Solana address (e.g., your own wallet)
- ✅ Verify: Green checkmark appears, truncated address shows below

**Invalid Unlock Time:**
- Select a time less than 5 minutes from now
- Continue
- ✅ Verify: Shows "Unlock time must be at least 5 minutes in the future"

**Valid Form:**
- Name: "Test Vault"
- Amount: "10"
- Unlock Time: 10 minutes from now
- Beneficiary: Valid Solana address
- Click "Continue to Review"
- ✅ Verify: Moves to review screen

### 5. Test Review Screen

**Verify Display:**
- ✅ Vault name shows correctly
- ✅ Amount shows "10 USDC" in purple
- ✅ Unlock date/time formatted correctly
- ✅ Beneficiary address shows in monospace font
- ✅ Orange warning box visible

**Back Button:**
- Click "Back to Edit"
- ✅ Verify: Returns to form with all data preserved

**Confirm:**
- Click "Continue to Review" again
- Click "Confirm & Lock"
- ✅ Verify: Shows processing screen with spinning animation

### 6. Test Processing & Success

**Processing:**
- ✅ Verify: Purple spinning icon
- ✅ Verify: "Creating Vault..." message
- Wait 2 seconds (mock delay)

**Success:**
- ✅ Verify: Green checkmark appears
- ✅ Verify: "Vault Created Successfully!" message
- ✅ Verify: Vault details show (name, amount, transaction)
- ✅ Verify: Two buttons: "Create Another" and "View Vault"

**Create Another:**
- Click "Create Another"
- ✅ Verify: Returns to empty form

**View Vault:**
- Fill form again and complete
- Click "View Vault"
- ✅ Verify: Redirects to `/vaults/[vaultPda]` (placeholder page for now)

---

## Edge Cases to Test

### Responsive Design
- Resize browser to mobile width (375px)
- ✅ Verify: All form fields stack vertically
- ✅ Verify: Buttons are full-width and touch-friendly
- ✅ Verify: Text is readable

### Input Constraints
- **Amount:** Try entering more than 6 decimals → ✅ Should truncate
- **Name:** Try entering 51+ characters → ✅ Should stop at 50
- **Address:** Try pasting with spaces → ✅ Should trim automatically

### Browser Back Button
- Fill form, go to review
- Click browser back button
- ✅ Verify: Returns to form with data intact

### Disconnect Wallet
- On create page, disconnect wallet
- ✅ Verify: Redirects to homepage

---

## Known Limitations (Expected)

1. **Mock Transactions:** Currently simulates 2-second delay, doesn't actually create on-chain vault
2. **View Vault:** Redirects to placeholder page (Gate D will implement this)
3. **No Real Balance Check:** Doesn't verify you have USDC balance
4. **No Real Address Validation:** Accepts any valid base58 string

---

## What to Look For

### ✅ Good Signs
- Smooth transitions between steps
- Clear error messages
- Visual feedback (green checkmarks, loading states)
- No console errors
- Responsive layout works
- Form state persists when going back

### ⚠️ Issues to Report
- Console errors
- Broken layout on mobile
- Validation not working
- Form data lost when navigating
- Buttons not clickable
- Text overflow or truncation issues

---

## Quick Test Script (2 minutes)

```
1. Connect Phantom → ✅
2. Click "Create Vault" → ✅
3. Fill form with valid data → ✅
4. Continue to Review → ✅
5. Confirm & Lock → ✅
6. Wait for success → ✅
7. Click "Create Another" → ✅
8. Verify form is empty → ✅
```

---

## Next Steps After Testing

If everything looks good:
- ✅ Gate C approved
- → Proceed to Gate D (Dashboard & Detail)
- → Then Gate E (Release Flow)

If issues found:
- Report specific problems
- I'll fix and we'll retest

---

**Ready to test? Let me know what you find!**
