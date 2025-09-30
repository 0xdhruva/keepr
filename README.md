# Keepr — Peace of mind in minutes

**Week-1 Web MVP:** Time-locked USDC vaults on Solana mainnet.

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Phantom wallet (desktop extension or mobile app)
- Solana mainnet RPC endpoint (optional: use paid provider like Helius/QuickNode)

### Installation

```bash
# Install web dependencies
cd web
npm install

# Copy environment template
cp ../.env.example .env.local

# Edit .env.local with your RPC URL and other config
```

### Development

```bash
# Start Next.js dev server
cd web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Mobile:** Open the URL in **Phantom → Browser** for the best experience.

### Build

```bash
cd web
npm run build
npm start
```

---

## Project Structure

```
├── web/                          # Next.js web app
│   ├── app/
│   │   ├── _components/          # React components
│   │   ├── _lib/                 # Utilities (Solana, formatting, storage)
│   │   ├── _state/               # State management (coming)
│   │   ├── create/               # Create vault page
│   │   ├── vaults/               # Dashboard & detail pages
│   │   └── page.tsx              # Landing page
│   └── .env.local                # Environment config (not committed)
├── programs/keepr-vault/         # Anchor program (coming in Gate B)
├── memory/                       # Project memory (addresses, artifacts, milestones)
├── plan.md                       # Implementation plan (MoSCoW + Gates)
├── DECISIONS.md                  # Architecture decisions
├── RISKS.md                      # Risk register
├── QUESTIONS.md                  # Open questions
└── CHANGELOG.md                  # Incremental changes
```

---

## Review Gates

### ✅ Gate A — Wallet Scaffold (COMPLETED)
- [x] Next.js app with Tailwind
- [x] Phantom wallet connect/disconnect
- [x] MAINNET badge
- [x] Environment configuration
- [x] Responsive landing page

**Status:** Ready for review

### Gate B — Program Skeleton (PENDING)
- [ ] Anchor program with Config/Counter/Vault PDAs
- [ ] All instructions (init_config, create_vault, deposit_usdc, release)
- [ ] Localnet tests

### Gate C — Create Flow (PENDING)
- [ ] Create vault form with validation
- [ ] On-chain create + deposit
- [ ] Review screen

### Gate D — Dashboard & Detail (PENDING)
- [ ] Vault listing
- [ ] Live countdown
- [ ] Local caching

### Gate E — Release Flow (PENDING)
- [ ] Post-unlock release
- [ ] Explorer links
- [ ] Success/error UX

---

## Environment Variables

See `.env.example` for all required variables.

**Critical:**
- `NEXT_PUBLIC_RPC_URL`: Use a paid RPC provider for production
- `NEXT_PUBLIC_PROGRAM_ID`: Set after program deployment
- `NEXT_PUBLIC_NETWORK_BADGE`: Always "MAINNET" for production

---

## Safety Rails

- **Per-vault cap:** 500 USDC default (adjustable via `update_config`)
- **Pause switch:** Admin can halt new vault creation
- **USDC-only:** Enforced on-chain via mint validation
- **No admin withdrawal:** Funds only move to beneficiary via `release()`
- **Time-locked:** Release only after `unlock_unix` timestamp

---

## Testing

### Program Tests (Localnet)
```bash
cd programs/keepr-vault
anchor test
```

### Web App (Manual on Mainnet)
1. Connect Phantom wallet
2. Create vault with small USDC amount (e.g., 1 USDC)
3. Verify countdown and vault details
4. Wait for unlock time
5. Release to beneficiary
6. Verify funds in beneficiary's wallet

---

## Deployment

### Program
```bash
cd programs/keepr-vault
anchor build
anchor deploy --provider.cluster mainnet
```

### Web App (Vercel)
```bash
cd web
vercel --prod
```

Set environment variables in Vercel dashboard.

---

## Support

For questions or issues, see `QUESTIONS.md` or open an issue.

**Mobile users:** Always use Phantom in-app browser for wallet integration.
