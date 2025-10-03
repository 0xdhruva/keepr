'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getVaultCache } from '../_lib/storage';
import { getVaultStatus, VaultData } from '../_lib/vault-status';

interface NotificationSettings {
  enabled: boolean;
  notificationWindow: boolean;
  gracePerio: boolean;
  release: boolean;
  cancel: boolean;
  checkInterval: number; // seconds
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  notificationWindow: true,
  gracePerio: true,
  release: true,
  cancel: true,
  checkInterval: 60, // Check every minute
};

export function NotificationPoller() {
  const { connected, publicKey } = useWallet();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastNotifications, setLastNotifications] = useState<Set<string>>(new Set());

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('keepr.notifications');
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse notification settings:', e);
      }
    }

    // Check notification permission
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  // Poll for notification triggers
  useEffect(() => {
    if (!connected || !publicKey || !settings.enabled || !permissionGranted) {
      return;
    }

    const checkForNotifications = () => {
      try {
        const cache = getVaultCache();
        const userAddress = publicKey.toBase58();
        const now = Math.floor(Date.now() / 1000);

        // Filter vaults where user is creator (to monitor check-ins)
        const creatorVaults = cache.filter(
          (v) => v.creator === userAddress && !v.released && !v.cancelled
        );

        // Filter vaults where user is beneficiary (to monitor releases)
        const beneficiaryVaults = cache.filter(
          (v) => v.beneficiary === userAddress && v.creator !== userAddress && !v.released && !v.cancelled
        );

        // Check creator vaults for notification window
        if (settings.notificationWindow) {
          for (const vault of creatorVaults) {
            const vaultData: VaultData = {
              unlockUnix: vault.unlockUnix,
              vaultPeriodSeconds: vault.vaultPeriodSeconds || 0,
              notificationWindowSeconds: vault.notificationWindowSeconds || 0,
              gracePeriodSeconds: vault.gracePeriodSeconds || 0,
              lastCheckinUnix: vault.lastCheckinUnix || 0,
              released: vault.released || false,
              cancelled: vault.cancelled || false,
            };

            const status = getVaultStatus(vaultData, now);
            const notifKey = `${vault.vaultPda}-notification-window`;

            if (status.status === 'notification' && status.canCheckIn && !lastNotifications.has(notifKey)) {
              sendNotification(
                '⚠️ Check-in Required',
                `Vault "${vault.name}" has entered the notification window. Check in to extend the unlock time.`,
                `/vaults/${vault.vaultPda}`
              );
              setLastNotifications((prev) => new Set([...prev, notifKey]));
            }
          }
        }

        // Check creator vaults for grace period
        if (settings.gracePerio) {
          for (const vault of creatorVaults) {
            const vaultData: VaultData = {
              unlockUnix: vault.unlockUnix,
              vaultPeriodSeconds: vault.vaultPeriodSeconds || 0,
              notificationWindowSeconds: vault.notificationWindowSeconds || 0,
              gracePeriodSeconds: vault.gracePeriodSeconds || 0,
              lastCheckinUnix: vault.lastCheckinUnix || 0,
              released: vault.released || false,
              cancelled: vault.cancelled || false,
            };

            const status = getVaultStatus(vaultData, now);
            const notifKey = `${vault.vaultPda}-grace-period`;

            if (status.status === 'grace_period' && !lastNotifications.has(notifKey)) {
              sendNotification(
                '🔓 Vault Unlocked',
                `Vault "${vault.name}" has unlocked and entered the grace period. It can now be released.`,
                `/vaults/${vault.vaultPda}`
              );
              setLastNotifications((prev) => new Set([...prev, notifKey]));
            }
          }
        }

        // Check beneficiary vaults for release eligibility
        if (settings.release) {
          for (const vault of beneficiaryVaults) {
            const vaultData: VaultData = {
              unlockUnix: vault.unlockUnix,
              vaultPeriodSeconds: vault.vaultPeriodSeconds || 0,
              notificationWindowSeconds: vault.notificationWindowSeconds || 0,
              gracePeriodSeconds: vault.gracePeriodSeconds || 0,
              lastCheckinUnix: vault.lastCheckinUnix || 0,
              released: vault.released || false,
              cancelled: vault.cancelled || false,
            };

            const status = getVaultStatus(vaultData, now);
            const notifKey = `${vault.vaultPda}-ready-release`;

            if (status.canRelease && !lastNotifications.has(notifKey)) {
              sendNotification(
                '💰 Vault Ready for Release',
                `Vault "${vault.name}" is ready to be released. You can now claim your funds.`,
                `/vaults/${vault.vaultPda}/release`
              );
              setLastNotifications((prev) => new Set([...prev, notifKey]));
            }
          }
        }
      } catch (error) {
        console.error('Error checking for notifications:', error);
      }
    };

    // Initial check
    checkForNotifications();

    // Set up interval
    const interval = setInterval(checkForNotifications, settings.checkInterval * 1000);

    return () => clearInterval(interval);
  }, [connected, publicKey, settings, permissionGranted, lastNotifications]);

  const sendNotification = (title: string, body: string, url?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'keepr-vault',
        requireInteraction: true,
      });

      if (url) {
        notification.onclick = () => {
          window.focus();
          window.location.href = url;
          notification.close();
        };
      }
    }
  };

  // This component doesn't render anything
  return null;
}

// Export helper function to request permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Export helper to save settings
export function saveNotificationSettings(settings: NotificationSettings) {
  localStorage.setItem('keepr.notifications', JSON.stringify(settings));
}

// Export helper to load settings
export function loadNotificationSettings(): NotificationSettings {
  const stored = localStorage.getItem('keepr.notifications');
  if (stored) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch (e) {
      console.error('Failed to parse notification settings:', e);
    }
  }
  return DEFAULT_SETTINGS;
}
