'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getVaultCache } from '../_lib/storage';
import { getVaultStatus, VaultData } from '../_lib/vault-status';
import { useNotifications } from '../_contexts/NotificationContext';
import { connection, PROGRAM_ID } from '../_lib/solana';

interface NotificationSettings {
  enabled: boolean;
  notificationWindow: boolean;
  gracePeriod: boolean;
  release: boolean;
  cancel: boolean;
  checkInterval: number; // seconds
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  notificationWindow: true,
  gracePeriod: true,
  release: true,
  cancel: true,
  checkInterval: 60, // Check every minute
};

export function NotificationPoller() {
  const { connected, publicKey } = useWallet();
  const { addNotification } = useNotifications();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastNotifications, setLastNotifications] = useState<Set<string>>(new Set());
  const [previousVaultStates, setPreviousVaultStates] = useState<Record<string, boolean>>({});

  // Load settings and previous vault states from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('keepr.notifications');
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse notification settings:', e);
      }
    }

    // Load previous vault states for release detection
    if (connected && publicKey) {
      const stateKey = `keepr.vault-states.${publicKey.toBase58()}`;
      const storedStates = localStorage.getItem(stateKey);
      if (storedStates) {
        try {
          setPreviousVaultStates(JSON.parse(storedStates));
        } catch (e) {
          console.error('Failed to parse previous vault states:', e);
        }
      }
    }

    // Check notification permission
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, [connected, publicKey]);

  // Poll for notification triggers
  useEffect(() => {
    if (!connected || !publicKey) {
      return;
    }

    const checkForNotifications = async () => {
      try {
        const userAddress = publicKey.toBase58();
        const now = Math.floor(Date.now() / 1000);
        const programId = new PublicKey(PROGRAM_ID);

        console.log('[NotificationPoller] Fetching user vaults from blockchain...');

        // Fetch ALL vaults where user is creator OR beneficiary directly from blockchain
        const [creatorVaultsRaw, beneficiaryVaultsRaw] = await Promise.all([
          // Vaults where user is creator (offset 8 = creator pubkey, 32 bytes)
          connection.getProgramAccounts(programId, {
            filters: [
              { dataSize: 237 }, // Current vault schema size
              { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
            ],
          }),
          // Vaults where user is beneficiary (offset 40 = beneficiary pubkey, 32 bytes)
          connection.getProgramAccounts(programId, {
            filters: [
              { dataSize: 237 },
              { memcmp: { offset: 40, bytes: publicKey.toBase58() } },
            ],
          }),
        ]);

        console.log(`[NotificationPoller] Found ${creatorVaultsRaw.length} creator vaults, ${beneficiaryVaultsRaw.length} beneficiary vaults`);

        // Deserialize vault accounts
        interface BlockchainVault {
          vaultPda: string;
          creator: string;
          beneficiary: string;
          unlockUnix: number;
          released: boolean;
          cancelled: boolean;
          notificationWindowSeconds: number;
          gracePeriodSeconds: number;
          lastCheckinUnix: number;
          checkinPeriodSeconds: number;
        }

        const deserializeVault = (pubkey: PublicKey, data: Buffer): BlockchainVault | null => {
          try {
            if (data.length !== 237) return null;

            const creator = new PublicKey(data.slice(8, 40));
            const beneficiary = new PublicKey(data.slice(40, 72));
            const unlockUnixBuf = data.slice(144, 152);
            const released = data[152] === 1;
            const cancelled = data[153] === 1;
            const notificationWindowBuf = data.slice(200, 204);
            const gracePeriodBuf = data.slice(204, 208);
            const lastCheckinBuf = data.slice(208, 216);
            const checkinPeriodBuf = data.slice(233, 237);

            const unlockUnix = Number(new DataView(unlockUnixBuf.buffer, unlockUnixBuf.byteOffset, 8).getBigInt64(0, true));
            const lastCheckinUnix = Number(new DataView(lastCheckinBuf.buffer, lastCheckinBuf.byteOffset, 8).getBigInt64(0, true));

            // DEBUG: Log deserialized values for newly created vaults
            const now = Math.floor(Date.now() / 1000);
            const vaultAge = now - unlockUnix + 300; // Approximate age (adding back check-in period)
            if (vaultAge < 120) { // If vault is less than 2 minutes old
              console.log('[NotificationPoller] Deserializing NEW vault:', {
                vaultPda: pubkey.toBase58(),
                unlockUnix,
                unlockDate: new Date(unlockUnix * 1000).toISOString(),
                lastCheckinUnix,
                lastCheckinDate: lastCheckinUnix > 0 ? new Date(lastCheckinUnix * 1000).toISOString() : 'never (0)',
                released,
                cancelled,
                rawLastCheckinBytes: Array.from(lastCheckinBuf),
                rawUnlockBytes: Array.from(unlockUnixBuf),
              });
            }

            return {
              vaultPda: pubkey.toBase58(),
              creator: creator.toBase58(),
              beneficiary: beneficiary.toBase58(),
              unlockUnix,
              released,
              cancelled,
              notificationWindowSeconds: new DataView(notificationWindowBuf.buffer, notificationWindowBuf.byteOffset, 4).getUint32(0, true),
              gracePeriodSeconds: new DataView(gracePeriodBuf.buffer, gracePeriodBuf.byteOffset, 4).getUint32(0, true),
              lastCheckinUnix,
              checkinPeriodSeconds: new DataView(checkinPeriodBuf.buffer, checkinPeriodBuf.byteOffset, 4).getUint32(0, true),
            };
          } catch (error) {
            console.error('Error deserializing vault:', error);
            return null;
          }
        };

        const creatorVaults = creatorVaultsRaw
          .map(({ pubkey, account }) => deserializeVault(pubkey, account.data as Buffer))
          .filter((v): v is BlockchainVault => v !== null && !v.released && !v.cancelled);

        const beneficiaryVaults = beneficiaryVaultsRaw
          .map(({ pubkey, account }) => deserializeVault(pubkey, account.data as Buffer))
          .filter((v): v is BlockchainVault => v !== null && !v.released && !v.cancelled && v.creator !== userAddress);

        // Get vault names from cache (optional, for better notification messages)
        const cache = getVaultCache();
        const getVaultName = (vaultPda: string) => {
          const cached = cache.find(v => v.vaultPda === vaultPda);
          return cached?.name || 'Unnamed Vault';
        };

        // Check creator vaults for notification window
        if (settings.notificationWindow) {
          for (const vault of creatorVaults) {
            const vaultData: VaultData = {
              unlockUnix: vault.unlockUnix,
              vaultPeriodSeconds: vault.checkinPeriodSeconds,
              notificationWindowSeconds: vault.notificationWindowSeconds,
              gracePeriodSeconds: vault.gracePeriodSeconds,
              lastCheckinUnix: vault.lastCheckinUnix,
              released: vault.released,
              cancelled: vault.cancelled,
            };

            const status = getVaultStatus(vaultData, now);
            const notifKey = `${vault.vaultPda}-notification-window`;

            if (status.status === 'notification' && status.canCheckIn && !lastNotifications.has(notifKey)) {
              const vaultName = getVaultName(vault.vaultPda);
              sendNotification(
                '⚠️ Check-in Required',
                `Vault "${vaultName}" has entered the notification window. Check in to extend the unlock time.`,
                `/vaults/${vault.vaultPda}`
              );
              setLastNotifications((prev) => new Set([...prev, notifKey]));
            }
          }
        }

        // Check creator vaults for grace period
        if (settings.gracePeriod) {
          for (const vault of creatorVaults) {
            const vaultData: VaultData = {
              unlockUnix: vault.unlockUnix,
              vaultPeriodSeconds: vault.checkinPeriodSeconds,
              notificationWindowSeconds: vault.notificationWindowSeconds,
              gracePeriodSeconds: vault.gracePeriodSeconds,
              lastCheckinUnix: vault.lastCheckinUnix,
              released: vault.released,
              cancelled: vault.cancelled,
            };

            const status = getVaultStatus(vaultData, now);
            const notifKey = `${vault.vaultPda}-grace-period`;

            // DEBUG: Log vault data when checking grace period
            if (status.status === 'grace_period') {
              console.log('[NotificationPoller] GRACE PERIOD DETECTED:', {
                vaultPda: vault.vaultPda,
                vaultName: getVaultName(vault.vaultPda),
                now,
                nowDate: new Date(now * 1000).toISOString(),
                unlockUnix: vault.unlockUnix,
                unlockDate: new Date(vault.unlockUnix * 1000).toISOString(),
                lastCheckinUnix: vault.lastCheckinUnix,
                lastCheckinDate: vault.lastCheckinUnix > 0 ? new Date(vault.lastCheckinUnix * 1000).toISOString() : 'never',
                checkinPeriodSeconds: vault.checkinPeriodSeconds,
                notificationWindowSeconds: vault.notificationWindowSeconds,
                gracePeriodSeconds: vault.gracePeriodSeconds,
                effectiveUnlock: vault.lastCheckinUnix > 0 ? vault.lastCheckinUnix : vault.unlockUnix,
                effectiveUnlockDate: new Date((vault.lastCheckinUnix > 0 ? vault.lastCheckinUnix : vault.unlockUnix) * 1000).toISOString(),
                notificationStart: status.notificationStartUnix,
                notificationStartDate: new Date(status.notificationStartUnix * 1000).toISOString(),
                graceEnd: status.graceEndUnix,
                graceEndDate: new Date(status.graceEndUnix * 1000).toISOString(),
              });
            }

            if (status.status === 'grace_period' && !lastNotifications.has(notifKey)) {
              const vaultName = getVaultName(vault.vaultPda);
              sendNotification(
                '⚠️ URGENT: Grace Period Active',
                `Vault "${vaultName}" has entered the grace period. Check in immediately or funds will be auto-released!`,
                `/vaults/${vault.vaultPda}`,
                'grace_period'
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
              vaultPeriodSeconds: vault.checkinPeriodSeconds,
              notificationWindowSeconds: vault.notificationWindowSeconds,
              gracePeriodSeconds: vault.gracePeriodSeconds,
              lastCheckinUnix: vault.lastCheckinUnix,
              released: vault.released,
              cancelled: vault.cancelled,
            };

            const status = getVaultStatus(vaultData, now);
            const notifKey = `${vault.vaultPda}-ready-release`;

            if (status.canRelease && !lastNotifications.has(notifKey)) {
              const vaultName = getVaultName(vault.vaultPda);
              sendNotification(
                '💰 Vault Ready for Release',
                `Vault "${vaultName}" is ready to be released. You can now claim your funds.`,
                `/vaults/${vault.vaultPda}/release`
              );
              setLastNotifications((prev) => new Set([...prev, notifKey]));
            }
          }
        }

        // Detect auto-released vaults (vaults that existed before but are now gone/released)
        // Check if any vaults from previous state are now missing (released + closed)
        for (const [vaultPda, wasActive] of Object.entries(previousVaultStates)) {
          if (!wasActive) continue; // Vault was already released/closed last time

          // Check if this vault still exists in our active vaults
          const stillActive = [...creatorVaults, ...beneficiaryVaults].some(v => v.vaultPda === vaultPda);

          if (!stillActive) {
            // Vault disappeared - check if it was released or cancelled
            // Try to fetch the vault account to see if it still exists
            try {
              const vaultPubkey = new PublicKey(vaultPda);
              const vaultAccount = await connection.getAccountInfo(vaultPubkey);

              // If account is completely gone (closed), we can't determine the reason
              // This happens for both cancelled and released vaults after they're closed
              // Skip notification since we can't reliably determine if it was auto-released
              if (!vaultAccount) {
                console.log(`[NotificationPoller] Vault ${vaultPda} was closed (cancelled or released)`);
                continue;
              }

              // If account still exists, check if it was released (not cancelled)
              const data = vaultAccount.data;
              const released = data[152] === 1;
              const cancelled = data[153] === 1;

              // Only notify for auto-released vaults (not cancelled)
              if (released && !cancelled) {
                const wasCreator = creatorVaultsRaw.some(({ pubkey }) => pubkey.toBase58() === vaultPda);
                const notifKey = `${vaultPda}-auto-released`;

                if (!lastNotifications.has(notifKey)) {
                  const vaultName = getVaultName(vaultPda);
                  sendNotification(
                    wasCreator ? '🔓 Vault Auto-Released' : '💰 Vault Released - Funds Received',
                    wasCreator
                      ? `Vault "${vaultName}" was automatically released by the keeper bot. Funds have been sent to the beneficiary.`
                      : `Vault "${vaultName}" has been released. Funds are now in your wallet!`,
                    `/vaults/${vaultPda}`,
                    'vault_released'
                  );
                  setLastNotifications((prev) => new Set([...prev, notifKey]));
                }
              }
            } catch (error) {
              console.error(`[NotificationPoller] Error checking vault ${vaultPda}:`, error);
            }
          }
        }

        // Update previous states (track which vaults are currently active)
        const newVaultStates: Record<string, boolean> = {};
        [...creatorVaults, ...beneficiaryVaults].forEach(vault => {
          newVaultStates[vault.vaultPda] = true; // Vault is active
        });

        setPreviousVaultStates(newVaultStates);
        // Save to localStorage
        const stateKey = `keepr.vault-states.${userAddress}`;
        localStorage.setItem(stateKey, JSON.stringify(newVaultStates));
      } catch (error) {
        console.error('Error checking for notifications:', error);
      }
    };

    // Initial check
    checkForNotifications();

    // Set up interval
    const interval = setInterval(checkForNotifications, settings.checkInterval * 1000);

    return () => clearInterval(interval);
  }, [connected, publicKey, settings, permissionGranted, lastNotifications, addNotification]);

  const sendNotification = (title: string, body: string, url?: string, type?: any) => {
    // ALWAYS add to in-app notification bell
    addNotification({
      type: type || 'checkin_required', // Use provided type or default to checkin_required
      title,
      message: body,
      vaultPda: url?.split('/').pop(), // Extract vault PDA from URL if present
    });

    // ALSO send browser notification if enabled and permitted
    if (settings.enabled && permissionGranted && 'Notification' in window && Notification.permission === 'granted') {
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
