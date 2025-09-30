'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatUSDC, formatAddress, formatDateTime } from '../../../_lib/format';
import { getVaultMeta, addActivityLog } from '../../../_lib/storage';
import Link from 'next/link';

type Step = 'confirm' | 'processing' | 'success' | 'error';

interface VaultInfo {
  vaultPda: string;
  name: string;
  amountLocked: number;
  unlockUnix: number;
  beneficiary: string;
  creator: string;
}

export default function ReleasePage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const params = useParams();
  const vaultPda = params.vaultPda as string;

  const [step, setStep] = useState<Step>('confirm');
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [txSignature, setTxSignature] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  useEffect(() => {
    if (connected && vaultPda) {
      loadVault();
    }
  }, [connected, vaultPda]);

  const loadVault = () => {
    const meta = getVaultMeta(vaultPda);
    
    if (!meta) {
      router.push('/vaults');
      return;
    }

    // Mock vault info
    const mockVault: VaultInfo = {
      vaultPda,
      name: meta.name,
      amountLocked: 10_000_000, // 10 USDC
      unlockUnix: Math.floor(Date.now() / 1000) - 3600, // Already unlocked (1 hour ago)
      beneficiary: publicKey?.toBase58() || '',
      creator: publicKey?.toBase58() || '',
    };

    setVault(mockVault);
  };

  const handleRelease = async () => {
    setStep('processing');

    try {
      // Note: This is a placeholder for the actual transaction
      // In a real implementation, you would:
      // 1. Get the program instance
      // 2. Derive PDAs
      // 3. Build release transaction
      // 4. Send and confirm transaction

      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Mock transaction signature
      const mockSignature = '5' + 'x'.repeat(87); // Valid-looking signature
      setTxSignature(mockSignature);

      // Log activity
      addActivityLog({
        vaultPda,
        type: 'released',
        timestamp: Date.now(),
        signature: mockSignature,
        amount: vault?.amountLocked,
      });

      setStep('success');
    } catch (error) {
      console.error('Release failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Transaction failed');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setErrorMessage('');
    setStep('confirm');
  };

  if (!connected || !publicKey || !vault) {
    return null;
  }

  const explorerUrl = `https://explorer.solana.com/tx/${txSignature}?cluster=mainnet`;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Confirm Step */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Release Funds</h2>
                  <p className="text-sm text-gray-400">Confirm fund release to beneficiary</p>
                </div>
              </div>

              {/* Vault Details */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Vault Name</p>
                  <p className="text-lg font-semibold">{vault.name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Amount to Release</p>
                  <p className="text-3xl font-bold text-green-400">{formatUSDC(vault.amountLocked)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Beneficiary</p>
                  <p className="text-sm font-mono bg-gray-900 px-3 py-2 rounded border border-gray-800 break-all">
                    {vault.beneficiary}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Unlocked Since</p>
                  <p className="font-semibold">{formatDateTime(vault.unlockUnix)}</p>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-green-200">
                    <p className="font-semibold mb-1">Ready to Release</p>
                    <p>The unlock time has passed. Funds will be transferred to the beneficiary&apos;s wallet. This action is irreversible.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Link
                href={`/vaults/${vaultPda}`}
                className="flex-1 px-6 py-4 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors border border-gray-700 text-center"
              >
                Cancel
              </Link>
              <button
                onClick={handleRelease}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-semibold transition-all transform hover:scale-[1.02] shadow-lg shadow-green-500/25"
              >
                Confirm Release
              </button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div className="p-12 bg-gray-900/50 rounded-xl border border-gray-800 text-center space-y-6">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <svg className="w-8 h-8 text-green-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Releasing Funds...</h2>
              <p className="text-gray-400">Please confirm the transaction in your wallet</p>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="space-y-6">
            <div className="p-8 bg-gray-900/50 rounded-xl border border-gray-800 text-center space-y-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Funds Released Successfully!</h2>
                <p className="text-gray-400">The funds have been transferred to the beneficiary</p>
              </div>

              {/* Details */}
              <div className="p-4 bg-gray-900 rounded-lg border border-gray-800 space-y-3 text-left">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Amount Released</p>
                  <p className="font-semibold text-green-400">{formatUSDC(vault.amountLocked)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Recipient</p>
                  <p className="text-sm font-mono text-gray-400 break-all">{formatAddress(vault.beneficiary, 12)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Transaction</p>
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-purple-400 hover:text-purple-300 break-all flex items-center gap-1"
                  >
                    {formatAddress(txSignature, 12)}
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Explorer Link */}
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors border border-gray-700"
              >
                View on Solana Explorer
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Link
                href="/vaults"
                className="flex-1 px-6 py-4 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors border border-gray-700 text-center"
              >
                Back to Vaults
              </Link>
              <Link
                href={`/vaults/${vaultPda}`}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all text-center"
              >
                View Vault
              </Link>
            </div>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="space-y-6">
            <div className="p-8 bg-gray-900/50 rounded-xl border border-gray-800 text-center space-y-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Release Failed</h2>
                <p className="text-gray-400 mb-4">The transaction could not be completed</p>
                {errorMessage && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-300">{errorMessage}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Link
                href={`/vaults/${vaultPda}`}
                className="flex-1 px-6 py-4 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors border border-gray-700 text-center"
              >
                Cancel
              </Link>
              <button
                onClick={handleRetry}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
