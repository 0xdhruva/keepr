'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { isAdminWallet } from '../_lib/validation';
import { getVaultCache } from '../_lib/storage';

export default function AdminDashboard() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVaults: 0,
    activeVaults: 0,
    releasedVaults: 0,
    cancelledVaults: 0,
    totalLocked: 0,
    testVaults: 0,
  });

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
      loadStats();
    }
  }, [connected, publicKey, router]);

  const loadStats = async () => {
    try {
      const cache = getVaultCache();

      const totalVaults = cache.length;
      const activeVaults = cache.filter(v => !v.released && !v.cancelled).length;
      const releasedVaults = cache.filter(v => v.released).length;
      const cancelledVaults = cache.filter(v => v.cancelled).length;
      const totalLocked = cache
        .filter(v => !v.released && !v.cancelled)
        .reduce((sum, v) => sum + (v.amountLocked || 0), 0);
      const testVaults = cache.filter(v => {
        // Test vaults are those created by admin wallets
        return v.creator && isAdminWallet(v.creator);
      }).length;

      setStats({
        totalVaults,
        activeVaults,
        releasedVaults,
        cancelledVaults,
        totalLocked,
        testVaults,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!connected || !publicKey || !isAdminWallet(publicKey.toBase58())) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-warm-900">Admin Console</h1>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
              ADMIN
            </span>
          </div>
          <p className="text-warm-600">System monitoring and management dashboard</p>
        </div>

        {/* Quick Stats */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-600">Loading stats...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-warm-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-lavender-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-lavender-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-warm-900">{stats.totalVaults}</p>
                    <p className="text-sm text-warm-600">Total Vaults</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-warm-600 mt-3">
                  <span>Active: {stats.activeVaults}</span>
                  <span>Released: {stats.releasedVaults}</span>
                  <span>Cancelled: {stats.cancelledVaults}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-warm-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-mint-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-mint-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-warm-900">${(stats.totalLocked / 1_000_000).toFixed(2)}</p>
                    <p className="text-sm text-warm-600">Total Locked (USDC)</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-warm-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-warm-900">{stats.testVaults}</p>
                    <p className="text-sm text-warm-600">Test Vaults</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-warm-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-warm-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Link
                  href="/admin/vaults"
                  className="flex items-center gap-3 p-4 bg-lavender-50 hover:bg-lavender-100 border border-lavender-200 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-lavender-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <div>
                    <p className="font-medium text-lavender-900">View All Vaults</p>
                    <p className="text-xs text-lavender-600">Browse all system vaults</p>
                  </div>
                </Link>

                <Link
                  href="/admin/testing"
                  className="flex items-center gap-3 p-4 bg-mint-50 hover:bg-mint-100 border border-mint-200 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-mint-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <div>
                    <p className="font-medium text-mint-900">Testing Tools</p>
                    <p className="text-xs text-mint-600">Quick test utilities</p>
                  </div>
                </Link>

                <Link
                  href="/admin/settings"
                  className="flex items-center gap-3 p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-amber-900">System Settings</p>
                    <p className="text-xs text-amber-600">Configure parameters</p>
                  </div>
                </Link>

                <Link
                  href="/create"
                  className="flex items-center gap-3 p-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-rose-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <div>
                    <p className="font-medium text-rose-900">Create Test Vault</p>
                    <p className="text-xs text-rose-600">2min minimum, self-beneficiary</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white rounded-xl border border-warm-200 p-6">
              <h2 className="text-lg font-semibold text-warm-900 mb-4">System Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-warm-100">
                  <span className="text-sm text-warm-600">Network</span>
                  <span className="text-sm font-medium text-warm-900">Devnet</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-warm-100">
                  <span className="text-sm text-warm-600">Program ID</span>
                  <span className="text-xs font-mono text-warm-900">74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-warm-100">
                  <span className="text-sm text-warm-600">Admin Wallet</span>
                  <span className="text-xs font-mono text-warm-900">{publicKey?.toBase58()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-warm-600">Status</span>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-green-700">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Operational
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
