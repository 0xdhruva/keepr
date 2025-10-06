'use client';

import { useRouter } from 'next/navigation';
import { formatUSDC, formatAddress } from '../_lib/format';
import { CountdownCompact } from './Countdown';

interface HeroVaultCardProps {
  vaultPda: string;
  name: string;
  amountLocked: number;
  unlockUnix: number;
  beneficiary: string;
  released: boolean;
  cancelled?: boolean;
  isFocused?: boolean;
}

export function HeroVaultCard({
  vaultPda,
  amountLocked,
  unlockUnix,
  beneficiary,
  released,
  cancelled,
  isFocused = true,
}: HeroVaultCardProps) {
  const router = useRouter();
  const now = Math.floor(Date.now() / 1000);
  const isUnlocked = now >= unlockUnix;

  const status = cancelled ? 'cancelled' : released ? 'released' : isUnlocked ? 'unlocked' : 'locked';

  const handleClick = () => {
    router.push(`/vaults/${vaultPda}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative flex-shrink-0 w-[255px] sm:w-[290px] cursor-pointer transition-all duration-300 overflow-hidden ${
        isFocused ? 'scale-100 opacity-100' : 'scale-90 opacity-40'
      }`}
    >
      {/* Main Vault Door */}
      <div className="relative bg-black rounded-[2rem] p-6 shadow-2xl border-4 border-dark-300/80 overflow-hidden">
        {/* Status Badge - Top Left */}
        <div className="absolute top-5 left-5">
          <span className="inline-block px-3 py-1 bg-purple-pink-500/30 text-purple-pink-300 text-xs font-bold uppercase tracking-wider rounded">
            {status}
          </span>
        </div>

        {/* Gear Icon - Top Right (Vault Lock Visual) */}
        <div className="absolute top-5 right-5 w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        {/* Amount - Center Focus */}
        <div className="mt-16 mb-5">
          <div className="text-5xl font-bold text-white mb-1 leading-none">
            {formatUSDC(amountLocked).replace(' USDC', '')}
          </div>
          <div className="text-xl text-white font-semibold">USDC</div>
        </div>

        {/* Unlock Time */}
        <div className="mb-3">
          <div className="text-sm text-gray-300">
            <CountdownCompact unlockUnix={unlockUnix} />
          </div>
        </div>

        {/* Beneficiary */}
        <div>
          <div className="text-xs text-gray-400 mb-1">Beneficiary</div>
          <div className="text-base text-white font-medium font-mono">
            {formatAddress(beneficiary, 4)}
          </div>
        </div>
      </div>

      {/* Layered Vault Door Effect (background layers for 3D depth) */}
      {isFocused && (
        <>
          <div className="absolute inset-0 bg-gray-700 rounded-[2rem] -z-10 transform translate-y-2.5 translate-x-2.5 opacity-70 border-2 border-gray-600" />
          <div className="absolute inset-0 bg-gray-600 rounded-[2rem] -z-20 transform translate-y-5 translate-x-5 opacity-50 border-2 border-gray-500" />
        </>
      )}
    </div>
  );
}
