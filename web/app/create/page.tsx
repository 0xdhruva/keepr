'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AmountInput } from '../_components/AmountInput';
import { AddressInput } from '../_components/AddressInput';
import { validateVaultForm, VaultFormData, isAdminWallet } from '../_lib/validation';
import { formatDateTime } from '../_lib/format';
import { getNetworkConfig, timeToSeconds, secondsToTime, formatTimeValue } from '../_lib/config';
import { Identicon } from '../_components/Identicon';
import { chunkAddress, getAddressLast4 } from '../_lib/identicon';
import { PublicKey, Transaction } from '@solana/web3.js';
import { saveVaultMeta, addActivityLog, updateLastSeen } from '../_lib/storage';
import { connection, PROGRAM_ID, USDC_MINT } from '../_lib/solana';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createVaultInstruction, depositUsdcInstruction, VaultTier } from '../_lib/instructions';
import { useNotifications } from '../_contexts/NotificationContext';

type Step = 'form' | 'review' | 'processing' | 'success';

export default function CreateVaultPage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const router = useRouter();
  const { addNotification } = useNotifications();

  const [step, setStep] = useState<Step>('form');

  // Get network config
  const config = getNetworkConfig();

  const [formData, setFormData] = useState<VaultFormData>({
    name: '',
    amount: '',
    beneficiary: '',
    checkinPeriodSeconds: 5 * 60, // Default: 5 minutes (devnet), will be updated based on network
    tier: VaultTier.Base,          // Default: Base tier ($1)
    creationFeePaid: 1_000_000,    // $1 USDC (6 decimals)
    notificationWindowSeconds: 0,  // Auto-calculated based on check-in period
    gracePeriodSeconds: 0,         // Auto-calculated based on check-in period
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

  // Preset check-in options with exact notification windows and grace periods
  const checkinPresets = [
    // Devnet only
    { label: '5 minutes', seconds: 5 * 60, notificationWindow: 2 * 60, gracePeriod: 2 * 60, networks: ['devnet'] },
    { label: '1 hour', seconds: 60 * 60, notificationWindow: 10 * 60, gracePeriod: 10 * 60, networks: ['devnet'] },
    // Both networks
    { label: '1 day', seconds: 24 * 60 * 60, notificationWindow: 60 * 60, gracePeriod: 60 * 60, networks: ['devnet', 'mainnet'] },
    // Mainnet only
    { label: '1 week', seconds: 7 * 24 * 60 * 60, notificationWindow: 24 * 60 * 60, gracePeriod: 24 * 60 * 60, networks: ['mainnet'] },
    { label: '1 month', seconds: 30 * 24 * 60 * 60, notificationWindow: 7 * 24 * 60 * 60, gracePeriod: 3 * 24 * 60 * 60, networks: ['mainnet'] },
    { label: '1 quarter (3 months)', seconds: 90 * 24 * 60 * 60, notificationWindow: 7 * 24 * 60 * 60, gracePeriod: 7 * 24 * 60 * 60, networks: ['mainnet'] },
  ];

  // Filter presets based on current network
  const availablePresets = checkinPresets.filter(preset =>
    preset.networks.includes(config.network)
  );

  const calculateDefaults = (checkinPeriodSeconds: number) => {
    if (!checkinPeriodSeconds || checkinPeriodSeconds <= 0) {
      return { notificationWindowSeconds: 0, gracePeriodSeconds: 0 };
    }

    // Find matching preset for this check-in period
    const preset = checkinPresets.find(p => p.seconds === checkinPeriodSeconds);
    const notificationWindowSeconds = preset?.notificationWindow || Math.floor(checkinPeriodSeconds * 0.20);

    // Use preset grace period if available, otherwise fall back to 10% of check-in period (max 7 days)
    const gracePeriodSeconds = preset?.gracePeriod || Math.min(
      7 * 24 * 60 * 60, // Max 7 days
      Math.max(1, Math.floor(checkinPeriodSeconds * 0.10))
    );

    return { notificationWindowSeconds, gracePeriodSeconds };
  };

  const handleInputChange = (field: keyof VaultFormData, value: string | number) => {
    if (typeof value === 'string') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Clear error for this field
    if (errors[field as string]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }
  };

  const handleTierChange = (tier: VaultTier) => {
    // Calculate creation fee based on tier
    const fees = {
      [VaultTier.Base]: 1_000_000,      // $1
      [VaultTier.Plus]: 8_000_000,      // $8
      [VaultTier.Premium]: 20_000_000,  // $20
      [VaultTier.Lifetime]: 100_000_000 // $100 (could be up to $500)
    };

    setFormData(prev => ({
      ...prev,
      tier,
      creationFeePaid: fees[tier]
    }));

    // Clear error
    if (errors.tier) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.tier;
        return newErrors;
      });
    }
  };

  const handleCheckinPeriodChange = (checkinPeriodSeconds: number) => {
    // Auto-calculate notification window and grace period if not in advanced mode
    if (!showAdvanced) {
      const defaults = calculateDefaults(checkinPeriodSeconds);
      setFormData(prev => ({
        ...prev,
        checkinPeriodSeconds,
        notificationWindowSeconds: defaults.notificationWindowSeconds,
        gracePeriodSeconds: defaults.gracePeriodSeconds,
      }));
    } else {
      setFormData(prev => ({ ...prev, checkinPeriodSeconds }));
    }

    // Clear error
    if (errors.checkinPeriod) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.checkinPeriod;
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

      // Get check-in period and tier
      const checkinPeriodSeconds = formData.checkinPeriodSeconds;
      const tier = formData.tier;
      const creationFeePaid = formData.creationFeePaid;

      // Recalculate notification window and grace period if not in advanced mode
      let notificationWindowSeconds: number;
      let gracePeriodSeconds: number;

      if (showAdvanced && formData.notificationWindowSeconds && formData.gracePeriodSeconds) {
        // User customized values - use them as-is
        notificationWindowSeconds = formData.notificationWindowSeconds;
        gracePeriodSeconds = formData.gracePeriodSeconds;
      } else {
        // Auto-calculate based on check-in period
        const defaults = calculateDefaults(checkinPeriodSeconds);
        notificationWindowSeconds = defaults.notificationWindowSeconds;
        gracePeriodSeconds = defaults.gracePeriodSeconds;
      }

      console.log('=== VAULT CREATION DEBUG ===');
      console.log('Check-in period:', checkinPeriodSeconds, 'seconds (', Math.floor(checkinPeriodSeconds / 86400), 'days)');
      console.log('Tier:', VaultTier[tier], '(', tier, ')');
      console.log('Creation fee:', creationFeePaid / 1_000_000, 'USDC');
      console.log('Notification window:', notificationWindowSeconds, 'seconds');
      console.log('Grace period:', gracePeriodSeconds, 'seconds');
      console.log('Validation check: notificationWindow < checkinPeriod?', notificationWindowSeconds, '<', checkinPeriodSeconds, '=', notificationWindowSeconds < checkinPeriodSeconds);
      console.log('🔍 Additional checks:');
      console.log('  - notification_window > 0?', notificationWindowSeconds > 0);
      console.log('  - grace_period > 0?', gracePeriodSeconds > 0);

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
      const vaultTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(USDC_MINT),
        vaultPda,
        true // allowOwnerOffCurve = true for PDA
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
      console.log('Check-in period:', checkinPeriodSeconds, 'seconds');
      console.log('Tier:', VaultTier[tier]);
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
        checkinPeriodSeconds,
        nameHash,
        notificationWindowSeconds,
        gracePeriodSeconds,
        tier,
        creationFeePaid,
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

      // Calculate initial unlock time (created_at + checkin_period_seconds)
      const nowUnix = Math.floor(Date.now() / 1000);
      const initialUnlockUnix = nowUnix + checkinPeriodSeconds;

      // Save to local storage
      saveVaultMeta({
        vaultPda: vaultPda.toBase58(),
        name: formData.name,
        createdAt: Date.now(),
        lastRefreshed: Date.now(),
        unlockUnix: initialUnlockUnix,
        amountLocked: parseFloat(formData.amount) * 1_000_000,
        beneficiary: formData.beneficiary,
        creator: publicKey.toBase58(),
        released: false,
        cancelled: false,
        tier,
        checkinPeriodSeconds,
        notificationWindowSeconds,
        gracePeriodSeconds,
        lastCheckinUnix: 0, // Set to 0 for new vaults (no check-in yet)
      });

      addActivityLog({
        vaultPda: vaultPda.toBase58(),
        type: 'created',
        timestamp: Date.now(),
        signature,
        amount: parseFloat(formData.amount) * 1_000_000,
      });

      // Add success notification
      addNotification({
        type: 'vault_created',
        title: 'Vault Created Successfully',
        message: `${formData.amount} USDC locked in "${formData.name}". Remember to check in regularly!`,
        vaultPda: vaultPda.toBase58(),
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
      checkinPeriodSeconds: 5 * 60,      // Default: 5 minutes
      tier: VaultTier.Base,              // Base tier
      creationFeePaid: 1_000_000,        // $1
      notificationWindowSeconds: 0,      // Auto-calculated
      gracePeriodSeconds: 0,             // Auto-calculated
      creatorAddress: publicKey?.toBase58(),
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
            Create a dead man's switch vault with recurring check-ins
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

              {/* Tier Selector */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-warm-700">
                  Vault Tier
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { tier: VaultTier.Base, name: 'Base', price: '$1', color: 'blue' },
                    { tier: VaultTier.Plus, name: 'Plus', price: '$8', color: 'purple' },
                    { tier: VaultTier.Premium, name: 'Premium', price: '$20', color: 'orange' },
                    { tier: VaultTier.Lifetime, name: 'Lifetime', price: '$100', color: 'emerald' },
                  ].map(({ tier, name, price, color }) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handleTierChange(tier)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        formData.tier === tier
                          ? `border-${color}-500 bg-${color}-50`
                          : 'border-warm-200 hover:border-warm-300'
                      }`}
                    >
                      <div className="font-semibold text-warm-900">{name}</div>
                      <div className="text-sm text-warm-600 mt-1">Creation fee: {price}</div>
                    </button>
                  ))}
                </div>
                {errors.tier && (
                  <p className="text-sm text-rose-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errors.tier}
                  </p>
                )}
                <p className="text-xs text-warm-500">
                  Higher tiers have lower closing fees and additional perks
                </p>
              </div>

              {/* Check-in Period */}
              <div className="space-y-2">
                <label htmlFor="checkinPeriod" className="block text-sm font-medium text-warm-700">
                  Check-In Frequency
                  {config.network === 'devnet' && (
                    <span className="ml-2 px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-semibold rounded">
                      DEVNET
                    </span>
                  )}
                </label>
                <select
                  id="checkinPeriod"
                  value={formData.checkinPeriodSeconds}
                  onChange={(e) => handleCheckinPeriodChange(parseInt(e.target.value))}
                  className={`w-full px-4 py-3 bg-white border rounded-lg text-warm-900 focus:outline-none focus:ring-2 transition-all duration-200 ${
                    errors.checkinPeriod
                      ? 'border-rose-500 focus:ring-rose-500 bg-rose-50'
                      : 'border-warm-200 focus:ring-sage-600 focus:border-sage-600'
                  }`}
                >
                  {availablePresets.map((preset) => {
                    const windowMinutes = preset.notificationWindow >= 60
                      ? preset.notificationWindow >= 3600
                        ? preset.notificationWindow >= 86400
                          ? `${preset.notificationWindow / 86400} day`
                          : `${preset.notificationWindow / 3600} hour`
                        : `${preset.notificationWindow / 60} min`
                      : `${preset.notificationWindow} sec`;

                    return (
                      <option key={preset.seconds} value={preset.seconds}>
                        {preset.label} (check-in window: final {windowMinutes})
                      </option>
                    );
                  })}
                </select>
                {errors.checkinPeriod && (
                  <p className="text-sm text-rose-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {errors.checkinPeriod}
                  </p>
                )}
                <p className="text-xs text-warm-500">
                  How often you need to check in. If you miss a check-in, funds will be released to beneficiary after the grace period.
                </p>
              </div>

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
                    Customize notification window and grace period. Leave blank to use recommended defaults (20% and 10% of check-in period).
                  </p>

                  {/* Notification Window */}
                  <div className="space-y-2">
                    <label htmlFor="notificationWindow" className="block text-sm font-medium text-warm-700">
                      Notification Window (seconds)
                    </label>
                    <input
                      id="notificationWindow"
                      type="number"
                      min="1"
                      value={formData.notificationWindowSeconds || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, notificationWindowSeconds: parseInt(e.target.value) || 0 }))}
                      placeholder={formData.checkinPeriodSeconds ? calculateDefaults(formData.checkinPeriodSeconds).notificationWindowSeconds.toString() : ''}
                      className="w-full px-4 py-3 bg-white border border-warm-200 rounded-lg text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-sage-600 focus:border-sage-600 transition-all duration-200"
                    />
                    <p className="text-xs text-warm-500">
                      Window before unlock when you can check in to reset the timer.
                      {formData.checkinPeriodSeconds > 0 && ` (Recommended: ${formatTimeValue(secondsToTime(calculateDefaults(formData.checkinPeriodSeconds).notificationWindowSeconds))})`}
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
                      placeholder={formData.checkinPeriodSeconds ? calculateDefaults(formData.checkinPeriodSeconds).gracePeriodSeconds.toString() : ''}
                      className="w-full px-4 py-3 bg-white border border-warm-200 rounded-lg text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-sage-600 focus:border-sage-600 transition-all duration-200"
                    />
                    <p className="text-xs text-warm-500">
                      Extra time after missed check-in before funds can be released.
                      {formData.checkinPeriodSeconds > 0 && ` (Recommended: ${formatTimeValue(secondsToTime(calculateDefaults(formData.checkinPeriodSeconds).gracePeriodSeconds))})`}
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
                  <p className="text-sm text-warm-500 mb-1">Vault Tier</p>
                  <p className="text-lg font-semibold text-warm-900">
                    {['Base', 'Plus', 'Premium', 'Lifetime'][formData.tier]} (${formData.creationFeePaid / 1_000_000} creation fee)
                  </p>
                </div>

                <div>
                  <p className="text-sm text-warm-500 mb-1">Check-In Period</p>
                  <p className="text-lg font-semibold text-warm-900">
                    Every {formatTimeValue(secondsToTime(formData.checkinPeriodSeconds))}
                  </p>
                  <p className="text-xs text-warm-500 mt-1">
                    You must check in within this period to keep funds locked. Miss a check-in and funds can be released to beneficiary.
                  </p>
                </div>

                <div>
                  <p className="text-sm text-warm-500 mb-1">First Check-In Deadline</p>
                  <p className="text-lg font-semibold text-warm-900">
                    {formatDateTime(Math.floor(Date.now() / 1000) + formData.checkinPeriodSeconds)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-warm-500 mb-2">Beneficiary</p>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-warm-200">
                    <Identicon address={formData.beneficiary} size={56} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-warm-500 mb-1">Will receive funds if you miss check-in</p>
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
                    <p className="font-semibold mb-1">Important: Dead Man's Switch</p>
                    <p className="text-amber-800">You must check in regularly to keep funds locked. If you miss a check-in, funds will be released to the beneficiary after the grace period. Double-check the beneficiary address and check-in period.</p>
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
                <p className="text-warm-600">Your dead man's switch vault is now active. Remember to check in regularly to keep funds locked.</p>
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
