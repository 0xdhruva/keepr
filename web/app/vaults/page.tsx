'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { VaultCard } from '../_components/VaultCard';
import { getVaultCache, updateLastSeen } from '../_lib/storage';
import Link from 'next/link';

interface Vault {
  vaultPda: string;
  name: string;
  amountLocked: number;
  unlockUnix: number;
  beneficiary: string;
  creator: string;
  released: boolean;
  cancelled?: boolean;
}

type TabView = 'created' | 'beneficiary';

export default function VaultsPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabView>('created');
  const [createdVaults, setCreatedVaults] = useState<Vault[]>([]);
  const [beneficiaryVaults, setBeneficiaryVaults] = useState<Vault[]>([]);
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

  const loadVaults = async () => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    try {
      const userAddress = publicKey.toBase58();
      const cache = getVaultCache();

      // Filter vaults created by this user
      const created = cache
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
          released: meta.released || false,
          cancelled: meta.cancelled || false,
        }));

      // Filter vaults where this user is the beneficiary
      const beneficiary = cache
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
          released: meta.released || false,
          cancelled: meta.cancelled || false,
        }));

      setCreatedVaults(created);
      setBeneficiaryVaults(beneficiary);
    } catch (error) {
      console.error('Error loading vaults:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!connected || !publicKey) {
    return null;
  }

  const activeVaults = activeTab === 'created' ? createdVaults : beneficiaryVaults;
  const totalLocked = activeVaults.reduce((sum, v) => sum + (v.cancelled ? 0 : v.amountLocked), 0);
  const activeCount = activeVaults.filter(v => !v.released && !v.cancelled).length;

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

      {/* Vault List */}
      {!loading && activeVaults.length > 0 && (
        <div className="space-y-3">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
