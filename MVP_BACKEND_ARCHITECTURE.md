# Keepr MVP Backend Architecture

**Goal:** Free, robust backend for notifications and blockchain state management

**Total Cost:** $0/month (until scale)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              Frontend (Vercel - Free)               │
│  Next.js Web App + API Routes                       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│           Supabase (Free Tier - 500MB)              │
│  ┌─────────────────────────────────────────────┐   │
│  │         PostgreSQL Database                  │   │
│  │  - users, vaults, notifications              │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │         Edge Functions (Deno)                │   │
│  │  1. Blockchain Indexer (cron: every 5 min)  │   │
│  │  2. Notification Scheduler (cron: every min)│   │
│  │  3. Notification Sender (cron: every min)   │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌─────────┐
   │ Solana │ │ Resend │ │Telegram │
   │  RPC   │ │ Email  │ │Bot FREE │
   └────────┘ └────────┘ └─────────┘
```

---

## Tech Stack

| Component | Service | Free Tier | Purpose |
|-----------|---------|-----------|---------|
| **Database** | Supabase PostgreSQL | 500MB, 2M edge function calls | User profiles, vault metadata, notifications |
| **Backend Logic** | Supabase Edge Functions | Included | Blockchain indexer, notification scheduler |
| **Web Hosting** | Vercel | 100GB bandwidth | Next.js web app |
| **Keeper Bot** | Fly.io | 3 shared VMs | Auto-release expired vaults |
| **Email** | Resend | 3k emails/month | Email notifications |
| **Telegram** | Telegram Bot API | Unlimited FREE | Instant notifications |
| **Blockchain RPC** | Public Solana RPC | Free | Query vault state |

---

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  email TEXT,
  telegram_chat_id TEXT,
  notification_preferences JSONB DEFAULT '{
    "check_in_reminder": ["email", "telegram"],
    "grace_period": ["email", "telegram"],
    "vault_released": ["email", "telegram"]
  }',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vaults table (synced from blockchain)
CREATE TABLE vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_pda TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  creator TEXT NOT NULL,
  beneficiary TEXT NOT NULL,
  amount BIGINT NOT NULL,
  unlock_time TIMESTAMP NOT NULL,
  tier TEXT NOT NULL,
  released BOOLEAN DEFAULT FALSE,
  cancelled BOOLEAN DEFAULT FALSE,
  last_synced TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications queue
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  vault_pda TEXT NOT NULL,
  type TEXT NOT NULL, -- check_in_reminder, grace_period, vault_released
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_vaults_user_id ON vaults(user_id);
CREATE INDEX idx_vaults_unlock_time ON vaults(unlock_time);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE sent_at IS NULL;
```

---

## Core Components

### 1. Blockchain Indexer (Supabase Edge Function)

**Purpose:** Sync vault state from Solana → Database every 5 minutes

**Key Logic:**
- Query all vault accounts from Solana program
- Parse vault data (creator, beneficiary, amount, unlock_time, released, cancelled)
- Upsert to `vaults` table
- Update `last_synced` timestamp

**Cron:** Every 5 minutes

### 2. Notification Scheduler (Supabase Edge Function)

**Purpose:** Check vault states and queue notifications every minute

**Key Logic:**
- Query active vaults (not released/cancelled)
- Calculate time until unlock
- Queue notifications:
  - **Check-in reminder:** 24h before unlock
  - **Grace period:** When unlock time passes
  - **Vault released:** When vault is released by keeper bot
- Insert into `notifications` table

**Cron:** Every 1 minute

### 3. Notification Sender (Supabase Edge Function)

**Purpose:** Send queued notifications via Email + Telegram

**Key Logic:**
- Query pending notifications (sent_at IS NULL)
- For each notification:
  - Check user's channel preferences
  - Send via Email (Resend) if enabled
  - Send via Telegram (Bot API) if enabled
- Mark notification as sent

**Cron:** Every 1 minute

### 4. Keeper Bot (Fly.io)

**Purpose:** Auto-release expired vaults (existing implementation)

**Key Logic:**
- Query Supabase for vaults in grace period
- Build release transaction
- Submit to Solana
- Close vault to reclaim rent

**Location:** `scripts/keeper-bot/`

---

## Supabase Cron Jobs Setup

```sql
-- Blockchain indexer (every 5 minutes)
SELECT cron.schedule(
  'blockchain-indexer',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/blockchain-indexer',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- Notification scheduler (every 1 minute)
SELECT cron.schedule(
  'notification-scheduler',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/notification-scheduler',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);

-- Notification sender (every 1 minute)
SELECT cron.schedule(
  'notification-sender',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/notification-sender',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

---

## Web App Integration

### Replace localStorage with Supabase

```typescript
// web/app/_lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Get user's vaults (from database, not blockchain)
export async function getUserVaults(walletAddress: string) {
  const { data } = await supabase
    .from('vaults')
    .select('*')
    .eq('creator', walletAddress)
    .eq('cancelled', false)
    .order('created_at', { ascending: false });
  
  return data;
}

// Real-time subscription to vault updates
export function subscribeToVaultUpdates(vaultPda: string, callback: Function) {
  return supabase
    .channel(`vault:${vaultPda}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'vaults',
      filter: `vault_pda=eq.${vaultPda}`
    }, callback)
    .subscribe();
}
```

---

## Notification Channels

### Email (Resend)

**Setup:**
1. Sign up at resend.com
2. Verify domain (or use resend.dev for testing)
3. Get API key
4. Add to Supabase secrets

**Free Tier:** 3k emails/month

### Telegram (Bot API)

**Setup:**
1. Create bot via @BotFather on Telegram
2. Get bot token
3. Add to Supabase secrets
4. Implement linking flow in web app

**User Flow:**
1. User clicks "Connect Telegram" in settings
2. Opens deep link: `https://t.me/keepr_bot?start={wallet_address}`
3. Bot receives `/start` command with wallet address
4. Bot saves `chat_id` to database
5. User receives confirmation message

**Free Tier:** Unlimited (100% free forever)

---

## Cost Breakdown

### Free Tier Limits

| Service | Free Tier | When You'll Pay |
|---------|-----------|-----------------|
| Supabase | 500MB DB, 2M edge function calls/month | >500MB or >2M calls → $25/month |
| Vercel | 100GB bandwidth | >100GB → $20/month |
| Fly.io | 3 shared VMs | Need more resources → $5/month |
| Resend | 3k emails/month | >3k emails → $20/month |
| Telegram | Unlimited | Never (always free) |

**MVP Cost:** $0/month (supports ~100-500 users)

**Growth Cost (1k-5k users):** ~$50-70/month

---

## Implementation Checklist

### Phase 1: Database Setup (30 min)
- [ ] Create Supabase project
- [ ] Run schema migrations
- [ ] Set up Row Level Security (RLS) policies
- [ ] Get API keys

### Phase 2: Edge Functions (3 hours)
- [ ] Create `blockchain-indexer` function
- [ ] Create `notification-scheduler` function
- [ ] Create `notification-sender` function
- [ ] Test locally with `supabase functions serve`
- [ ] Deploy to Supabase

### Phase 3: Cron Jobs (15 min)
- [ ] Set up blockchain indexer cron (every 5 min)
- [ ] Set up notification scheduler cron (every 1 min)
- [ ] Set up notification sender cron (every 1 min)

### Phase 4: Web App Integration (2 hours)
- [ ] Install `@supabase/supabase-js`
- [ ] Replace localStorage with Supabase queries
- [ ] Add real-time subscriptions
- [ ] Build notification settings UI

### Phase 5: Telegram Bot (1 hour)
- [ ] Create bot via BotFather
- [ ] Implement linking flow
- [ ] Add deep link in settings page
- [ ] Test notification delivery

### Phase 6: Keeper Bot Migration (1 hour)
- [ ] Update keeper bot to query Supabase
- [ ] Deploy to Fly.io
- [ ] Test auto-release flow

**Total Time:** ~8 hours

---

## Environment Variables

### Supabase Edge Functions
```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK
USDC_MINT=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
RESEND_API_KEY=re_xxx
TELEGRAM_BOT_TOKEN=xxx:xxx
```

### Web App (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_PROGRAM_ID=74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK
```

### Keeper Bot (Fly.io secrets)
```bash
KEEPER_PRIVATE_KEY=base58_key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SOLANA_RPC_URL=https://api.devnet.solana.com
```

---

## Key Benefits

1. **100% Free for MVP** - No costs until you scale
2. **Real-time Updates** - Supabase subscriptions for live vault state
3. **Robust State Management** - Database as source of truth, synced from blockchain
4. **Multi-channel Notifications** - Email + Telegram (SMS/WhatsApp later)
5. **Scalable** - Easy to upgrade tiers as you grow
6. **Cross-platform Ready** - Backend supports web + future mobile apps

---

## Future Enhancements

### When You Scale (Post-MVP)
- [ ] Add SMS notifications (Twilio)
- [ ] Add WhatsApp notifications (Twilio Business API)
- [ ] Upgrade to dedicated RPC (Helius/QuickNode)
- [ ] Add Redis for caching
- [ ] Implement webhook system for real-time blockchain events
- [ ] Build mobile apps (React Native) using same backend
