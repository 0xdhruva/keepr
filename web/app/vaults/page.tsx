'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { VaultCard } from '../_components/VaultCard';
import { getVaultCache, updateLastSeen, saveVaultMeta } from '../_lib/storage';
import { checkAllVaultNotifications, filterDismissedNotifications, type VaultForNotification } from '../_lib/notifications';
import { NotificationBanner } from '../_components/NotificationBanner';
import Link from 'next/link';
import { Connection, PublicKey } from '@solana/web3.js';

interface Vault {
  vaultPda: string;
  name: string;
  amountLocked: number;
  unlockUnix: number;
  beneficiary: string;
  creator: string;
  released: boolean;
  cancelled?: boolean;
  tier?: number;
  checkinPeriodSeconds?: number;
  notificationWindowSeconds?: number;
  gracePeriodSeconds?: number;
  lastCheckinUnix?: number;
}

type TabView = 'created' | 'beneficiary';

export default function VaultsPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabView>('created');
  const [createdVaults, setCreatedVaults] = useState<Vault[]>([]);
  const [beneficiaryVaults, setBeneficiaryVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [notificationKey, setNotificationKey] = useState(0); // Force re-render on dismiss

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  useEffect(() => {
    if (connected && publicKey) {
      updateLastSeen(publicKey.toBase58());
      loadVaults();
    }
  }, [connected, publicKey]);

  const loadVaults = async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    try {
      const userAddress = publicKey.toBase58();
      const cache = getVaultCache();
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const programId = new PublicKey('74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK');

      // Scan blockchain for all vaults created by this user
      console.log('Scanning blockchain for vaults created by', userAddress);
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 8, // After discriminator
              bytes: publicKey.toBase58(),
            },
          },
        ],
      });

      console.log('Found', accounts.length, 'vaults on-chain');

      // Process all on-chain vaults
      const onChainVaults = accounts.map((account) => {
        try {
          const data = account.account.data;

          // Filter out old schema vaults
          // Old vaults are undeserializable and should be hidden
          const CURRENT_VAULT_SIZE = 237; // 8 discriminator + 229 struct data (with dead man's switch fields)
          if (data.length !== CURRENT_VAULT_SIZE) {
            console.log('Skipping vault with old schema:', account.pubkey.toBase58().slice(0, 8) + '... (size:', data.length, 'bytes, expected:', CURRENT_VAULT_SIZE, ')');
            return null;
          }

          const creator = new PublicKey(data.slice(8, 40));
          const beneficiary = new PublicKey(data.slice(40, 72));
          const amountLockedBuf = data.slice(136, 144);
          const unlockUnixBuf = data.slice(144, 152);
          const released = data[152] === 1;
          const cancelled = data[153] === 1;
          const notificationWindowBuf = data.slice(200, 204);
          const gracePeriodBuf = data.slice(204, 208);
          const lastCheckinBuf = data.slice(208, 216);
          const tier = data[216];
          const checkinPeriodBuf = data.slice(233, 237);

          const amountLocked = Number(new DataView(amountLockedBuf.buffer, amountLockedBuf.byteOffset, 8).getBigUint64(0, true));
          const unlockUnix = Number(new DataView(unlockUnixBuf.buffer, unlockUnixBuf.byteOffset, 8).getBigInt64(0, true));
          const notificationWindowSeconds = new DataView(notificationWindowBuf.buffer, notificationWindowBuf.byteOffset, 4).getUint32(0, true);
          const gracePeriodSeconds = new DataView(gracePeriodBuf.buffer, gracePeriodBuf.byteOffset, 4).getUint32(0, true);
          const lastCheckinUnix = Number(new DataView(lastCheckinBuf.buffer, lastCheckinBuf.byteOffset, 8).getBigInt64(0, true));
          const checkinPeriodSeconds = new DataView(checkinPeriodBuf.buffer, checkinPeriodBuf.byteOffset, 4).getUint32(0, true);

          // Find cached metadata or use defaults
          const cachedMeta = cache.find((m) => m.vaultPda === account.pubkey.toBase58());

          return {
            vaultPda: account.pubkey.toBase58(),
            name: cachedMeta?.name || 'Unnamed Vault',
            creator: creator.toBase58(),
            beneficiary: beneficiary.toBase58(),
            amountLocked,
            unlockUnix,
            released,
            cancelled,
            tier,
            checkinPeriodSeconds,
            notificationWindowSeconds,
            gracePeriodSeconds,
            lastCheckinUnix,
          };
        } catch (error) {
          console.error('Error parsing vault', account.pubkey.toBase58(), error);
          return null;
        }
      }).filter((v) => v !== null);

      // Use on-chain scanned vaults as the source of truth
      // Filter out null entries and vaults created by this user
      console.log('Total on-chain vaults parsed:', onChainVaults.length);

      const created = onChainVaults
        .filter((meta) => {
          const isValid =
            meta.amountLocked !== undefined &&
            meta.unlockUnix !== undefined &&
            meta.beneficiary !== undefined;
          return isValid && meta.creator === userAddress;
        })
        .map((meta) => ({
          vaultPda: meta.vaultPda,
          name: meta.name,
          amountLocked: meta.amountLocked,
          unlockUnix: meta.unlockUnix,
          beneficiary: meta.beneficiary,
          creator: meta.creator,
          released: meta.released,
          cancelled: meta.cancelled,
          tier: meta.tier,
          checkinPeriodSeconds: meta.checkinPeriodSeconds,
          notificationWindowSeconds: meta.notificationWindowSeconds,
          gracePeriodSeconds: meta.gracePeriodSeconds,
          lastCheckinUnix: meta.lastCheckinUnix,
        }));

      // Filter vaults where this user is the beneficiary
      const beneficiary = onChainVaults
        .filter((meta) => {
          const isValid =
            meta.amountLocked !== undefined &&
            meta.unlockUnix !== undefined &&
            meta.beneficiary !== undefined;
          return isValid && meta.beneficiary === userAddress && meta.creator !== userAddress;
        })
        .map((meta) => ({
          vaultPda: meta.vaultPda,
          name: meta.name,
          amountLocked: meta.amountLocked,
          unlockUnix: meta.unlockUnix,
          beneficiary: meta.beneficiary,
          creator: meta.creator,
          released: meta.released,
          cancelled: meta.cancelled,
          tier: meta.tier,
          checkinPeriodSeconds: meta.checkinPeriodSeconds,
          notificationWindowSeconds: meta.notificationWindowSeconds,
          gracePeriodSeconds: meta.gracePeriodSeconds,
          lastCheckinUnix: meta.lastCheckinUnix,
        }));

      console.log('Created vaults:', created.length);
      console.log('Active vaults (not released, has funds):', created.filter(v => !v.released && !v.cancelled && v.amountLocked > 0).length);
      console.log('Released/cancelled vaults:', created.filter(v => v.released || v.cancelled).length);

      // Update cache with fresh on-chain data
      onChainVaults.forEach((vault) => {
        const cachedMeta = cache.find((m) => m.vaultPda === vault.vaultPda);
        saveVaultMeta({
          vaultPda: vault.vaultPda,
          name: vault.name,
          createdAt: cachedMeta?.createdAt || Date.now(),
          lastRefreshed: Date.now(),
          unlockUnix: vault.unlockUnix,
          amountLocked: vault.amountLocked,
          beneficiary: vault.beneficiary,
          creator: vault.creator,
          released: vault.released,
          cancelled: vault.cancelled,
          tier: vault.tier,
          checkinPeriodSeconds: vault.checkinPeriodSeconds,
          notificationWindowSeconds: vault.notificationWindowSeconds,
          gracePeriodSeconds: vault.gracePeriodSeconds,
          lastCheckinUnix: vault.lastCheckinUnix,
        });
      });

      // Include historical vaults from cache (released/cancelled vaults that may be closed on-chain)
      const historicalVaults = cache.filter(v => 
        (v.released || v.cancelled) && 
        (v.creator === userAddress || v.beneficiary === userAddress)
      );

      // Merge on-chain vaults with historical vaults (deduplicate by vaultPda)
      const allCreatedVaults = [
        ...created,
        ...historicalVaults
          .filter(v => v.creator === userAddress && !created.some(c => c.vaultPda === v.vaultPda))
          .map(v => ({
            vaultPda: v.vaultPda,
            name: v.name,
            amountLocked: v.amountLocked || 0,
            unlockUnix: v.unlockUnix || 0,
            beneficiary: v.beneficiary,
            creator: v.creator,
            released: v.released || false,
            cancelled: v.cancelled || false,
            tier: v.tier,
            checkinPeriodSeconds: v.checkinPeriodSeconds,
            notificationWindowSeconds: v.notificationWindowSeconds,
            gracePeriodSeconds: v.gracePeriodSeconds,
            lastCheckinUnix: v.lastCheckinUnix,
          }))
      ];

      const allBeneficiaryVaults = [
        ...beneficiary,
        ...historicalVaults
          .filter(v => v.beneficiary === userAddress && v.creator !== userAddress && !beneficiary.some(b => b.vaultPda === v.vaultPda))
          .map(v => ({
            vaultPda: v.vaultPda,
            name: v.name,
            amountLocked: v.amountLocked || 0,
            unlockUnix: v.unlockUnix || 0,
            beneficiary: v.beneficiary,
            creator: v.creator,
            released: v.released || false,
            cancelled: v.cancelled || false,
            tier: v.tier,
            checkinPeriodSeconds: v.checkinPeriodSeconds,
            notificationWindowSeconds: v.notificationWindowSeconds,
            gracePeriodSeconds: v.gracePeriodSeconds,
            lastCheckinUnix: v.lastCheckinUnix,
          }))
      ];

      setCreatedVaults(allCreatedVaults);
      setBeneficiaryVaults(allBeneficiaryVaults);
    } catch (error) {
      console.error('Error loading vaults:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!connected || !publicKey) {
    return null;
  }

  const allVaults = activeTab === 'created' ? createdVaults : beneficiaryVaults;

  // Separate active vaults from history
  // Active vaults: have funds AND not released/cancelled
  // History vaults: released OR cancelled (regardless of amountLocked due to old bug)
  const activeVaults = allVaults.filter(v => !v.released && !v.cancelled && v.amountLocked > 0);
  const historyVaults = allVaults.filter(v => v.released || v.cancelled);

  const totalLocked = activeVaults.reduce((sum, v) => sum + v.amountLocked, 0);
  const activeCount = activeVaults.length;

  // Calculate notifications for all vaults (both created and beneficiary)
  const allVaultsForNotifications: VaultForNotification[] = [...createdVaults, ...beneficiaryVaults]
    .filter(v => v.notificationWindowSeconds !== undefined && v.gracePeriodSeconds !== undefined)
    .map(v => ({
      vaultPda: v.vaultPda,
      name: v.name,
      unlockUnix: v.unlockUnix,
      notificationWindowSeconds: v.notificationWindowSeconds!,
      gracePeriodSeconds: v.gracePeriodSeconds || 0, // Add default if undefined
      released: v.released,
      cancelled: v.cancelled || false,
      isCreator: v.creator === publicKey?.toBase58(),
      beneficiary: v.beneficiary,
    }));

  const allNotifications = checkAllVaultNotifications(allVaultsForNotifications);
  const activeNotifications = filterDismissedNotifications(allNotifications);

  const handleDismissNotification = () => {
    // Force re-render to update notification list
    setNotificationKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-warm-900">My Vaults</h1>
        <Link
          href="/create"
          className="w-10 h-10 bg-sage-600 hover:bg-sage-700 rounded-xl flex items-center justify-center transition-colors shadow-sm"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-warm-100 p-1 rounded-xl border border-warm-200">
        <button
          onClick={() => setActiveTab('created')}
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
            activeTab === 'created'
              ? 'bg-white text-sage-700 shadow-sm'
              : 'text-warm-600 hover:text-warm-900'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Created by Me
            {createdVaults.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-sage-100 text-sage-700 rounded-full text-xs font-semibold">
                {createdVaults.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('beneficiary')}
          className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
            activeTab === 'beneficiary'
              ? 'bg-white text-sage-700 shadow-sm'
              : 'text-warm-600 hover:text-warm-900'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            I'll Inherit
            {beneficiaryVaults.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-sage-100 text-sage-700 rounded-full text-xs font-semibold">
                {beneficiaryVaults.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Notifications */}
      {activeNotifications.length > 0 && (
        <div className="mb-6" key={notificationKey}>
          <NotificationBanner
            notifications={activeNotifications}
            onDismiss={handleDismissNotification}
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-warm-200 text-center">
          <svg className="w-5 h-5 text-sage-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-lg font-bold text-warm-900">{activeCount}</p>
          <p className="text-xs text-warm-500">Active</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-warm-200 text-center">
          <svg className="w-5 h-5 text-sage-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-bold text-warm-900">${(totalLocked / 1_000_000).toFixed(0)}</p>
          <p className="text-xs text-warm-500">Total</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-warm-200 text-center">
          <svg className="w-5 h-5 text-sage-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-lg font-bold text-warm-900">{activeVaults.length}</p>
          <p className="text-xs text-warm-500">Total</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-warm-600">Loading vaults...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && activeVaults.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-warm-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-warm-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-warm-900 mb-2">
            {activeTab === 'created' ? 'No vaults created yet' : 'No vaults to inherit yet'}
          </h3>
          <p className="text-warm-600 mb-6">
            {activeTab === 'created'
              ? 'Create your first vault to get started'
              : 'Vaults where you are the beneficiary will appear here'
            }
          </p>
          {activeTab === 'created' && (
            <Link
              href="/create"
              className="inline-block px-6 py-3 bg-sage-600 hover:bg-sage-700 text-white rounded-xl font-medium transition-colors shadow-sm"
            >
              Create Your First Vault
            </Link>
          )}
        </div>
      )}

      {/* Active Vault List */}
      {!loading && activeVaults.length > 0 && (
        <div className="space-y-3 mb-6">
          {activeVaults.map((vault) => (
            <VaultCard
              key={vault.vaultPda}
              vaultPda={vault.vaultPda}
              name={vault.name}
              amountLocked={vault.amountLocked}
              unlockUnix={vault.unlockUnix}
              beneficiary={vault.beneficiary}
              creator={vault.creator}
              released={vault.released}
              cancelled={vault.cancelled}
              isCreator={activeTab === 'created'}
              tier={vault.tier}
              checkinPeriodSeconds={vault.checkinPeriodSeconds}
              notificationWindowSeconds={vault.notificationWindowSeconds}
              lastCheckinUnix={vault.lastCheckinUnix}
            />
          ))}
        </div>
      )}

      {/* History Section - Collapsible */}
      {!loading && (
        <div className="mt-8 border-t border-warm-200 pt-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-warm-50 rounded-xl border border-warm-200 transition-colors mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warm-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-warm-900">Vault History</h3>
                <p className="text-sm text-warm-600">{historyVaults.length} closed vault{historyVaults.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-warm-600 transition-transform duration-200 ${
                showHistory ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showHistory && (
            <div className="space-y-3 animate-[slideDown_200ms_ease-out]">
              {historyVaults.length === 0 ? (
                <div className="text-center py-8 bg-warm-50 rounded-xl border border-warm-200">
                  <div className="w-12 h-12 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-warm-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-warm-600 text-sm">No closed vaults yet</p>
                  <p className="text-warm-500 text-xs mt-1">Released and cancelled vaults will appear here</p>
                </div>
              ) : (
                historyVaults.map((vault) => (
                  <VaultCard
                    key={vault.vaultPda}
                    vaultPda={vault.vaultPda}
                    name={vault.name}
                    amountLocked={vault.amountLocked}
                    unlockUnix={vault.unlockUnix}
                    beneficiary={vault.beneficiary}
                    creator={vault.creator}
                    released={vault.released}
                    cancelled={vault.cancelled}
                    isCreator={activeTab === 'created'}
                    tier={vault.tier}
                    checkinPeriodSeconds={vault.checkinPeriodSeconds}
                    notificationWindowSeconds={vault.notificationWindowSeconds}
                    lastCheckinUnix={vault.lastCheckinUnix}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
