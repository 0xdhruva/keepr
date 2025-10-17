/**
 * Client-side notification system for vault check-in alerts
 *
 * Checks vault state and generates notifications for:
 * 1. Check-in reminder (during notification window)
 * 2. Watchdog started (missed check-in, in grace period)
 * 3. Release imminent (1 day before grace period ends)
 */

export type NotificationType = 'checkin_reminder' | 'watchdog_started' | 'release_imminent';

export interface VaultNotification {
  vaultPda: string;
  vaultName: string;
  type: NotificationType;
  timestamp: number;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  actionUrl: string;
  actionText: string;
}

export interface VaultForNotification {
  vaultPda: string;
  name: string;
  unlockUnix: number;
  notificationWindowSeconds: number;
  gracePeriodSeconds: number;
  released: boolean;
  cancelled: boolean;
  isCreator: boolean;
  beneficiary: string;
}

/**
 * Check a single vault and return any active notifications
 */
export function checkVaultNotifications(vault: VaultForNotification): VaultNotification[] {
  const now = Math.floor(Date.now() / 1000);
  const notifications: VaultNotification[] = [];

  // Skip if vault is already released or cancelled
  if (vault.released || vault.cancelled) {
    return notifications;
  }

  const notificationStart = vault.unlockUnix - vault.notificationWindowSeconds;
  const gracePeriodEnd = vault.unlockUnix + vault.gracePeriodSeconds;
  const oneDayBeforeRelease = gracePeriodEnd - 86400;

  // 1. Check-in reminder (during notification window, before deadline)
  if (vault.isCreator && now >= notificationStart && now < vault.unlockUnix) {
    const hoursRemaining = Math.ceil((vault.unlockUnix - now) / 3600);
    const timeStr = hoursRemaining >= 24
      ? `${Math.ceil(hoursRemaining / 24)} days`
      : `${hoursRemaining} hours`;

    notifications.push({
      vaultPda: vault.vaultPda,
      vaultName: vault.name,
      type: 'checkin_reminder',
      timestamp: notificationStart,
      message: `Check-in required within ${timeStr} for vault "${vault.name}"`,
      severity: 'warning',
      actionUrl: `/vaults/${vault.vaultPda}`,
      actionText: 'Check In Now',
    });
  }

  // 2. Watchdog started (missed check-in, in grace period)
  if (now >= vault.unlockUnix && now < gracePeriodEnd) {
    const hoursRemaining = Math.ceil((gracePeriodEnd - now) / 3600);
    const timeStr = hoursRemaining >= 24
      ? `${Math.ceil(hoursRemaining / 24)} days`
      : `${hoursRemaining} hours`;

    if (vault.isCreator) {
      // Alert creator: missed check-in, can still check in during grace period
      notifications.push({
        vaultPda: vault.vaultPda,
        vaultName: vault.name,
        type: 'watchdog_started',
        timestamp: vault.unlockUnix,
        message: `⚠️ URGENT: Missed check-in for "${vault.name}". Funds release in ${timeStr} unless you check in now!`,
        severity: 'critical',
        actionUrl: `/vaults/${vault.vaultPda}`,
        actionText: 'Check In Immediately',
      });
    } else {
      // Alert beneficiary: funds coming soon
      notifications.push({
        vaultPda: vault.vaultPda,
        vaultName: vault.name,
        type: 'watchdog_started',
        timestamp: vault.unlockUnix,
        message: `Vault "${vault.name}" creator missed check-in. Funds may release to you in ${timeStr}.`,
        severity: 'info',
        actionUrl: `/vaults/${vault.vaultPda}`,
        actionText: 'View Vault',
      });
    }
  }

  // 3. Release imminent (1 day before grace period ends)
  if (vault.isCreator && now >= oneDayBeforeRelease && now < gracePeriodEnd) {
    const hoursRemaining = Math.ceil((gracePeriodEnd - now) / 3600);

    notifications.push({
      vaultPda: vault.vaultPda,
      vaultName: vault.name,
      type: 'release_imminent',
      timestamp: oneDayBeforeRelease,
      message: `FINAL WARNING: "${vault.name}" funds release in ${hoursRemaining} hours. This is your last chance to check in!`,
      severity: 'critical',
      actionUrl: `/vaults/${vault.vaultPda}`,
      actionText: 'Check In Now',
    });
  }

  return notifications;
}

/**
 * Check multiple vaults and return all active notifications
 */
export function checkAllVaultNotifications(vaults: VaultForNotification[]): VaultNotification[] {
  const allNotifications: VaultNotification[] = [];

  for (const vault of vaults) {
    const vaultNotifications = checkVaultNotifications(vault);
    allNotifications.push(...vaultNotifications);
  }

  // Sort by severity (critical first) then timestamp (oldest first)
  return allNotifications.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.timestamp - b.timestamp;
  });
}

/**
 * LocalStorage key for dismissed notifications
 */
const DISMISSED_NOTIFICATIONS_KEY = 'keepr.dismissedNotifications';

/**
 * Get dismissed notification IDs from localStorage
 */
export function getDismissedNotifications(): Set<string> {
  if (typeof window === 'undefined') return new Set();

  try {
    const stored = localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
    if (!stored) return new Set();
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
}

/**
 * Mark a notification as dismissed
 */
export function dismissNotification(vaultPda: string, type: NotificationType): void {
  if (typeof window === 'undefined') return;

  const notificationId = `${vaultPda}:${type}`;
  const dismissed = getDismissedNotifications();
  dismissed.add(notificationId);

  try {
    localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify([...dismissed]));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Check if a notification has been dismissed
 */
export function isNotificationDismissed(vaultPda: string, type: NotificationType): boolean {
  const notificationId = `${vaultPda}:${type}`;
  return getDismissedNotifications().has(notificationId);
}

/**
 * Filter out dismissed notifications
 */
export function filterDismissedNotifications(notifications: VaultNotification[]): VaultNotification[] {
  return notifications.filter(n => !isNotificationDismissed(n.vaultPda, n.type));
}

/**
 * Clear all dismissed notifications (for testing/debugging)
 */
export function clearDismissedNotifications(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DISMISSED_NOTIFICATIONS_KEY);
}
