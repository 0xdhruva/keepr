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
import { releaseInstruction, closeVaultInstruction, checkInInstruction } from '../../_lib/instructions';
import { useNotifications } from '../../_contexts/NotificationContext';

interface VaultDetail {
  vaultPda: string;
  name: string;
  amountLocked: number;
  unlockUnix: number;
  beneficiary: string;
  creator: string;
  released: boolean;
  cancelled: boolean;
  createdAt: number;
  tier: number;
  creationFeePaid: number;
  checkinPeriodSeconds: number;
  notificationWindowSeconds: number;
  gracePeriodSeconds: number;
  lastCheckinUnix: number;
}

export default function VaultDetailPage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const router = useRouter();
  const params = useParams();
  const vaultPda = params.vaultPda as string;
  const { addNotification } = useNotifications();

  const [vault, setVault] = useState<VaultDetail | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isOldSchema, setIsOldSchema] = useState(false);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  // Update current time every second to refresh UI state
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

  // Auto-refresh when vault is in critical state (grace period or ready for release)
  useEffect(() => {
    if (!vault || vault.released || loading) return;

    // Calculate if vault is in grace period or later
    const now = Math.floor(Date.now() / 1000);
    const effectiveUnlock = vault.lastCheckinUnix > 0 
      ? vault.lastCheckinUnix + vault.checkinPeriodSeconds 
      : vault.unlockUnix;
    const gracePeriodEnd = effectiveUnlock + vault.gracePeriodSeconds;
    const isInCriticalState = now >= effectiveUnlock; // Grace period or later

    if (isInCriticalState) {
      console.log('Vault in critical state - starting auto-refresh polling');
      const interval = setInterval(() => {
        console.log('Auto-refreshing vault data from blockchain...');
        loadVaultDetail();
      }, 10000); // Poll every 10 seconds

      return () => {
        console.log('Stopping auto-refresh polling');
        clearInterval(interval);
      };
    }
  }, [vault, loading]);

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
        console.log('Vault account not found (likely closed) - loading from cache');

        // Load vault details from cache to show final state
        const vaultDetail: VaultDetail = {
          vaultPda,
          name: meta.name,
          amountLocked: meta.amountLocked || 0,
          unlockUnix: meta.unlockUnix,
          beneficiary: meta.beneficiary,
          creator: meta.creator,
          released: meta.released || false,
          cancelled: meta.cancelled || false,
          createdAt: meta.createdAt || Date.now(),
          tier: meta.tier || 0,
          creationFeePaid: meta.creationFeePaid || 0,
          checkinPeriodSeconds: meta.checkinPeriodSeconds || 0,
          notificationWindowSeconds: meta.notificationWindowSeconds || 0,
          gracePeriodSeconds: meta.gracePeriodSeconds || 0,
          lastCheckinUnix: meta.lastCheckinUnix || 0,
        };

        setVault(vaultDetail);
        setActivity(getActivityLog(vaultPda));
        setLoading(false);
        return;
      }

      // Check for old schema vaults (undeserializable)
      const CURRENT_VAULT_SIZE = 237; // 8 discriminator + 229 struct data (with new dead man's switch fields)
      if (vaultAccount.data.length !== CURRENT_VAULT_SIZE) {
        console.log('Vault has incompatible schema (old version). Size:', vaultAccount.data.length, 'expected:', CURRENT_VAULT_SIZE);
        setIsOldSchema(true);
        setVault(null);
        setLoading(false);
        return;
      }

      // Deserialize vault account data
      // Struct layout (all offsets from start of data, including 8-byte discriminator):
      // 8-40: creator (32 bytes)
      // 40-72: beneficiary (32 bytes)
      // 72-104: usdc_mint (32 bytes)
      // 104-136: vault_token_account (32 bytes)
      // 136-144: amount_locked (8 bytes, u64)
      // 144-152: unlock_unix (8 bytes, i64)
      // 152: released (1 byte, bool)
      // 153: cancelled (1 byte, bool)
      // 154: is_test_vault (1 byte, bool)
      // 155: bump (1 byte, u8)
      // 156-188: name_hash (32 bytes, [u8; 32])
      // 188-196: vault_id (8 bytes, u64)
      // 196-200: vault_period_seconds (4 bytes, u32)
      // 200-204: notification_window_seconds (4 bytes, u32)
      // 204-208: grace_period_seconds (4 bytes, u32)
      // 208-216: last_checkin_unix (8 bytes, i64)
      // 216: tier (1 byte, u8 enum)
      // 217-225: created_at (8 bytes, i64)
      // 225-233: creation_fee_paid (8 bytes, u64)
      // 233-237: checkin_period_seconds (4 bytes, u32)
      const data = vaultAccount.data;

      const creator = new PublicKey(data.slice(8, 40));
      const beneficiary = new PublicKey(data.slice(40, 72));
      const amountLockedBuf = data.slice(136, 144);
      const unlockUnixBuf = data.slice(144, 152);
      const released = data[152] === 1;
      const cancelled = data[153] === 1;
      const notificationWindowBuf = data.slice(200, 204);
      const gracePeriodBuf = data.slice(204, 208);
      const lastCheckinBuf = data.slice(208, 216);
      const tier = data[216];
      const createdAtBuf = data.slice(217, 225);
      const creationFeePaidBuf = data.slice(225, 233);
      const checkinPeriodBuf = data.slice(233, 237);

      // Read as little-endian
      const amountLocked = Number(new DataView(amountLockedBuf.buffer, amountLockedBuf.byteOffset, 8).getBigUint64(0, true));
      const unlockUnix = Number(new DataView(unlockUnixBuf.buffer, unlockUnixBuf.byteOffset, 8).getBigInt64(0, true));
      const notificationWindowSeconds = new DataView(notificationWindowBuf.buffer, notificationWindowBuf.byteOffset, 4).getUint32(0, true);
      const gracePeriodSeconds = new DataView(gracePeriodBuf.buffer, gracePeriodBuf.byteOffset, 4).getUint32(0, true);
      const lastCheckinUnix = Number(new DataView(lastCheckinBuf.buffer, lastCheckinBuf.byteOffset, 8).getBigInt64(0, true));
      const createdAt = Number(new DataView(createdAtBuf.buffer, createdAtBuf.byteOffset, 8).getBigInt64(0, true));
      const creationFeePaid = Number(new DataView(creationFeePaidBuf.buffer, creationFeePaidBuf.byteOffset, 8).getBigUint64(0, true));
      const checkinPeriodSeconds = new DataView(checkinPeriodBuf.buffer, checkinPeriodBuf.byteOffset, 4).getUint32(0, true);

      const vaultDetail: VaultDetail = {
        vaultPda,
        name: meta.name,
        amountLocked,
        unlockUnix,
        beneficiary: beneficiary.toBase58(),
        creator: creator.toBase58(),
        released,
        cancelled,
        createdAt: createdAt * 1000, // Convert to milliseconds
        tier,
        creationFeePaid,
        checkinPeriodSeconds,
        notificationWindowSeconds,
        gracePeriodSeconds,
        lastCheckinUnix,
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

  const handleCheckIn = async () => {
    if (!publicKey || !sendTransaction || !vault) {
      setErrorMessage('Wallet not connected or vault not loaded');
      return;
    }

    setIsCheckingIn(true);
    setErrorMessage('');

    try {
      const programId = new PublicKey(PROGRAM_ID);
      const vaultPdaKey = new PublicKey(vaultPda);
      const creatorKey = new PublicKey(vault.creator);

      // Derive vault counter PDA
      const [counterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_counter'), creatorKey.toBuffer()],
        programId
      );

      // Build check-in instruction
      const instruction = await checkInInstruction({
        vault: vaultPdaKey,
        counter: counterPda,
        creator: publicKey,
        programId,
      });

      // Create and send transaction
      const transaction = new Transaction().add(instruction);

      console.log('Sending check-in transaction...');
      const signature = await sendTransaction(transaction, connection);
      console.log('Transaction sent:', signature);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('Transaction confirmed!');

      // Log activity
      addActivityLog({
        vaultPda,
        type: 'deposited', // Reusing 'deposited' type for check-in
        timestamp: Date.now(),
        signature,
      });

      // Add success notification
      addNotification({
        type: 'checkin_success',
        title: 'Check-in Successful',
        message: `Successfully checked in for vault "${vault.name}". Next deadline extended.`,
        vaultPda,
      });

      // Reload vault data
      await loadVaultDetail();
    } catch (error) {
      console.error('Check-in failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Transaction failed');
    } finally {
      setIsCheckingIn(false);
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
                <h3 className="text-xl font-bold text-warm-900 mb-2">Legacy Vault (Devnet)</h3>
                <p className="text-warm-600 mb-2">This vault was created with an older program version</p>
                <p className="text-sm text-warm-500 mb-6">
                  This vault cannot be accessed or closed with the current program. This is expected on devnet where we test program upgrades.
                  On mainnet, the program is stable and this won't happen.
                </p>
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
                <h3 className="text-xl font-bold text-warm-900 mb-2">Vault Completed</h3>
                <p className="text-warm-600 mb-2">This vault was automatically released and closed</p>
                <p className="text-sm text-warm-500 mb-6">Funds were sent to the beneficiary and rent was automatically refunded to the creator's wallet</p>
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

  // Use currentTime state which updates every second
  const now = currentTime;
  
  // Calculate effective unlock time (handles check-ins)
  const effectiveUnlock = vault.lastCheckinUnix > 0 
    ? vault.lastCheckinUnix + vault.checkinPeriodSeconds 
    : vault.unlockUnix;
  
  const isUnlocked = now >= effectiveUnlock;

  // Calculate notification window start
  const notificationStart = effectiveUnlock - vault.notificationWindowSeconds;
  const isInNotificationWindow = now >= notificationStart && now < effectiveUnlock;

  // Calculate grace period end
  const gracePeriodEnd = effectiveUnlock + vault.gracePeriodSeconds;
  const isInGracePeriod = now >= effectiveUnlock && now < gracePeriodEnd;
  const canRelease = now >= gracePeriodEnd;

  // Check-in is allowed ONLY during notification window and grace period (not after!)
  const canCheckIn = now >= notificationStart && now < gracePeriodEnd;

  // Status based on actual vault state
  // IMPORTANT: Check cancelled and released FIRST, then check grace period BEFORE canRelease
  const status = vault.cancelled ? 'cancelled'
    : vault.released ? 'released'
    : isInGracePeriod ? 'grace_period'           // During grace period (check FIRST)
    : canRelease ? 'unlocked'                    // After grace period ends
    : isInNotificationWindow ? 'checkin_window'  // During notification window
    : 'active';                                  // Before notification window

  const isCreator = vault.creator === publicKey.toBase58();

  const tierNames = ['Base', 'Plus', 'Premium', 'Lifetime'];
  const tierColors = ['blue', 'purple', 'orange', 'emerald'];

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
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-warm-900">{vault.name}</h1>
                <span className={`px-3 py-1 bg-${tierColors[vault.tier]}-100 text-${tierColors[vault.tier]}-700 text-xs font-semibold rounded-full border border-${tierColors[vault.tier]}-200`}>
                  {tierNames[vault.tier]}
                </span>
              </div>
              <p className="text-sm text-warm-500">
                {isCreator ? 'Created by you' : `From ${formatAddress(vault.creator)}`}
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="text-4xl font-bold text-sage-700 mb-6">
            {formatUSDC(vault.amountLocked)}
          </div>

          {!vault.released && !vault.cancelled && (
            <div className={`p-4 rounded-xl border ${
              isInGracePeriod ? 'bg-rose-50 border-rose-200'
                : isInNotificationWindow ? 'bg-blue-50 border-blue-200'
                : 'bg-warm-50 border-warm-200'
            }`}>
              <p className={`text-sm mb-3 font-medium ${
                isInGracePeriod ? 'text-rose-700'
                  : isInNotificationWindow ? 'text-blue-700'
                  : 'text-warm-600'
              }`}>
                {canRelease ? 'Grace period ended - Ready to release'
                  : isInGracePeriod ? '⚠️ URGENT: In grace period - Check in or funds release!'
                  : isInNotificationWindow ? 'Check-in window open - Time to check in'
                  : 'Next check-in deadline:'}
              </p>
              <Countdown unlockUnix={canRelease ? gracePeriodEnd : isInGracePeriod ? gracePeriodEnd : effectiveUnlock} />
              <p className="text-xs text-warm-500 mt-2">
                Check-in frequency: Every {Math.floor(vault.checkinPeriodSeconds / 86400) > 0
                  ? `${Math.floor(vault.checkinPeriodSeconds / 86400)} days`
                  : `${Math.floor(vault.checkinPeriodSeconds / 60)} minutes`}
              </p>
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
              <p className="text-sm text-warm-500 mb-1">Next Deadline</p>
              <p className="font-semibold text-warm-900">{formatDateTime(effectiveUnlock)}</p>
            </div>

            <div>
              <p className="text-sm text-warm-500 mb-1">Created</p>
              <p className="font-semibold text-warm-900">{formatDateTime(Math.floor(vault.createdAt / 1000))}</p>
            </div>

            <div>
              <p className="text-sm text-warm-500 mb-1">Vault Tier</p>
              <p className="font-semibold text-warm-900">{tierNames[vault.tier]}</p>
            </div>

            <div>
              <p className="text-sm text-warm-500 mb-1">Creation Fee</p>
              <p className="font-semibold text-warm-900">{formatUSDC(vault.creationFeePaid)}</p>
            </div>

            <div>
              <p className="text-sm text-warm-500 mb-1">Check-In Period</p>
              <p className="font-semibold text-warm-900">Every {Math.floor(vault.checkinPeriodSeconds / 86400)} days</p>
            </div>

            <div>
              <p className="text-sm text-warm-500 mb-1">Last Check-In</p>
              <p className="font-semibold text-warm-900">{formatDateTime(vault.lastCheckinUnix)}</p>
            </div>

            <div>
              <p className="text-sm text-warm-500 mb-1">Vault Address</p>
              <p className="font-mono text-xs break-all text-warm-600">{vault.vaultPda}</p>
            </div>

            <div>
              <p className="text-sm text-warm-500 mb-1">Status</p>
              <p className="font-semibold text-warm-900">
                {status === 'cancelled' ? 'Cancelled'
                  : status === 'released' ? 'Released'
                  : status === 'unlocked' ? 'Ready to Release'
                  : status === 'grace_period' ? '⚠️ Grace Period'
                  : status === 'checkin_window' ? 'Check-In Window'
                  : 'Active'}
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

        {/* Check-In Action */}
        {!vault.released && !vault.cancelled && canCheckIn && isCreator && (
          <div className={`p-6 rounded-2xl border shadow-sm ${
            isInGracePeriod
              ? 'bg-rose-50 border-rose-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className={`text-lg font-bold mb-1 ${
                  isInGracePeriod ? 'text-rose-900' : 'text-blue-900'
                }`}>
                  {isInGracePeriod ? '⚠️ URGENT: Grace Period Active' : 'Check-In Window Open'}
                </h3>
                <p className={`text-sm ${
                  isInGracePeriod ? 'text-rose-700' : 'text-blue-700'
                }`}>
                  {isInGracePeriod
                    ? `Check in immediately or funds release in ${Math.ceil((gracePeriodEnd - now) / 60)} minutes!`
                    : 'Check in now to reset your deadline and keep your vault locked'
                  }
                </p>
              </div>
              <button
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className={`px-6 py-3 bg-gradient-to-r disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 shadow-sm ${
                  isInGracePeriod
                    ? 'from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800'
                    : 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                }`}
              >
                {isCheckingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking In...
                  </>
                ) : (
                  'Check In Now'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Keeper Bot Status (shown after grace period expires) */}
        {!vault.released && !vault.cancelled && vault.amountLocked > 0 && canRelease && (
          <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-purple-900 mb-1">🤖 Automatic Release In Progress</h3>
                <p className="text-sm text-purple-700 mb-3">
                  The grace period has ended. Our keeper bot automatically releases funds after the grace period expires.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="text-purple-800">
                      <span className="font-semibold">Amount:</span> {formatUSDC(vault.amountLocked)} will be sent to the beneficiary
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="text-purple-800">
                      <span className="font-semibold">Status:</span> Keeper bot scans every 60 seconds for eligible vaults
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="text-purple-800">
                      <span className="font-semibold">Timeline:</span> Funds typically release within 1-2 minutes
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white/50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-600">
                    💡 The release is fully automatic. No action needed from anyone. The vault will close automatically after release, and rent will be returned to the creator.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Vault Action */}
        {!vault.released && !vault.cancelled && isCreator && !isInNotificationWindow && !isInGracePeriod && !canRelease && (
          <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-amber-900 mb-1">Cancel Vault</h3>
                <p className="text-sm text-amber-700">
                  Permanently cancel this vault and retrieve your funds. Tier-based cancellation fees apply.
                </p>
              </div>
              <Link
                href={`/vaults/${vaultPda}/cancel`}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-2 shadow-sm"
              >
                Cancel Vault
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
