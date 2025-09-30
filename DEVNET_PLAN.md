# Devnet Deployment Plan

**Status:** READY  
**Date:** 2025-09-30 16:59  
**Approach:** Skip local build, deploy to devnet directly

---

## Setup Complete ✅

- [x] Solana CLI configured for devnet
- [x] Keypair generated: `GeQ3YtidFiviY7Bb7ZuZK3mEPV6XXhpmGvycH4s7dJ5S`
- [x] Devnet SOL airdropped: 2 SOL
- [x] Anchor.toml updated to use devnet

---

## Deployment Strategy

Since we can't build locally due to Rust version issues, we'll:

1. **Use pre-built program** (if available)
2. **OR deploy via CI/CD** (GitHub Actions with Linux)
3. **OR use Docker** to build then deploy

For now, let's focus on **web app integration** with devnet:

---

## Next Steps

### Option A: Deploy Pre-built Program
If we have a .so file from previous build:
```bash
solana program deploy target/deploy/keepr_vault.so
```

### Option B: Build via Docker
```bash
# Build in Docker
docker run --rm -v $(pwd):/workspace -w /workspace \
  projectserum/build:v0.30.1 anchor build

# Deploy
anchor deploy --provider.cluster devnet
```

### Option C: Skip Deployment, Use Mocks
- Continue web app development
- Use mock transactions
- Deploy program later via CI/CD

---

## Web App Integration

Update web app to use devnet:

**File:** `web/.env.local`
```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_HOST=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
```

---

## Testing on Devnet

Once deployed:

1. **Connect wallet** to devnet
2. **Airdrop devnet SOL** for testing
3. **Create vault** with real transaction
4. **Verify on Solana Explorer** (devnet)
5. **Test release flow**

---

## Resources Needed

- ✅ 2 SOL (for deployment + testing)
- ⏳ Program build (.so file)
- ⏳ Devnet USDC (for testing deposits)

---

## Current Status

**Wallet:** GeQ3YtidFiviY7Bb7ZuZK3mEPV6XXhpmGvycH4s7dJ5S  
**Balance:** 2 SOL  
**Network:** Devnet  
**Program ID:** Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS (placeholder)

---

## Recommendation

**Proceed with Option C** (Skip deployment, continue web app):
- Focus on UI/UX improvements
- Use mock transactions for now
- Deploy program later when we have proper build environment

This unblocks progress while we set up proper CI/CD or Docker build pipeline.

---

**Ready to continue with web app development on devnet!**
