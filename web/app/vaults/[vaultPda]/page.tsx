'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatUSDC, formatAddress, formatDateTime } from '../../_lib/format';
import { StatusBadge } from '../../_components/StatusBadge';
import { Countdown } from '../../_components/Countdown';
import { getVaultMeta, getActivityLog, ActivityLogEntry } from '../../_lib/storage';
import Link from 'next/link';

interface VaultDetail {
  vaultPda: string;
  name: string;
  amountLocked: number;
  unlockUnix: number;
  beneficiary: string;
  creator: string;
  released: boolean;
  createdAt: number;
}

export default function VaultDetailPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const params = useParams();
  const vaultPda = params.vaultPda as string;

  const [vault, setVault] = useState<VaultDetail | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  useEffect(() => {
    if (connected && vaultPda) {
      loadVaultDetail();
    }
  }, [connected, vaultPda]);

  const loadVaultDetail = () => {
    const meta = getVaultMeta(vaultPda);
    
    if (!meta) {
      setLoading(false);
      return;
    }

    // Mock vault detail
    const mockVault: VaultDetail = {
      vaultPda,
      name: meta.name,
      amountLocked: 10_000_000, // 10 USDC
      unlockUnix: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      beneficiary: publicKey?.toBase58() || '',
      creator: publicKey?.toBase58() || '',
      released: false,
      createdAt: meta.createdAt,
    };

    setVault(mockVault);
    setActivity(getActivityLog(vaultPda));
    setLoading(false);
  };

  if (!connected || !publicKey) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="p-12 bg-gray-900/50 rounded-xl border border-gray-800 text-center">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading vault...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="p-12 bg-gray-900/50 rounded-xl border border-gray-800 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Vault not found</h3>
              <p className="text-gray-400 mb-6">This vault does not exist or has been removed</p>
              <Link
                href="/vaults"
                className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors border border-gray-700"
              >
                Back to Vaults
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const isUnlocked = now >= vault.unlockUnix;
  const status = vault.released ? 'released' : isUnlocked ? 'unlocked' : 'locked';
  const isCreator = vault.creator === publicKey.toBase58();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link
          href="/vaults"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Vaults
        </Link>

        {/* Header */}
        <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{vault.name}</h1>
              <p className="text-sm text-gray-500">
                {isCreator ? 'Created by you' : `From ${formatAddress(vault.creator)}`}
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="text-4xl font-bold text-purple-400 mb-6">
            {formatUSDC(vault.amountLocked)}
          </div>

          {!vault.released && (
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
              <p className="text-sm text-gray-400 mb-3">
                {isUnlocked ? 'Ready to release' : 'Time remaining'}
              </p>
              <Countdown unlockUnix={vault.unlockUnix} />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800 space-y-4">
          <h2 className="text-xl font-bold mb-4">Vault Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Beneficiary</p>
              <p className="font-mono text-sm break-all">{vault.beneficiary}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-1">Creator</p>
              <p className="font-mono text-sm break-all">{vault.creator}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-1">Unlock Date</p>
              <p className="font-semibold">{formatDateTime(vault.unlockUnix)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-1">Created</p>
              <p className="font-semibold">{formatDateTime(Math.floor(vault.createdAt / 1000))}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-1">Vault Address</p>
              <p className="font-mono text-xs break-all text-gray-500">{vault.vaultPda}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-1">Status</p>
              <p className="font-semibold">
                {vault.released ? 'Released' : isUnlocked ? 'Ready to Release' : 'Locked'}
              </p>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Activity</h2>

          {activity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {activity.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg border border-gray-800"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    entry.type === 'created' ? 'bg-blue-400' :
                    entry.type === 'deposited' ? 'bg-green-400' :
                    'bg-purple-400'
                  }`} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {entry.type === 'created' && 'Vault Created'}
                      {entry.type === 'deposited' && `Deposited ${formatUSDC(entry.amount || 0)}`}
                      {entry.type === 'released' && 'Funds Released'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(Math.floor(entry.timestamp / 1000))}
                    </p>
                    {entry.signature && (
                      <p className="text-xs font-mono text-gray-600 mt-1 break-all">
                        {entry.signature}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {!vault.released && isUnlocked && (
          <div className="p-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Ready to Release</h3>
                <p className="text-sm text-gray-400">
                  This vault is now unlocked and can be released to the beneficiary
                </p>
              </div>
              <Link
                href={`/vaults/${vault.vaultPda}/release`}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all whitespace-nowrap"
              >
                Release Funds
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
