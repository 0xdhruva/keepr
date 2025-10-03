/**
 * Vault status utility
 * Determines the current state of a vault based on timestamps and dead man's switch params
 */

export type VaultStatus =
  | 'locked'               // Before notification window
  | 'notification'         // In notification window (can check-in)
  | 'grace_period'         // After unlock, before grace period ends
  | 'ready_for_release'    // After grace period, ready to release
  | 'released'             // Funds released to beneficiary
  | 'cancelled';           // Vault cancelled by creator

export interface VaultStatusInfo {
  status: VaultStatus;
  timeUntilNext?: number;        // Seconds until next phase (if applicable)
  canCheckIn: boolean;           // Can creator check in right now?
  canRelease: boolean;           // Can release be triggered right now?
  percentComplete: number;       // 0-100, progress through vault period
  notificationStartUnix: number; // When notification window starts
  graceEndUnix: number;          // When grace period ends
}

export interface VaultData {
  unlockUnix: number;                  // i64
  vaultPeriodSeconds: number;          // u32
  notificationWindowSeconds: number;   // u32
  gracePeriodSeconds: number;          // u32
  lastCheckinUnix: number;             // i64
  released: boolean;
  cancelled?: boolean;
}

/**
 * Calculate vault status and related info
 */
export function getVaultStatus(vault: VaultData, nowUnix?: number): VaultStatusInfo {
  const now = nowUnix ?? Math.floor(Date.now() / 1000);

  // Check if cancelled
  if (vault.cancelled) {
    return {
      status: 'cancelled',
      canCheckIn: false,
      canRelease: false,
      percentComplete: 0,
      notificationStartUnix: 0,
      graceEndUnix: 0,
    };
  }

  // Check if released
  if (vault.released) {
    return {
      status: 'released',
      canCheckIn: false,
      canRelease: false,
      percentComplete: 100,
      notificationStartUnix: 0,
      graceEndUnix: 0,
    };
  }

  // Calculate key timestamps
  const effectiveUnlock = vault.lastCheckinUnix > 0 ? vault.lastCheckinUnix : vault.unlockUnix;
  const notificationStartUnix = effectiveUnlock - vault.notificationWindowSeconds;
  const graceEndUnix = effectiveUnlock + vault.gracePeriodSeconds;

  // Determine current status
  let status: VaultStatus;
  let canCheckIn = false;
  let canRelease = false;
  let timeUntilNext: number | undefined;

  if (now < notificationStartUnix) {
    // Before notification window
    status = 'locked';
    timeUntilNext = notificationStartUnix - now;
  } else if (now < effectiveUnlock) {
    // In notification window
    status = 'notification';
    canCheckIn = true;
    timeUntilNext = effectiveUnlock - now;
  } else if (now < graceEndUnix) {
    // In grace period (after unlock, before grace period ends)
    status = 'grace_period';
    canRelease = true;
    timeUntilNext = graceEndUnix - now;
  } else {
    // After grace period
    status = 'ready_for_release';
    canRelease = true;
  }

  // Calculate progress percentage
  // 0% at vault creation, 100% at unlock
  const vaultStartUnix = effectiveUnlock - vault.vaultPeriodSeconds;
  const totalDuration = effectiveUnlock - vaultStartUnix;
  const elapsed = now - vaultStartUnix;
  let percentComplete = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

  // If in grace or ready_for_release, show 100%
  if (status === 'grace_period' || status === 'ready_for_release') {
    percentComplete = 100;
  }

  return {
    status,
    timeUntilNext,
    canCheckIn,
    canRelease,
    percentComplete,
    notificationStartUnix,
    graceEndUnix,
  };
}

/**
 * Get human-readable status text
 */
export function getStatusText(status: VaultStatus): string {
  switch (status) {
    case 'locked':
      return 'Locked';
    case 'notification':
      return 'Notification Window';
    case 'grace_period':
      return 'Grace Period';
    case 'ready_for_release':
      return 'Ready for Release';
    case 'released':
      return 'Released';
    case 'cancelled':
      return 'Cancelled';
  }
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: VaultStatus): string {
  switch (status) {
    case 'locked':
      return 'blue';
    case 'notification':
      return 'yellow';
    case 'grace_period':
      return 'orange';
    case 'ready_for_release':
      return 'red';
    case 'released':
      return 'green';
    case 'cancelled':
      return 'gray';
  }
}

/**
 * Format time remaining as human-readable string
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 0) return 'Overdue';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}
