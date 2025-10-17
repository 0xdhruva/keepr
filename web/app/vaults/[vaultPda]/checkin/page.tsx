'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatDateTime } from '../../../_lib/format';
import { getVaultMeta } from '../../../_lib/storage';
import { connection, PROGRAM_ID } from '../../../_lib/solana';
import { PublicKey, Transaction } from '@solana/web3.js';
import { checkInInstruction } from '../../../_lib/instructions';
import { useNotifications } from '../../../_contexts/NotificationContext';
import Link from 'next/link';

type Step = 'confirm' | 'processing' | 'success' | 'error';

export default function CheckInPage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const router = useRouter();
  const params = useParams();
  const vaultPda = params.vaultPda as string;
  const { addNotification } = useNotifications();

  const [step, setStep] = useState<Step>('confirm');
  const [vaultName, setVaultName] = useState<string>('Vault');
  const [unlockUnix, setUnlockUnix] = useState<number>(0);
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

  const loadVault = async () => {
    try {
      const meta = getVaultMeta(vaultPda);
      setVaultName(meta?.name || 'Vault');

      const vaultPubkey = new PublicKey(vaultPda);
      const accountInfo = await connection.getAccountInfo(vaultPubkey);

      if (!accountInfo) {
        console.error('Vault not found');
        router.push('/vaults');
        return;
      }

      // Decode unlock_unix (at offset 8 + 32*4 + 8 = 144 bytes)
      const offset = 8 + 32 + 32 + 32 + 32 + 8; // discriminator + 4 pubkeys + amount_locked
      const unlockTime = Number(accountInfo.data.readBigInt64LE(offset));
      setUnlockUnix(unlockTime);
    } catch (error) {
      console.error('Failed to load vault:', error);
      setErrorMessage('Failed to load vault');
      setStep('error');
    }
  };

  const handleCheckIn = async () => {
    if (!publicKey || !connected) return;

    setStep('processing');
    setErrorMessage('');

    try {
      // Derive counter PDA
      const [counterPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault_counter'), publicKey.toBuffer()],
        new PublicKey(PROGRAM_ID)
      );

      // Build check-in instruction
      const checkInIx = await checkInInstruction({
        vault: new PublicKey(vaultPda),
        counter: counterPda,
        creator: publicKey,
        programId: new PublicKey(PROGRAM_ID),
      });

      const transaction = new Transaction().add(checkInIx);
      const signature = await sendTransaction(transaction, connection);
      console.log('Check-in transaction:', signature);

      await connection.confirmTransaction(signature, 'confirmed');
      setTxSignature(signature);

      // Add success notification
      addNotification({
        type: 'checkin_success',
        title: 'Check-in Successful',
        message: `Successfully checked in for vault "${vaultName}". Next deadline extended.`,
        vaultPda,
      });

      setStep('success');
    } catch (error: any) {
      console.error('Check-in failed:', error);
      setErrorMessage(error?.message || 'Check-in failed');
      setStep('error');
    }
  };

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warm-50 to-sage-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin w-16 h-16 border-4 border-sage-200 border-t-sage-600 rounded-full mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-warm-900 mb-2">Checking In...</h1>
          <p className="text-warm-600">Resetting your vault unlock time</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warm-50 to-sage-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-warm-900 mb-2">Check-In Successful!</h1>
          <p className="text-warm-600 mb-6">Your vault deadline has been reset</p>

          {txSignature && (
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-sage-600 hover:underline mb-6 block"
            >
              View transaction
            </a>
          )}

          <Link
            href="/vaults"
            className="block w-full px-6 py-3 bg-sage-600 text-white rounded-lg font-semibold hover:bg-sage-700"
          >
            Back to Vaults
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-warm-50 to-sage-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-warm-900 mb-2">Check-In Failed</h1>
          <p className="text-warm-600 mb-6">{errorMessage}</p>

          <div className="flex gap-3">
            <Link
              href="/vaults"
              className="flex-1 px-6 py-3 bg-warm-200 text-warm-700 rounded-lg font-semibold hover:bg-warm-300"
            >
              Back to Vaults
            </Link>
            <button
              onClick={() => setStep('confirm')}
              className="flex-1 px-6 py-3 bg-sage-600 text-white rounded-lg font-semibold hover:bg-sage-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-50 to-sage-50 p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-warm-900 mb-2 text-center">Check In</h1>
        <p className="text-warm-600 mb-8 text-center">Reset your vault's unlock time</p>

        <div className="space-y-4 mb-8">
          <div>
            <p className="text-sm text-warm-500 mb-1">Vault Name</p>
            <p className="text-lg font-semibold text-warm-900">{vaultName}</p>
          </div>

          {unlockUnix > 0 && (
            <div>
              <p className="text-sm text-warm-500 mb-1">Current Unlock Time</p>
              <p className="text-lg font-semibold text-warm-900">{formatDateTime(unlockUnix)}</p>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-amber-800">
            Checking in will reset your vault's unlock time. You must be the vault creator to check in.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/vaults"
            className="flex-1 px-6 py-3 bg-warm-200 text-warm-700 rounded-lg font-semibold hover:bg-warm-300 text-center"
          >
            Cancel
          </Link>
          <button
            onClick={handleCheckIn}
            className="flex-1 px-6 py-3 bg-sage-600 text-white rounded-lg font-semibold hover:bg-sage-700"
          >
            Check In
          </button>
        </div>
      </div>
    </div>
  );
}
