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
  const [isOldSchema, setIsOldSchema] = useState(false);

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
        // Vault has been closed - this is normal after releasing and closing
        console.log('Vault account not found (likely closed)');
        setVault(null); // Will show "Vault closed" message
        setLoading(false);
        return;
      }

      // Check for old schema vaults (undeserializable)
      const CURRENT_VAULT_SIZE = 216; // 8 discriminator + 208 struct data
      if (vaultAccount.data.length !== CURRENT_VAULT_SIZE) {
        console.error('Vault has incompatible schema (old version). Size:', vaultAccount.data.length, 'expected:', CURRENT_VAULT_SIZE);
        setIsOldSchema(true);
        setVault(null);
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

      // Simulate first to get better error messages
      console.log('Simulating release transaction...');
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const simulation = await connection.simulateTransaction(transaction);
      console.log('Simulation result:', simulation);

      if (simulation.value.err) {
        console.error('Simulation failed:', simulation.value.err);
        console.error('Simulation logs:', simulation.value.logs);
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }

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
          <div className="p-12 bg-white rounded-2xl border border-warm-200 shadow-sm text-center">
            <div className="w-8 h-8 border-4 border-sage-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-warm-600">Loading vault...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {isOldSchema ? (
            <div className="p-12 bg-white rounded-2xl border border-warm-200 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-warm-900 mb-2">Incompatible Vault</h3>
                <p className="text-warm-600 mb-2">This vault was created with an old schema</p>
                <p className="text-sm text-warm-500 mb-6">Due to a schema migration, this vault cannot be accessed. This is a known issue on devnet.</p>
                <Link
                  href="/vaults"
                  className="inline-block px-6 py-3 bg-sage-600 hover:bg-sage-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
                >
                  Back to Vaults
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-12 bg-white rounded-2xl border border-warm-200 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-warm-900 mb-2">Vault Closed</h3>
                <p className="text-warm-600 mb-2">This vault has been successfully closed</p>
                <p className="text-sm text-warm-500 mb-6">Funds were released and rent was refunded to your wallet</p>
                <Link
                  href="/vaults"
                  className="inline-block px-6 py-3 bg-sage-600 hover:bg-sage-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
                >
                  Back to Vaults
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const isUnlocked = now >= vault.unlockUnix;
  // Status based on actual vault state - check amountLocked to determine if truly released
  const status = (vault.amountLocked === 0 && vault.released) ? 'released' : isUnlocked ? 'unlocked' : 'locked';
  const isCreator = vault.creator === publicKey.toBase58();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link
          href="/vaults"
          className="inline-flex items-center gap-2 text-warm-600 hover:text-warm-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Vaults
        </Link>

        {/* Header */}
        <div className="p-6 bg-white rounded-2xl border border-warm-200 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-warm-900 mb-2">{vault.name}</h1>
              <p className="text-sm text-warm-500">
                {isCreator ? 'Created by you' : `From ${formatAddress(vault.creator)}`}
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="text-4xl font-bold text-sage-700 mb-6">
            {formatUSDC(vault.amountLocked)}
          </div>

          {!vault.released && (
            <div className="p-4 bg-warm-50 rounded-xl border border-warm-200">
              <p className="text-sm text-warm-600 mb-3">
                {isUnlocked ? 'Ready to release' : 'Time remaining'}
              </p>
              <Countdown unlockUnix={vault.unlockUnix} />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-6 bg-white rounded-2xl border border-warm-200 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-warm-900 mb-4">Vault Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-warm-500 mb-1">Beneficiary</p>
              <p className="font-mono text-sm break-all text-warm-900">{vault.beneficiary}</p>
            </div>

            <div>
              <p className="text-sm text-warm-500 mb-1">Creator</p>
              <p className="font-mono text-sm break-all text-warm-900">{vault.creator}</p>
            </div>

            <div>
              <p className="text-sm text-warm-500 mb-1">Unlock Date</p>
              <p className="font-semibold text-warm-900">{formatDateTime(vault.unlockUnix)}</p>
            </div>

            <div>
              <p className="text-sm text-warm-500 mb-1">Created</p>
              <p className="font-semibold text-warm-900">{formatDateTime(Math.floor(vault.createdAt / 1000))}</p>
            </div>

            <div>
              <p className="text-sm text-warm-500 mb-1">Vault Address</p>
              <p className="font-mono text-xs break-all text-warm-600">{vault.vaultPda}</p>
            </div>

            <div>
              <p className="text-sm text-warm-500 mb-1">Status</p>
              <p className="font-semibold text-warm-900">
                {vault.released ? 'Released' : isUnlocked ? 'Ready to Release' : 'Locked'}
              </p>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="p-6 bg-white rounded-2xl border border-warm-200 shadow-sm">
          <h2 className="text-xl font-bold text-warm-900 mb-4">Activity</h2>

          {activity.length === 0 ? (
            <p className="text-warm-500 text-center py-8">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {activity.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-warm-50 rounded-xl border border-warm-200"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    entry.type === 'created' ? 'bg-sage-600' :
                    entry.type === 'deposited' ? 'bg-emerald-600' :
                    'bg-purple-pink-600'
                  }`} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-warm-900">
                      {entry.type === 'created' && 'Vault Created'}
                      {entry.type === 'deposited' && `Deposited ${formatUSDC(entry.amount || 0)}`}
                      {entry.type === 'released' && 'Funds Released'}
                    </p>
                    <p className="text-xs text-warm-500">
                      {formatDateTime(Math.floor(entry.timestamp / 1000))}
                    </p>
                    {entry.signature && (
                      <p className="text-xs font-mono text-warm-600 mt-1 break-all">
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
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div>
                <p className="font-semibold text-rose-900 mb-1">Error</p>
                <p className="text-sm text-rose-800">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Release Action */}
        {vault.amountLocked > 0 && isUnlocked && (
          <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-emerald-900 mb-1">Ready to Release</h3>
                <p className="text-sm text-emerald-700">
                  This vault is now unlocked. Release {formatUSDC(vault.amountLocked)} to the beneficiary
                </p>
              </div>
              <button
                onClick={handleRelease}
                disabled={isReleasing}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 shadow-sm"
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
          <div className="p-6 bg-warm-100 rounded-2xl border border-warm-200 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-warm-900 mb-1">Close Vault</h3>
                <p className="text-sm text-warm-600">
                  This vault has been released and is empty. Close it to reclaim rent
                </p>
              </div>
              <button
                onClick={handleCloseVault}
                disabled={isClosing}
                className="px-6 py-3 bg-warm-700 hover:bg-warm-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 shadow-sm"
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
