'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatUSDC, formatAddress, formatDateTime } from '../../_lib/format';
import { StatusBadge } from '../../_components/StatusBadge';
import { Countdown } from '../../_components/Countdown';
import { getVaultMeta, getActivityLog, ActivityLogEntry, addActivityLog } from '../../_lib/storage';
import Link from 'next/link';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { connection, PROGRAM_ID, USDC_MINT } from '../../_lib/solana';
import { releaseInstruction, closeVaultInstruction } from '../../_lib/instructions';

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
  const { connected, publicKey, sendTransaction } = useWallet();
  const router = useRouter();
  const params = useParams();
  const vaultPda = params.vaultPda as string;

  const [vault, setVault] = useState<VaultDetail | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

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

  const loadVaultDetail = async () => {
    const meta = getVaultMeta(vaultPda);

    if (!meta) {
      setLoading(false);
      return;
    }

    try {
      // Connect to devnet and fetch real vault data
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const vaultAccount = await connection.getAccountInfo(new PublicKey(vaultPda));

      if (!vaultAccount) {
        console.error('Vault account not found on-chain');
        setLoading(false);
        return;
      }

      // Deserialize vault account data
      // Struct layout: 8 discriminator + 32 creator + 32 beneficiary + 32 usdc_mint + 32 vault_token_account
      // + 8 amount_locked + 8 unlock_unix + 1 released + 1 cancelled + 1 is_test_vault + 1 bump + 32 name_hash
      // + 4 vault_id + 4 vault_period_seconds + 4 notification_window_seconds + 4 grace_period_seconds + 8 last_check_in
      const data = vaultAccount.data;

      const creator = new PublicKey(data.slice(8, 40));
      const beneficiary = new PublicKey(data.slice(40, 72));
      const amountLockedBuf = data.slice(136, 144);
      const unlockUnixBuf = data.slice(144, 152);
      const released = data[152] === 1;

      // Read as little-endian
      const amountLocked = Number(new DataView(amountLockedBuf.buffer, amountLockedBuf.byteOffset, 8).getBigUint64(0, true));
      const unlockUnix = Number(new DataView(unlockUnixBuf.buffer, unlockUnixBuf.byteOffset, 8).getBigInt64(0, true));

      const vaultDetail: VaultDetail = {
        vaultPda,
        name: meta.name,
        amountLocked,
        unlockUnix,
        beneficiary: beneficiary.toBase58(),
        creator: creator.toBase58(),
        released,
        createdAt: meta.createdAt,
      };

      setVault(vaultDetail);
      setActivity(getActivityLog(vaultPda));
    } catch (error) {
      console.error('Error loading vault:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!publicKey || !sendTransaction || !vault) {
      setErrorMessage('Wallet not connected or vault not loaded');
      return;
    }

    setIsReleasing(true);
    setErrorMessage('');

    try {
      const programId = new PublicKey(PROGRAM_ID);
      const vaultPdaKey = new PublicKey(vaultPda);
      const beneficiaryKey = new PublicKey(vault.beneficiary);
      const creatorKey = new PublicKey(vault.creator);

      // Derive vault counter PDA
      const [counterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_counter'), creatorKey.toBuffer()],
        programId
      );

      // Derive vault token account
      const vaultTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(USDC_MINT),
        vaultPdaKey,
        true // allowOwnerOffCurve = true for PDA
      );

      // Get beneficiary's USDC token account
      const beneficiaryUsdcAta = await getAssociatedTokenAddress(
        new PublicKey(USDC_MINT),
        beneficiaryKey
      );

      // Build release instruction
      const instruction = await releaseInstruction({
        vault: vaultPdaKey,
        counter: counterPda,
        vaultTokenAccount,
        usdcMint: new PublicKey(USDC_MINT),
        beneficiaryUsdcAta,
        beneficiary: beneficiaryKey,
        payer: publicKey,
        programId,
      });

      // Create and send transaction
      const transaction = new Transaction().add(instruction);

      console.log('Sending release transaction...');
      const signature = await sendTransaction(transaction, connection);
      console.log('Transaction sent:', signature);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('Transaction confirmed!');

      // Log activity
      addActivityLog({
        vaultPda,
        type: 'released',
        timestamp: Date.now(),
        signature,
        amount: vault.amountLocked,
      });

      // Reload vault data
      await loadVaultDetail();
    } catch (error) {
      console.error('Release failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Transaction failed');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleCloseVault = async () => {
    if (!publicKey || !sendTransaction || !vault) {
      setErrorMessage('Wallet not connected or vault not loaded');
      return;
    }

    setIsClosing(true);
    setErrorMessage('');

    try {
      const programId = new PublicKey(PROGRAM_ID);
      const vaultPdaKey = new PublicKey(vaultPda);
      const creatorKey = new PublicKey(vault.creator);

      // Derive vault token account
      const vaultTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(USDC_MINT),
        vaultPdaKey,
        true // allowOwnerOffCurve = true for PDA
      );

      // Build close vault instruction
      const instruction = await closeVaultInstruction({
        vault: vaultPdaKey,
        vaultTokenAccount,
        creator: creatorKey,
        signer: publicKey,
        programId,
      });

      // Create and send transaction
      const transaction = new Transaction().add(instruction);

      console.log('Sending close vault transaction...');
      const signature = await sendTransaction(transaction, connection);
      console.log('Transaction sent:', signature);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('Transaction confirmed!');

      // Log activity
      addActivityLog({
        vaultPda,
        type: 'released', // Using 'released' as type since we don't have 'closed'
        timestamp: Date.now(),
        signature,
      });

      // Redirect to vaults list after closing
      router.push('/vaults');
    } catch (error) {
      console.error('Close vault failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Transaction failed');
    } finally {
      setIsClosing(false);
    }
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

        {/* Error Message */}
        {errorMessage && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="font-semibold text-red-300 mb-1">Error</p>
                <p className="text-sm text-red-200">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Release Action */}
        {!vault.released && isUnlocked && (
          <div className="p-6 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-xl border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Ready to Release</h3>
                <p className="text-sm text-gray-400">
                  This vault is now unlocked. Release {formatUSDC(vault.amountLocked)} to the beneficiary
                </p>
              </div>
              <button
                onClick={handleRelease}
                disabled={isReleasing}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-2"
              >
                {isReleasing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Releasing...
                  </>
                ) : (
                  'Release Funds'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Close Vault Action */}
        {vault.released && vault.amountLocked === 0 && isCreator && (
          <div className="p-6 bg-gradient-to-r from-gray-900/20 to-gray-800/20 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold mb-1">Close Vault</h3>
                <p className="text-sm text-gray-400">
                  This vault has been released and is empty. Close it to reclaim rent
                </p>
              </div>
              <button
                onClick={handleCloseVault}
                disabled={isClosing}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-2 border border-gray-700"
              >
                {isClosing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Closing...
                  </>
                ) : (
                  'Close Vault'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
