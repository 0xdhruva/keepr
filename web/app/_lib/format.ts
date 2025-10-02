/**
 * Format USDC amount from base units (6 decimals) to human-readable string
 */
export function formatUSDC(baseUnits: number | bigint): string {
  const amount = Number(baseUnits) / 1_000_000;
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/**
 * Parse USDC amount from human-readable string to base units (6 decimals)
 */
export function parseUSDC(amount: string): number {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error('Invalid USDC amount');
  }
  return Math.floor(parsed * 1_000_000);
}

/**
 * Format Solana address for display (truncate middle)
 */
export function formatAddress(address: string | undefined, chars = 4): string {
  if (!address) return 'Unknown';
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format Unix timestamp to human-readable date/time
 */
export function formatDateTime(unixTimestamp: number): string {
  return new Date(unixTimestamp * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Format time remaining as countdown string
 */
export function formatTimeRemaining(unixTimestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = unixTimestamp - now;

  if (diff <= 0) {
    return 'Unlocked';
  }

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
