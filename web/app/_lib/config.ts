/**
 * Environment-specific configuration for Keepr
 *
 * This file centralizes all differences between devnet and mainnet:
 * - Time units (minutes for devnet, days for mainnet)
 * - Minimum periods (2 mins for devnet, 24 hours for mainnet)
 * - RPC endpoints
 * - USDC mint addresses
 * - Program IDs
 */

export type Network = 'devnet' | 'mainnet';

export interface CheckinPreset {
  label: string;
  period: number; // in time units (minutes or days)
  notificationWindow: number; // in time units
  gracePeriod: number; // in time units
  description: string;
}

export interface NetworkConfig {
  // Network identification
  network: Network;
  networkLabel: string;
  rpcUrl: string;

  // Program addresses
  programId: string;
  usdcMint: string;

  // Time configuration
  timeUnit: 'minutes' | 'hours' | 'days';
  timeUnitLabel: string;
  timeUnitPlural: string;
  minCheckinPeriod: number; // in seconds
  minCheckinPeriodDisplay: string; // human-readable

  // Default values for create vault form
  defaultCheckinPeriod: number; // in the configured time unit
  defaultNotificationWindow: number; // in the configured time unit
  defaultGracePeriod: number; // in the configured time unit

  // Check-in presets
  checkinPresets: CheckinPreset[];

  // Validation limits
  maxLockPerVault: number; // in base units (6 decimals for USDC)

  // Explorer URLs
  explorerUrl: string;
}

const DEVNET_CONFIG: NetworkConfig = {
  network: 'devnet',
  networkLabel: 'DEVNET',
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',

  programId: process.env.NEXT_PUBLIC_PROGRAM_ID || '74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK',
  usdcMint: process.env.NEXT_PUBLIC_USDC_MINT || 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',

  // Devnet uses MINUTES for fast testing
  timeUnit: 'minutes',
  timeUnitLabel: 'minute',
  timeUnitPlural: 'minutes',
  minCheckinPeriod: 120, // 2 minutes in seconds
  minCheckinPeriodDisplay: '2 minutes',

  // Devnet defaults (in minutes)
  defaultCheckinPeriod: 5, // 5 minutes
  defaultNotificationWindow: 2, // 2 minutes before deadline
  defaultGracePeriod: 2, // 2 minutes after deadline (matches notification window)

  // Devnet check-in presets (for testing)
  checkinPresets: [
    { label: '5 Minutes', period: 5, notificationWindow: 2, gracePeriod: 2, description: 'Quick test cycle' },
    { label: '10 Minutes', period: 10, notificationWindow: 3, gracePeriod: 3, description: 'Medium test cycle' },
    { label: '30 Minutes', period: 30, notificationWindow: 5, gracePeriod: 5, description: 'Long test cycle' },
  ],

  maxLockPerVault: 500_000_000, // 500 USDC

  explorerUrl: 'https://explorer.solana.com',
};

const MAINNET_CONFIG: NetworkConfig = {
  network: 'mainnet',
  networkLabel: 'MAINNET',
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com',

  programId: process.env.NEXT_PUBLIC_PROGRAM_ID || '74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK',
  usdcMint: process.env.NEXT_PUBLIC_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',

  // Mainnet uses DAYS for production
  timeUnit: 'days',
  timeUnitLabel: 'day',
  timeUnitPlural: 'days',
  minCheckinPeriod: 86400, // 24 hours in seconds
  minCheckinPeriodDisplay: '1 day',

  // Mainnet defaults (in days)
  defaultCheckinPeriod: 30, // 30 days (monthly check-in)
  defaultNotificationWindow: 7, // 7 days warning
  defaultGracePeriod: 7, // 7 days grace period (matches notification window)

  // Mainnet check-in presets (production timescales)
  checkinPresets: [
    {
      label: 'Weekly',
      period: 7,
      notificationWindow: 1,
      gracePeriod: 1,
      description: 'Check in every week (24-hour window)',
    },
    {
      label: 'Monthly',
      period: 30,
      notificationWindow: 7,
      gracePeriod: 7,
      description: 'Check in every month (7-day window)',
    },
    {
      label: 'Quarterly',
      period: 90,
      notificationWindow: 7,
      gracePeriod: 7,
      description: 'Check in every 3 months (7-day window)',
    },
  ],

  maxLockPerVault: 500_000_000, // 500 USDC

  explorerUrl: 'https://explorer.solana.com',
};

/**
 * Get current network configuration based on environment
 */
export function getNetworkConfig(): NetworkConfig {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet';
  return cluster === 'mainnet' ? MAINNET_CONFIG : DEVNET_CONFIG;
}

/**
 * Check if running on devnet
 */
export function isDevnet(): boolean {
  return getNetworkConfig().network === 'devnet';
}

/**
 * Check if running on mainnet
 */
export function isMainnet(): boolean {
  return getNetworkConfig().network === 'mainnet';
}

/**
 * Convert time value to seconds based on current network's time unit
 */
export function timeToSeconds(value: number): number {
  const config = getNetworkConfig();

  switch (config.timeUnit) {
    case 'minutes':
      return value * 60;
    case 'hours':
      return value * 3600;
    case 'days':
      return value * 86400;
    default:
      return value;
  }
}

/**
 * Convert seconds to time value based on current network's time unit
 */
export function secondsToTime(seconds: number): number {
  const config = getNetworkConfig();

  switch (config.timeUnit) {
    case 'minutes':
      return Math.round(seconds / 60);
    case 'hours':
      return Math.round(seconds / 3600);
    case 'days':
      return Math.round(seconds / 86400);
    default:
      return seconds;
  }
}

/**
 * Format time value with appropriate unit
 */
export function formatTimeValue(value: number): string {
  const config = getNetworkConfig();
  const unit = value === 1 ? config.timeUnitLabel : config.timeUnitPlural;
  return `${value} ${unit}`;
}

/**
 * Get explorer URL for transaction
 */
export function getExplorerUrl(signature: string): string {
  const config = getNetworkConfig();
  const cluster = config.network === 'devnet' ? '?cluster=devnet' : '';
  return `${config.explorerUrl}/tx/${signature}${cluster}`;
}

/**
 * Get explorer URL for address (account/program)
 */
export function getExplorerAddressUrl(address: string): string {
  const config = getNetworkConfig();
  const cluster = config.network === 'devnet' ? '?cluster=devnet' : '';
  return `${config.explorerUrl}/address/${address}${cluster}`;
}
