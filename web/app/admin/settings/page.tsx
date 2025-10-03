'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { isAdminWallet } from '../../_lib/validation';
import { connection, PROGRAM_ID } from '../../_lib/solana';
import idl from '../../_lib/keepr_vault.json';

export default function AdminSettingsPage() {
  const { connected, publicKey, signTransaction } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      loadConfig();
    }
  }, [connected, publicKey, router]);

  const loadConfig = async () => {
    try {
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions: async (txs) => txs } as any,
        { commitment: 'confirmed' }
      );

      const program = new Program(idl as any, provider);

      // Derive config PDA
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        new PublicKey(PROGRAM_ID)
      );

      // Fetch config account
      const configAccount = await program.account.config.fetch(configPda);

      setConfig({
        pda: configPda.toBase58(),
        admin: (configAccount as any).admin.toBase58(),
        usdcMint: (configAccount as any).usdcMint.toBase58(),
        maxLockPerVault: (configAccount as any).maxLockPerVault.toString(),
        paused: (configAccount as any).paused,
        adminTestWallets: ((configAccount as any).adminTestWallets || []).map((w: PublicKey) => w.toBase58()),
      });
    } catch (err: any) {
      console.error('Error loading config:', err);
      setError('Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  if (!connected || !publicKey || !isAdminWallet(publicKey.toBase58())) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin" className="inline-flex items-center text-sage-600 hover:text-sage-700 mb-2">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-warm-900">System Settings</h1>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
              ADMIN
            </span>
          </div>
          <p className="text-warm-600 mt-2">View and manage system configuration</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-600">Loading configuration...</p>
          </div>
        )}

        {/* Error State */}
        {error && !config && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-rose-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-rose-900 mb-2">{error}</h3>
          </div>
        )}

        {/* Config Display */}
        {!loading && config && (
          <>
            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
                <p className="text-rose-800 text-sm">{error}</p>
              </div>
            )}

            {/* Config Details */}
            <div className="bg-white rounded-xl border border-warm-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-warm-900 mb-4">Configuration Details</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-start py-3 border-b border-warm-100">
                  <div>
                    <p className="text-sm font-medium text-warm-900">Config PDA</p>
                    <p className="text-xs text-warm-600">On-chain config account address</p>
                  </div>
                  <p className="text-xs font-mono text-warm-700 max-w-xs text-right break-all">{config.pda}</p>
                </div>

                <div className="flex justify-between items-start py-3 border-b border-warm-100">
                  <div>
                    <p className="text-sm font-medium text-warm-900">Admin</p>
                    <p className="text-xs text-warm-600">System administrator wallet</p>
                  </div>
                  <p className="text-xs font-mono text-warm-700 max-w-xs text-right break-all">{config.admin}</p>
                </div>

                <div className="flex justify-between items-start py-3 border-b border-warm-100">
                  <div>
                    <p className="text-sm font-medium text-warm-900">USDC Mint</p>
                    <p className="text-xs text-warm-600">Allowed USDC token mint</p>
                  </div>
                  <p className="text-xs font-mono text-warm-700 max-w-xs text-right break-all">{config.usdcMint}</p>
                </div>

                <div className="flex justify-between items-start py-3 border-b border-warm-100">
                  <div>
                    <p className="text-sm font-medium text-warm-900">Max Lock Per Vault</p>
                    <p className="text-xs text-warm-600">Maximum amount that can be locked (lamports)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-warm-900">{config.maxLockPerVault}</p>
                    <p className="text-xs text-warm-600">
                      ({(parseInt(config.maxLockPerVault) / 1_000_000).toFixed(2)} USDC)
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-start py-3 border-b border-warm-100">
                  <div>
                    <p className="text-sm font-medium text-warm-900">System Status</p>
                    <p className="text-xs text-warm-600">Vault creation enabled/disabled</p>
                  </div>
                  <div>
                    {config.paused ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-medium">
                        <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                        Paused
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-3">
                  <div className="mb-2">
                    <p className="text-sm font-medium text-warm-900">Admin Test Wallets</p>
                    <p className="text-xs text-warm-600">Wallets with testing privileges (max 10)</p>
                  </div>
                  {config.adminTestWallets.length === 0 ? (
                    <p className="text-xs text-warm-500 italic">No test wallets configured</p>
                  ) : (
                    <div className="space-y-2">
                      {config.adminTestWallets.map((wallet: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-warm-50 rounded-lg">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span className="text-xs font-mono text-warm-700">{wallet}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="flex gap-3">
                <svg className="w-6 h-6 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">Configuration Management</h3>
                  <p className="text-sm text-amber-800">
                    System configuration is stored on-chain and can only be modified by the admin wallet using the
                    <code className="px-2 py-0.5 bg-amber-100 rounded mx-1 font-mono text-xs">update_config</code>
                    and
                    <code className="px-2 py-0.5 bg-amber-100 rounded mx-1 font-mono text-xs">update_admin_test_wallets</code>
                    instructions. UI-based updates are not yet implemented - use CLI tools for modifications.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
