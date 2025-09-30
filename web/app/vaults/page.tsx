'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { VaultCard } from '../_components/VaultCard';
import { getVaultCache, updateLastSeen } from '../_lib/storage';
import Link from 'next/link';

interface MockVault {
  vaultPda: string;
  name: string;
  amountLocked: number;
  unlockUnix: number;
  beneficiary: string;
  creator: string;
  released: boolean;
}

export default function VaultsPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [vaults, setVaults] = useState<MockVault[]>([]);
  const [loading, setLoading] = useState(true);

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

  const loadVaults = () => {
    // Load from localStorage
    const cache = getVaultCache();
    
    // Mock vault data for demonstration
    const mockVaults: MockVault[] = cache.map((meta, index) => ({
      vaultPda: meta.vaultPda,
      name: meta.name,
      amountLocked: (index + 1) * 10_000_000, // 10, 20, 30 USDC
      unlockUnix: Math.floor(Date.now() / 1000) + (index + 1) * 3600, // 1, 2, 3 hours from now
      beneficiary: publicKey?.toBase58() || '',
      creator: publicKey?.toBase58() || '',
      released: false,
    }));

    setVaults(mockVaults);
    setLoading(false);
  };

  if (!connected || !publicKey) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Vaults</h1>
        <Link
          href="/create"
          className="w-10 h-10 bg-gray-900 hover:bg-gray-800 rounded-xl flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 text-center">
          <svg className="w-5 h-5 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-lg font-bold text-gray-900">{vaults.length}</p>
          <p className="text-xs text-gray-500">Vaults</p>
        </div>
        
        <div className="bg-white rounded-2xl p-4 border border-gray-200 text-center">
          <svg className="w-5 h-5 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-bold text-gray-900">${(vaults.reduce((sum, v) => sum + v.amountLocked, 0) / 1_000_000).toFixed(0)}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        
        <div className="bg-white rounded-2xl p-4 border border-gray-200 text-center">
          <svg className="w-5 h-5 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-lg font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-500">Alerts</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading vaults...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && vaults.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No vaults yet</h3>
          <p className="text-gray-600 mb-6">Create your first vault to get started</p>
          <Link
            href="/create"
            className="inline-block px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors"
          >
            Create Your First Vault
          </Link>
        </div>
      )}

      {/* Vault List */}
      {!loading && vaults.length > 0 && (
        <div className="space-y-3">
          {vaults.map((vault) => (
            <VaultCard
              key={vault.vaultPda}
              vaultPda={vault.vaultPda}
              name={vault.name}
              amountLocked={vault.amountLocked}
              unlockUnix={vault.unlockUnix}
              beneficiary={vault.beneficiary}
              creator={vault.creator}
              released={vault.released}
              isCreator={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
