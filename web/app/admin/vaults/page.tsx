'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isAdminWallet } from '../../_lib/validation';
import { getVaultCache } from '../../_lib/storage';
import { formatUSDC, formatAddress } from '../../_lib/format';

interface VaultRow {
  vaultPda: string;
  name: string;
  creator: string;
  beneficiary: string;
  amountLocked: number;
  unlockUnix: number;
  released: boolean;
  cancelled: boolean;
  isTestVault: boolean;
}

export default function AdminVaultsPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vaults, setVaults] = useState<VaultRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'released' | 'cancelled' | 'test'>('all');

  useEffect(() => {
    if (!connected) {
      router.push('/');
      return;
    }

    if (publicKey && !isAdminWallet(publicKey.toBase58())) {
      router.push('/');
      return;
    }

    if (connected && publicKey) {
      loadVaults();
    }
  }, [connected, publicKey, router]);

  const loadVaults = async () => {
    try {
      const cache = getVaultCache();

      const vaultRows = cache.map((meta) => ({
        vaultPda: meta.vaultPda,
        name: meta.name,
        creator: meta.creator,
        beneficiary: meta.beneficiary,
        amountLocked: meta.amountLocked || 0,
        unlockUnix: meta.unlockUnix || 0,
        released: meta.released || false,
        cancelled: meta.cancelled || false,
        isTestVault: isAdminWallet(meta.creator),
      }));

      // Sort by creation time (newest first)
      vaultRows.sort((a, b) => b.unlockUnix - a.unlockUnix);

      setVaults(vaultRows);
    } catch (error) {
      console.error('Error loading vaults:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!connected || !publicKey || !isAdminWallet(publicKey.toBase58())) {
    return null;
  }

  // Filter vaults
  const filteredVaults = vaults.filter((v) => {
    if (filter === 'active') return !v.released && !v.cancelled;
    if (filter === 'released') return v.released;
    if (filter === 'cancelled') return v.cancelled;
    if (filter === 'test') return v.isTestVault;
    return true;
  });

  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="inline-flex items-center text-sage-600 hover:text-sage-700 mb-2">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-warm-900">All Vaults</h1>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
                ADMIN
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 bg-warm-100 p-1 rounded-xl border border-warm-200 overflow-x-auto">
          {[
            { key: 'all', label: 'All Vaults', count: vaults.length },
            { key: 'active', label: 'Active', count: vaults.filter(v => !v.released && !v.cancelled).length },
            { key: 'released', label: 'Released', count: vaults.filter(v => v.released).length },
            { key: 'cancelled', label: 'Cancelled', count: vaults.filter(v => v.cancelled).length },
            { key: 'test', label: 'Test Vaults', count: vaults.filter(v => v.isTestVault).length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-white text-sage-700 shadow-sm'
                  : 'text-warm-600 hover:text-warm-900'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-600">Loading vaults...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredVaults.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-warm-200">
            <div className="w-16 h-16 bg-warm-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-warm-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-warm-900 mb-2">No vaults found</h3>
            <p className="text-warm-600">Try changing the filter or create a new vault</p>
          </div>
        )}

        {/* Vaults Table */}
        {!loading && filteredVaults.length > 0 && (
          <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-warm-50 border-b border-warm-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-warm-700 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-warm-700 uppercase">Creator</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-warm-700 uppercase">Beneficiary</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-warm-700 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-warm-700 uppercase">Unlock Date</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-warm-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-warm-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  {filteredVaults.map((vault) => {
                    const isUnlocked = now >= vault.unlockUnix;
                    const status = vault.cancelled ? 'Cancelled' : vault.released ? 'Released' : isUnlocked ? 'Unlocked' : 'Locked';
                    const statusColor = vault.cancelled
                      ? 'bg-warm-100 text-warm-700'
                      : vault.released
                      ? 'bg-green-100 text-green-700'
                      : isUnlocked
                      ? 'bg-mint-100 text-mint-700'
                      : 'bg-lavender-100 text-lavender-700';

                    return (
                      <tr key={vault.vaultPda} className="hover:bg-warm-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-warm-900">{vault.name}</span>
                            {vault.isTestVault && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                                TEST
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-warm-700">{formatAddress(vault.creator, 4)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-warm-700">{formatAddress(vault.beneficiary, 4)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-warm-900">{formatUSDC(vault.amountLocked)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-warm-700">
                            {new Date(vault.unlockUnix * 1000).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/vaults/${vault.vaultPda}`}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-sage-600 hover:bg-sage-700 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            View
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="bg-warm-50 border-t border-warm-200 px-4 py-3">
              <div className="flex items-center justify-between text-sm text-warm-600">
                <span>Showing {filteredVaults.length} {filteredVaults.length === 1 ? 'vault' : 'vaults'}</span>
                <span>
                  Total Locked: <span className="font-semibold text-warm-900">
                    {formatUSDC(filteredVaults.reduce((sum, v) => sum + (v.cancelled ? 0 : v.amountLocked), 0))}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
