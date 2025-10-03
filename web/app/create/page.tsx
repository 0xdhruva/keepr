'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AmountInput } from '../_components/AmountInput';
import { AddressInput } from '../_components/AddressInput';
import { DateTimeInput } from '../_components/DateTimeInput';
import { validateVaultForm, VaultFormData, isAdminWallet } from '../_lib/validation';
import { formatDateTime } from '../_lib/format';
import { Identicon } from '../_components/Identicon';
import { chunkAddress, getAddressLast4 } from '../_lib/identicon';
import { PublicKey, Transaction } from '@solana/web3.js';
import { saveVaultMeta, addActivityLog, updateLastSeen } from '../_lib/storage';
import { connection, PROGRAM_ID, USDC_MINT } from '../_lib/solana';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createVaultInstruction, depositUsdcInstruction } from '../_lib/instructions';

type Step = 'form' | 'review' | 'processing' | 'success';

export default function CreateVaultPage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const router = useRouter();

  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState<VaultFormData>({
    name: '',
    amount: '',
    beneficiary: '',
    unlockTime: '',
    notificationWindowSeconds: 0, // Auto-calculated based on unlock time
    gracePeriodSeconds: 0,         // Auto-calculated based on unlock time
    creatorAddress: publicKey?.toBase58(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [txSignature, setTxSignature] = useState<string>('');
  const [vaultPda, setVaultPda] = useState<string>('');
  const [beneficiaryConfirm, setBeneficiaryConfirm] = useState<string>('');
  const [confirmError, setConfirmError] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Check if user is admin tester
  const isAdmin = publicKey ? isAdminWallet(publicKey.toBase58()) : false;

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  useEffect(() => {
    if (connected && publicKey) {
      updateLastSeen(publicKey.toBase58());
      // Update creatorAddress in formData
      setFormData(prev => ({ ...prev, creatorAddress: publicKey.toBase58() }));
    }
  }, [connected, publicKey]);

  if (!connected || !publicKey) {
    return null;
  }

  const calculateDefaults = (unlockTime: string) => {
    if (!unlockTime) return { notificationWindowSeconds: 0, gracePeriodSeconds: 0 };

    const unlockUnix = Math.floor(new Date(unlockTime).getTime() / 1000);
    const nowUnix = Math.floor(Date.now() / 1000);
    const vaultPeriodSeconds = unlockUnix - nowUnix;

    if (vaultPeriodSeconds <= 0) return { notificationWindowSeconds: 0, gracePeriodSeconds: 0 };

    // CRITICAL: On-chain validation uses clock.unix_timestamp (at execution time),
    // not client's calculation time. Combined with STRICT inequality (<, not <=),
    // we must ensure notification_window < on_chain_vault_period even after worst-case delays.
    //
    // Worst-case delay breakdown:
    // - Wallet approval time: 5-30 seconds
    // - Transaction propagation on devnet: 5-30 seconds
    // - On-chain execution delay: 1-10 seconds
    // - Clock skew between client and blockchain: 0-30 seconds
    // - Strict inequality buffer (must be strictly less, not equal): 10 seconds
    // Total: conservatively use 130-second buffer for short test vaults
    const maxDelaySeconds = 120; // Worst-case transaction delay
    const strictInequalityBuffer = 10; // Extra buffer to ensure strict < passes
    const totalSafetyBuffer = maxDelaySeconds + strictInequalityBuffer;

    const safeVaultPeriod = Math.max(0, vaultPeriodSeconds - totalSafetyBuffer);

    // Use 20% to be even more conservative (was 25%)
    const notificationWindowSeconds = Math.min(
      7 * 24 * 60 * 60,
      Math.max(1, Math.floor(safeVaultPeriod * 0.20))
    );

    const gracePeriodSeconds = Math.min(
      7 * 24 * 60 * 60,
      Math.max(1, Math.floor(safeVaultPeriod * 0.10))
    );

    return { notificationWindowSeconds, gracePeriodSeconds };
  };

  const handleInputChange = (field: keyof VaultFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-calculate notification window and grace period when unlock time changes
    if (field === 'unlockTime' && !showAdvanced) {
      const defaults = calculateDefaults(value);
      setFormData(prev => ({
        ...prev,
        unlockTime: value,
        notificationWindowSeconds: defaults.notificationWindowSeconds,
        gracePeriodSeconds: defaults.gracePeriodSeconds,
      }));
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleContinueToReview = () => {
    const validationErrors = validateVaultForm(formData);

    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }

    setStep('review');
  };

  const handleBack = () => {
    setBeneficiaryConfirm('');
    setConfirmError('');
    setStep('form');
  };

  const handleConfirm = async () => {
    // Validate beneficiary confirmation
    const last4 = formData.beneficiary.slice(-4).toUpperCase();
    if (beneficiaryConfirm.toUpperCase() !== last4) {
      setConfirmError('Confirmation does not match. Please type the last 4 characters.');
      return;
    }

    setStep('processing');

    try {
      if (!publicKey || !sendTransaction) {
        throw new Error('Wallet not connected');
      }

      // Use explicit program ID (no Anchor Program inference)
      const programId = new PublicKey(PROGRAM_ID);

      // Parse unlock time to Unix timestamp
      const unlockUnix = Math.floor(new Date(formData.unlockTime).getTime() / 1000);
      const nowUnix = Math.floor(Date.now() / 1000);
      const actualVaultPeriod = unlockUnix - nowUnix;

      // CRITICAL: Recalculate notification window and grace period RIGHT NOW
      // Don't use formData values as they may have been calculated minutes ago during form submission
      // This ensures the values are based on the CURRENT time, not stale values
      let notificationWindowSeconds: number;
      let gracePeriodSeconds: number;

      if (showAdvanced && formData.notificationWindowSeconds && formData.gracePeriodSeconds) {
        // User customized values - use them as-is
        notificationWindowSeconds = formData.notificationWindowSeconds;
        gracePeriodSeconds = formData.gracePeriodSeconds;
      } else {
        // Auto-calculate based on CURRENT vault period
        const defaults = calculateDefaults(formData.unlockTime);
        notificationWindowSeconds = defaults.notificationWindowSeconds;
        gracePeriodSeconds = defaults.gracePeriodSeconds;
      }

      console.log('=== VAULT CREATION DEBUG ===');
      console.log('Unlock Unix:', unlockUnix);
      console.log('Now Unix:', nowUnix);
      console.log('Actual vault period:', actualVaultPeriod, 'seconds');
      console.log('Notification window:', notificationWindowSeconds, 'seconds');
      console.log('Grace period:', gracePeriodSeconds, 'seconds');
      console.log('Validation check: notificationWindow < vaultPeriod?', notificationWindowSeconds, '<', actualVaultPeriod, '=', notificationWindowSeconds < actualVaultPeriod);
      console.log('🔍 Additional checks:');
      console.log('  - notification_window > 0?', notificationWindowSeconds > 0);
      console.log('  - grace_period > 0?', gracePeriodSeconds > 0);
      console.log('  - notification_window + grace_period =', notificationWindowSeconds + gracePeriodSeconds, 'seconds');
      console.log('  - Combined vs vault period:', (notificationWindowSeconds + gracePeriodSeconds), '<', actualVaultPeriod, '?', (notificationWindowSeconds + gracePeriodSeconds) < actualVaultPeriod);

      // Parse amount to lamports (USDC has 6 decimals)
      const amountLamports = Math.floor(parseFloat(formData.amount) * 1_000_000);

      // Hash the vault name (SHA256)
      const encoder = new TextEncoder();
      const nameBytes = encoder.encode(formData.name);
      const nameHashBuffer = await crypto.subtle.digest('SHA-256', nameBytes);
      const nameHash = Array.from(new Uint8Array(nameHashBuffer));

      // Derive config PDA
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        programId
      );

      // Derive counter PDA
      const [counterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_counter'), publicKey.toBuffer()],
        programId
      );

      // Fetch counter to get next vault ID
      // IMPORTANT: Program uses (counter.last_id + 1) in seeds, so we must match that
      let nextVaultId = 1; // Default for first vault (counter doesn't exist yet)
      try {
        const counterAccount = await connection.getAccountInfo(counterPda);
        if (counterAccount) {
          // Counter exists, read last_id (u64 at offset 8)
          const data = counterAccount.data;
          const lastId = Number(new DataView(data.buffer, data.byteOffset + 8, 8).getBigUint64(0, true));
          nextVaultId = lastId + 1; // Program uses last_id + 1 in seeds
        }
      } catch (e) {
        // Counter doesn't exist yet, will be created with last_id=0, program uses 0+1=1
        nextVaultId = 1;
      }

      // Derive vault PDA using counter
      // IMPORTANT: vault_id is u64 (8 bytes) in seeds constraint
      const vaultIdBuffer = new Uint8Array(8);
      const vaultIdView = new DataView(vaultIdBuffer.buffer);
      vaultIdView.setBigUint64(0, BigInt(nextVaultId), true); // true = little-endian

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('vault'),
          publicKey.toBuffer(),
          vaultIdBuffer,
        ],
        programId
      );

      // Derive vault token account
      const [vaultTokenAccount] = PublicKey.findProgramAddressSync(
        [
          vaultPda.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          new PublicKey(USDC_MINT).toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Get creator's USDC token account
      const creatorUsdcAta = await getAssociatedTokenAddress(
        new PublicKey(USDC_MINT),
        publicKey
      );

      console.log('Building create vault instruction...');
      console.log('Program ID:', programId.toString());
      console.log('Vault PDA:', vaultPda.toString());
      console.log('Beneficiary:', formData.beneficiary);
      console.log('Unlock Unix:', unlockUnix);
      console.log('Amount lamports:', amountLamports);

      // Build createVault instruction using manual instruction builder
      const createIx = await createVaultInstruction({
        config: configPda,
        counter: counterPda,
        vault: vaultPda,
        vaultTokenAccount,
        usdcMint: new PublicKey(USDC_MINT),
        creator: publicKey,
        beneficiary: new PublicKey(formData.beneficiary),
        unlockUnix,
        nameHash,
        notificationWindowSeconds,
        gracePeriodSeconds,
        programId,
      });

      console.log('Building deposit USDC instruction...');

      // Build depositUsdc instruction using manual instruction builder
      const depositIx = await depositUsdcInstruction({
        config: configPda,
        vault: vaultPda,
        counter: counterPda,
        vaultTokenAccount,
        usdcMint: new PublicKey(USDC_MINT),
        creatorUsdcAta,
        creator: publicKey,
        amount: amountLamports,
        programId,
      });

      console.log('Combining instructions into single transaction...');

      // Combine into single atomic transaction
      // Both instructions use the same explicit programId - no inference confusion
      const transaction = new Transaction().add(createIx).add(depositIx);

      // Set transaction metadata (required by wallet)
      console.log('Setting transaction metadata...');
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Simulate first to get better error messages
      console.log('Simulating transaction...');
      const simulation = await connection.simulateTransaction(transaction);
      console.log('Simulation result:', simulation);

      if (simulation.value.err) {
        console.error('Simulation failed:', simulation.value.err);
        console.error('Simulation logs:', simulation.value.logs);
        throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}\nLogs: ${simulation.value.logs?.join('\n')}`);
      }

      console.log('Sending transaction...');
      const signature = await sendTransaction(transaction, connection);
      console.log('Transaction sent:', signature);

      // Wait for confirmation
      console.log('Waiting for confirmation...');
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('Transaction confirmed!');

      setVaultPda(vaultPda.toBase58());
      setTxSignature(signature);

      // Save to local storage
      saveVaultMeta({
        vaultPda: vaultPda.toBase58(),
        name: formData.name,
        createdAt: Date.now(),
        lastRefreshed: Date.now(),
        unlockUnix: unlockUnix,
        amountLocked: parseFloat(formData.amount) * 1_000_000,
        beneficiary: formData.beneficiary,
        creator: publicKey.toBase58(),
        released: false,
      });

      addActivityLog({
        vaultPda: vaultPda.toBase58(),
        type: 'created',
        timestamp: Date.now(),
        signature,
        amount: parseFloat(formData.amount) * 1_000_000,
      });

      setStep('success');
    } catch (error) {
      console.error('Transaction failed:', error);
      alert(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setStep('review');
    }
  };

  const handleViewVault = () => {
    router.push(`/vaults/${vaultPda}`);
  };

  const handleCreateAnother = () => {
    setFormData({
      name: '',
      amount: '',
      beneficiary: '',
      unlockTime: '',
      notificationWindowSeconds: 7 * 24 * 60 * 60, // 7 days
      gracePeriodSeconds: 7 * 24 * 60 * 60,         // 7 days
    });
    setErrors({});
    setTxSignature('');
    setVaultPda('');
    setBeneficiaryConfirm('');
    setConfirmError('');
    setStep('form');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-warm-900">Create Vault</h1>
            {isAdmin && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
                ADMIN TESTER
              </span>
            )}
          </div>
          <p className="text-warm-600">
            Lock USDC for your beneficiary with a time-locked release
            {isAdmin && ' • Testing mode: 2min minimum, self-beneficiary allowed'}
          </p>
        </div>

        {/* Form Step */}
        {step === 'form' && (
          <div className="space-y-6 animate-[slideUp_400ms_ease-out]">
            <div className="p-6 bg-warm-100 rounded-xl border border-warm-200 space-y-6">
              {/* Vault Name */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-warm-700">
                  Vault Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Travel Safe Vault"
                  maxLength={50}
                  className={`w-full px-4 py-3 bg-white border rounded-lg text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                    errors.name
                      ? 'border-rose-500 focus:ring-rose-500 bg-rose-50'
                      : 'border-warm-200 focus:ring-sage-600 focus:border-sage-600'
                  }`}
                />
                {errors.name && (
                  <p className="text-sm text-rose-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errors.name}
                  </p>
                )}
                <p className="text-xs text-warm-500">
                  A friendly name to identify this vault
                </p>
              </div>

              {/* Amount */}
              <AmountInput
                value={formData.amount}
                onChange={(val) => handleInputChange('amount', val)}
                error={errors.amount}
              />

              {/* Unlock Time */}
              <DateTimeInput
                value={formData.unlockTime}
                onChange={(val) => handleInputChange('unlockTime', val)}
                error={errors.unlockTime}
              />

              {/* Beneficiary */}
              <AddressInput
                value={formData.beneficiary}
                onChange={(val) => handleInputChange('beneficiary', val)}
                error={errors.beneficiary}
              />
            </div>

            {/* Advanced Settings */}
            <div className="border border-warm-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-6 py-4 bg-warm-50 hover:bg-warm-100 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium text-warm-700">Advanced Settings (Optional)</span>
                </div>
                <svg
                  className={`w-5 h-5 text-warm-600 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdvanced && (
                <div className="p-6 bg-white space-y-6 border-t border-warm-200">
                  <p className="text-sm text-warm-600 -mt-2">
                    Configure check-in periods. Leave blank to use recommended defaults based on vault duration.
                  </p>

                  {/* Notification Window */}
                  <div className="space-y-2">
                    <label htmlFor="notificationWindow" className="block text-sm font-medium text-warm-700">
                      Check-In Period (seconds)
                    </label>
                    <input
                      id="notificationWindow"
                      type="number"
                      min="1"
                      value={formData.notificationWindowSeconds || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, notificationWindowSeconds: parseInt(e.target.value) || 0 }))}
                      placeholder={formData.unlockTime ? calculateDefaults(formData.unlockTime).notificationWindowSeconds.toString() : ''}
                      className="w-full px-4 py-3 bg-white border border-warm-200 rounded-lg text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-sage-600 focus:border-sage-600 transition-all duration-200"
                    />
                    <p className="text-xs text-warm-500">
                      How often you need to check in. If you don't check in for this duration, the vault can be released early.
                      {formData.unlockTime && ` (Recommended: ${Math.floor(calculateDefaults(formData.unlockTime).notificationWindowSeconds / 60)} minutes)`}
                    </p>
                  </div>

                  {/* Grace Period */}
                  <div className="space-y-2">
                    <label htmlFor="gracePeriod" className="block text-sm font-medium text-warm-700">
                      Grace Period (seconds)
                    </label>
                    <input
                      id="gracePeriod"
                      type="number"
                      min="1"
                      value={formData.gracePeriodSeconds || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, gracePeriodSeconds: parseInt(e.target.value) || 0 }))}
                      placeholder={formData.unlockTime ? calculateDefaults(formData.unlockTime).gracePeriodSeconds.toString() : ''}
                      className="w-full px-4 py-3 bg-white border border-warm-200 rounded-lg text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-sage-600 focus:border-sage-600 transition-all duration-200"
                    />
                    <p className="text-xs text-warm-500">
                      Extra time given after a missed check-in before the vault can be released.
                      {formData.unlockTime && ` (Recommended: ${Math.floor(calculateDefaults(formData.unlockTime).gracePeriodSeconds / 60)} minutes)`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinueToReview}
              className="w-full px-6 py-4 bg-sage-600 hover:bg-sage-700 text-white rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
            >
              Continue to Review
            </button>
          </div>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <div className="space-y-6 animate-[slideUp_400ms_ease-out]">
            <div className="p-6 bg-warm-100 rounded-xl border border-warm-200 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-warm-200">
                <div className="w-12 h-12 bg-sage-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-warm-900">Review Vault Details</h2>
                  <p className="text-sm text-warm-600">Please verify all information before confirming</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-warm-500 mb-1">Vault Name</p>
                  <p className="text-lg font-semibold text-warm-900">{formData.name}</p>
                </div>

                <div>
                  <p className="text-sm text-warm-500 mb-1">Amount to Lock</p>
                  <p className="text-2xl font-bold text-sage-600">{formData.amount} USDC</p>
                </div>

                <div>
                  <p className="text-sm text-warm-500 mb-1">Unlock Date & Time</p>
                  <p className="text-lg font-semibold text-warm-900">
                    {formatDateTime(Math.floor(new Date(formData.unlockTime).getTime() / 1000))}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-warm-500 mb-2">Beneficiary</p>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-warm-200">
                    <Identicon address={formData.beneficiary} size={56} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-warm-500 mb-1">Will receive funds after unlock</p>
                      <p className="text-sm font-mono text-warm-900 break-all leading-relaxed">
                        {chunkAddress(formData.beneficiary)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Beneficiary Confirmation */}
                <div className="pt-2">
                  <label htmlFor="beneficiary-confirm" className="block text-sm font-medium text-warm-700 mb-2">
                    Confirm Beneficiary Address
                    <span className="ml-2 text-xs text-warm-500 font-normal">
                      (safety check)
                    </span>
                  </label>
                  <p className="text-sm text-warm-600 mb-3">
                    Type the last 4 characters: <span className="font-mono font-bold text-sage-600">{getAddressLast4(formData.beneficiary)}</span>
                  </p>
                  <input
                    id="beneficiary-confirm"
                    type="text"
                    value={beneficiaryConfirm}
                    onChange={(e) => {
                      setBeneficiaryConfirm(e.target.value);
                      setConfirmError('');
                    }}
                    placeholder="Last 4 characters"
                    maxLength={4}
                    className={`w-full px-4 py-3 bg-white border rounded-lg text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 transition-all duration-200 font-mono text-base tracking-wider uppercase ${
                      confirmError
                        ? 'border-rose-500 focus:ring-rose-500 bg-rose-50'
                        : beneficiaryConfirm.length === 4 && beneficiaryConfirm.toUpperCase() === getAddressLast4(formData.beneficiary)
                        ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50/30'
                        : 'border-warm-200 focus:ring-sage-600 focus:border-sage-600'
                    }`}
                  />
                  {confirmError && (
                    <p className="text-sm text-rose-600 flex items-center gap-1.5 mt-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {confirmError}
                    </p>
                  )}
                </div>
              </div>

              {/* Warning */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold mb-1">Important</p>
                    <p className="text-amber-800">Once locked, funds cannot be accessed until the unlock time. Double-check the beneficiary address and unlock time.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="flex-1 px-6 py-4 bg-warm-100 hover:bg-warm-200 text-warm-800 rounded-lg font-semibold transition-all duration-200 border border-warm-200"
              >
                Back to Edit
              </button>
              <button
                onClick={handleConfirm}
                disabled={beneficiaryConfirm.length !== 4 || beneficiaryConfirm.toUpperCase() !== getAddressLast4(formData.beneficiary)}
                className={`flex-1 px-6 py-4 rounded-lg font-semibold transition-all duration-200 transform shadow-sm ${
                  beneficiaryConfirm.length === 4 && beneficiaryConfirm.toUpperCase() === getAddressLast4(formData.beneficiary)
                    ? 'bg-sage-600 hover:bg-sage-700 text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-md'
                    : 'bg-warm-200 text-warm-400 cursor-not-allowed'
                }`}
              >
                Confirm & Lock
              </button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div className="p-12 bg-warm-100 rounded-xl border border-warm-200 text-center space-y-6 animate-[fadeIn_300ms_ease-out]">
            <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <svg className="w-8 h-8 text-sage-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2 text-warm-900">Creating Vault...</h2>
              <p className="text-warm-600">Please confirm the transaction in your wallet</p>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="space-y-6 animate-[scaleIn_600ms_ease-out]">
            <div className="p-8 bg-warm-100 rounded-xl border border-warm-200 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto animate-[scaleIn_600ms_cubic-bezier(0.34,1.56,0.64,1)]">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2 text-warm-900">Vault Created Successfully!</h2>
                <p className="text-warm-600">Your funds are now locked and will be released to the beneficiary after the unlock time.</p>
              </div>

              {/* Details */}
              <div className="p-4 bg-white rounded-lg border border-warm-200 space-y-3 text-left">
                <div>
                  <p className="text-xs text-warm-500 mb-1">Vault Name</p>
                  <p className="font-semibold text-warm-900">{formData.name}</p>
                </div>
                <div>
                  <p className="text-xs text-warm-500 mb-1">Amount Locked</p>
                  <p className="font-semibold text-sage-600">{formData.amount} USDC</p>
                </div>
                <div>
                  <p className="text-xs text-warm-500 mb-1">Transaction</p>
                  <p className="text-xs font-mono text-warm-600 break-all">{txSignature}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleCreateAnother}
                className="flex-1 px-6 py-4 bg-warm-100 hover:bg-warm-200 text-warm-800 rounded-lg font-semibold transition-all duration-200 border border-warm-200"
              >
                Create Another
              </button>
              <button
                onClick={handleViewVault}
                className="flex-1 px-6 py-4 bg-sage-600 hover:bg-sage-700 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                View Vault
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
