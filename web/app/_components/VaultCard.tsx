'use client';

import Link from 'next/link';
import { formatUSDC, formatAddress } from '../_lib/format';
import { CountdownCompact } from './Countdown';

interface VaultCardProps {
  vaultPda: string;
  name: string;
  amountLocked: number;
  unlockUnix: number;
  beneficiary: string;
  creator: string;
  released: boolean;
  cancelled?: boolean;
  isCreator: boolean;
}

export function VaultCard({
  vaultPda,
  name,
  amountLocked,
  unlockUnix,
  beneficiary,
  creator,
  released,
  cancelled,
  isCreator,
}: VaultCardProps) {
  const now = Math.floor(Date.now() / 1000);
  const isUnlocked = now >= unlockUnix;

  const status = cancelled ? 'cancelled' : released ? 'released' : isUnlocked ? 'unlocked' : 'locked';

  // Pastel backgrounds based on status
  const bgColors = {
    locked: 'from-lavender-100 to-lavender-200 border-lavender-300/50',
    unlocked: 'from-mint-100 to-mint-200 border-mint-300/50',
    released: 'from-rose-100 to-rose-200 border-rose-300/50',
    cancelled: 'from-warm-100 to-warm-200 border-warm-300/50',
  };

  return (
    <Link href={`/vaults/${vaultPda}`}>
      <div className={`bg-gradient-to-br ${bgColors[status]} rounded-2xl p-5 border transition-all hover:scale-[1.02] cursor-pointer`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-xs text-gray-600 mb-1">{name}</p>
            <h3 className="text-3xl font-bold text-gray-900">{formatUSDC(amountLocked)}</h3>
          </div>
          <div className="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center">
            {status === 'locked' && (
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
            {status === 'unlocked' && (
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            )}
            {status === 'released' && (
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'cancelled' && (
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        </div>

        {/* Beneficiary */}
        <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-white/40 rounded-lg w-fit">
          <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs text-gray-700 font-medium">Nominee: {formatAddress(beneficiary, 4)}</span>
        </div>

        {/* Countdown */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <CountdownCompact unlockUnix={unlockUnix} />
          </div>
        </div>

        {/* Action Button */}
        {status === 'cancelled' && (
          <div className="text-center py-2 text-xs text-warm-600 font-medium">
            Cancelled
          </div>
        )}
        {status === 'released' && (
          <div className="text-center py-2 text-xs text-gray-600 font-medium">
            Released
          </div>
        )}
        {(status === 'locked' || status === 'unlocked') && !cancelled && (
          <button className="w-full px-4 py-2.5 bg-sage-600 hover:bg-sage-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">
            {isUnlocked && !isCreator ? 'Release Funds' : 'View Details'}
          </button>
        )}
      </div>
    </Link>
  );
}
