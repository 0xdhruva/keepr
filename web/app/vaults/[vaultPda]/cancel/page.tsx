'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { connection, PROGRAM_ID, USDC_MINT } from '../../../_lib/solana';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getVaultCache, saveVaultMeta } from '../../../_lib/storage';
import { formatUSDC } from '../../../_lib/format';
import idl from '../../../_lib/keepr_vault.json';
import Link from 'next/link';

export default function CancelVaultPage() {
  const { connected, publicKey, signTransaction } = useWallet();
  const router = useRouter();
  const params = useParams();
  const vaultPda = params.vaultPda as string;

  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [txSignature, setTxSignature] = useState('');

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  useEffect(() => {
    if (connected && publicKey) {
      loadVault();
    }
  }, [connected, publicKey, vaultPda]);

  const loadVault = async () => {
    try {
      const cache = getVaultCache();
      const vaultMeta = cache.find(v => v.vaultPda === vaultPda);

      if (!vaultMeta) {
        setError('Vault not found');
        setLoading(false);
        return;
      }

      // Check if user is the creator
      if (vaultMeta.creator !== publicKey?.toBase58()) {
        setError('Only the vault creator can cancel it');
        setLoading(false);
        return;
      }

      // Check if already cancelled or released
      if (vaultMeta.cancelled) {
        setError('Vault has already been cancelled');
        setLoading(false);
        return;
      }

      if (vaultMeta.released) {
        setError('Cannot cancel a vault that has been released');
        setLoading(false);
        return;
      }

      setVault(vaultMeta);
    } catch (err: any) {
      console.error('Error loading vault:', err);
      setError(err.message || 'Failed to load vault');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!publicKey || !signTransaction || !vault) return;

    setProcessing(true);
    setError('');

    try {
      // Create provider
      const provider = new AnchorProvider(
        connection,
        { publicKey, signTransaction, signAllTransactions: async (txs) => txs } as any,
        { commitment: 'confirmed' }
      );

      const program = new Program(idl as any, provider);

      // Derive PDAs
      const vaultPdaKey = new PublicKey(vaultPda);
      const creatorKey = publicKey;

      // Get vault account to retrieve vault_id
      const vaultAccount = await program.account.vault.fetch(vaultPdaKey);
      const vaultId = (vaultAccount as any).vaultId;

      // Derive counter PDA
      const [counterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_counter'), creatorKey.toBuffer()],
        new PublicKey(PROGRAM_ID)
      );

      // Get token accounts
      const vaultTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(USDC_MINT),
        vaultPdaKey,
        true
      );

      const creatorUsdcAta = await getAssociatedTokenAddress(
        new PublicKey(USDC_MINT),
        creatorKey
      );

      console.log('Cancelling vault...');
      console.log('Vault PDA:', vaultPda);
      console.log('Creator:', creatorKey.toBase58());
      console.log('Vault ID:', vaultId.toString());

      // Call cancel_vault instruction
      const tx = await program.methods
        .cancelVault()
        .accounts({
          vault: vaultPdaKey,
          counter: counterPda,
          vaultTokenAccount,
          usdcMint: new PublicKey(USDC_MINT),
          creatorUsdcAta,
          creator: creatorKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: PublicKey.default,
        } as any)
        .rpc();

      console.log('Transaction signature:', tx);
      setTxSignature(tx);

      // Update local storage
      saveVaultMeta({
        ...vault,
        cancelled: true,
        released: false,
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Error cancelling vault:', err);
      setError(err.message || 'Failed to cancel vault');
    } finally {
      setProcessing(false);
    }
  };

  if (!connected || !publicKey) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-8 h-8 border-4 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-warm-600">Loading vault...</p>
        </div>
      </div>
    );
  }

  if (error && !vault) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-rose-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-rose-900 mb-2">{error}</h3>
            <Link href="/vaults" className="inline-block mt-4 px-6 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-lg font-medium transition-colors">
              Back to Vaults
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">Vault Cancelled</h2>
            <p className="text-green-700 mb-6">
              Your vault has been cancelled and funds have been returned to your wallet.
            </p>
            {txSignature && (
              <a
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mb-4 text-sm text-sage-600 hover:text-sage-700 underline"
              >
                View Transaction
              </a>
            )}
            <div className="flex gap-3">
              <Link
                href="/vaults"
                className="flex-1 px-6 py-3 bg-sage-600 hover:bg-sage-700 text-white rounded-xl font-medium transition-colors"
              >
                Back to Vaults
              </Link>
              <Link
                href="/create"
                className="flex-1 px-6 py-3 bg-warm-200 hover:bg-warm-300 text-warm-900 rounded-xl font-medium transition-colors"
              >
                Create New Vault
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/vaults/${vaultPda}`} className="inline-flex items-center text-sage-600 hover:text-sage-700 mb-4">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Vault
          </Link>
          <h1 className="text-3xl font-bold text-warm-900">Cancel Vault</h1>
          <p className="text-warm-600 mt-2">
            Permanently cancel this vault and receive your funds back
          </p>
        </div>

        {/* Warning Card */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Warning: This Action Cannot Be Undone</h3>
              <p className="text-sm text-amber-800">
                Cancelling this vault will permanently close it and return all funds to your wallet.
                The beneficiary will not receive anything.
              </p>
            </div>
          </div>
        </div>

        {/* Vault Details */}
        <div className="bg-white rounded-xl border border-warm-200 p-6 mb-6">
          <h3 className="font-semibold text-warm-900 mb-4">Vault Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-warm-600">Name</span>
              <span className="font-medium text-warm-900">{vault?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-600">Amount</span>
              <span className="font-medium text-warm-900">{formatUSDC(vault?.amountLocked || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-600">Unlock Date</span>
              <span className="font-medium text-warm-900">
                {vault?.unlockUnix ? new Date(vault.unlockUnix * 1000).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6">
            <p className="text-rose-800 text-sm">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link
            href={`/vaults/${vaultPda}`}
            className="flex-1 px-6 py-3 bg-warm-200 hover:bg-warm-300 text-warm-900 rounded-xl font-medium transition-colors text-center"
          >
            Keep Vault
          </Link>
          <button
            onClick={handleCancel}
            disabled={processing}
            className="flex-1 px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl font-medium transition-colors"
          >
            {processing ? 'Cancelling...' : 'Cancel Vault'}
          </button>
        </div>
      </div>
    </div>
  );
}
