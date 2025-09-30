import { Connection, clusterApiUrl } from '@solana/web3.js';

export const SOLANA_CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'mainnet-beta') as 'mainnet-beta' | 'devnet' | 'testnet';

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(SOLANA_CLUSTER);

export const connection = new Connection(RPC_URL, 'confirmed');

export const NETWORK_BADGE = process.env.NEXT_PUBLIC_NETWORK_BADGE || 'MAINNET';

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Keepr';

export const USDC_MINT = process.env.NEXT_PUBLIC_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export const MIN_UNLOCK_BUFFER_SECS = parseInt(process.env.NEXT_PUBLIC_MIN_UNLOCK_BUFFER_SECS || '300', 10);

export const MAX_LOCK_PER_VAULT = parseInt(process.env.NEXT_PUBLIC_MAX_LOCK_PER_VAULT || '500000000', 10);

export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || '';
