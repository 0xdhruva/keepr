'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AmountInput } from '../_components/AmountInput';
import { AddressInput } from '../_components/AddressInput';
import { DateTimeInput } from '../_components/DateTimeInput';
import { validateVaultForm, VaultFormData } from '../_lib/validation';
import { formatDateTime } from '../_lib/format';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { saveVaultMeta, addActivityLog, updateLastSeen } from '../_lib/storage';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { connection, PROGRAM_ID, USDC_MINT } from '../_lib/solana';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import idl from '../_lib/keepr_vault.json';

type Step = 'form' | 'review' | 'processing' | 'success';

export default function CreateVaultPage() {
  const { connected, publicKey, wallet, signTransaction, signAllTransactions } = useWallet();
  const router = useRouter();

  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState<VaultFormData>({
    name: '',
    amount: '',
    beneficiary: '',
    unlockTime: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [txSignature, setTxSignature] = useState<string>('');
  const [vaultPda, setVaultPda] = useState<string>('');

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  useEffect(() => {
    if (connected && publicKey) {
      updateLastSeen(publicKey.toBase58());
    }
  }, [connected, publicKey]);

  if (!connected || !publicKey) {
    return null;
  }

  const handleInputChange = (field: keyof VaultFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    setStep('form');
  };

  const handleConfirm = async () => {
    setStep('processing');

    try {
      if (!publicKey || !signTransaction) {
        throw new Error('Wallet not connected');
      }

      // Create wallet interface for Anchor
      const walletInterface = {
        publicKey,
        signTransaction,
        signAllTransactions: signAllTransactions || (async (txs) => {
          const signed = [];
          for (const tx of txs) {
            signed.push(await signTransaction(tx));
          }
          return signed;
        }),
      };

      // Create Anchor provider
      const provider = new AnchorProvider(connection, walletInterface as any, {
        commitment: 'confirmed',
      });

      // Create program instance
      const programId = new PublicKey(PROGRAM_ID);
      const program = new Program(idl as any, provider);

      // Parse unlock time to Unix timestamp
      const unlockUnix = Math.floor(new Date(formData.unlockTime).getTime() / 1000);
      
      // Parse amount to lamports (USDC has 6 decimals)
      const amountLamports = new BN(parseFloat(formData.amount) * 1_000_000);

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

      // Fetch counter to get next vault ID (or assume 0 if doesn't exist)
      let nextVaultId = 1;
      try {
        const counterAccount = await connection.getAccountInfo(counterPda);
        if (counterAccount) {
          // Counter exists, read last_id (u64 at offset 8)
          const data = counterAccount.data;
          const lastId = Number(new DataView(data.buffer, data.byteOffset + 8, 8).getBigUint64(0, true));
          nextVaultId = lastId + 1;
        }
      } catch (e) {
        // Counter doesn't exist yet, will be created with ID 0, so next is 1
        nextVaultId = 1;
      }

      // Derive vault PDA using counter
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('vault'),
          publicKey.toBuffer(),
          Buffer.from(new Uint8Array(new BigUint64Array([BigInt(nextVaultId)]).buffer).slice(0, 8)),
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

      // Get creator's token account
      const creatorTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(USDC_MINT),
        publicKey
      );

      // Transaction 1: Create vault
      const createTx = await program.methods
        .createVault(new PublicKey(formData.beneficiary), new BN(unlockUnix), nameHash)
        .accounts({
          config: configPda,
          counter: counterPda,
          vault: vaultPda,
          vaultTokenAccount,
          usdcMint: new PublicKey(USDC_MINT),
          creator: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Vault created:', createTx);

      // Wait for confirmation and fetch the vault to get its actual ID
      await connection.confirmTransaction(createTx, 'confirmed');
      
      // Fetch the vault account to get the vault_id
      const vaultAccount = await (program.account as any).vault.fetch(vaultPda);
      const actualVaultId = vaultAccount.vaultId;
      
      console.log('Vault ID:', actualVaultId.toString());

      // Transaction 2: Deposit tokens (vault PDA is already correct since we derived it with nextVaultId)
      const depositTx = await program.methods
        .depositUsdc(amountLamports)
        .accounts({
          config: configPda,
          vault: vaultPda,
          counter: counterPda,
          vaultTokenAccount,
          usdcMint: new PublicKey(USDC_MINT),
          creatorUsdcAta: creatorTokenAccount,
          creator: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log('Tokens deposited:', depositTx);

      setVaultPda(vaultPda.toBase58());
      setTxSignature(depositTx);

      // Save to local storage
      saveVaultMeta({
        vaultPda: vaultPda.toBase58(),
        name: formData.name,
        createdAt: Date.now(),
        lastRefreshed: Date.now(),
      });

      addActivityLog({
        vaultPda: vaultPda.toBase58(),
        type: 'created',
        timestamp: Date.now(),
        signature: createTx,
      });

      addActivityLog({
        vaultPda: vaultPda.toBase58(),
        type: 'deposited',
        timestamp: Date.now(),
        signature: depositTx,
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
    });
    setErrors({});
    setTxSignature('');
    setVaultPda('');
    setStep('form');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-warm-900">Create Vault</h1>
          <p className="text-warm-600">
            Lock USDC for your beneficiary with a time-locked release
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
                  <p className="text-sm text-warm-500 mb-1">Beneficiary</p>
                  <p className="text-sm font-mono bg-white px-3 py-2 rounded border border-warm-200 break-all text-warm-800">
                    {formData.beneficiary}
                  </p>
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
                className="flex-1 px-6 py-4 bg-sage-600 hover:bg-sage-700 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
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
