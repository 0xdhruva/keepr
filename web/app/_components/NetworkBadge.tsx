'use client';

import { NETWORK_BADGE } from '../_lib/solana';

export function NetworkBadge() {
  const isMainnet = NETWORK_BADGE === 'MAINNET';
  
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
        isMainnet
          ? 'bg-amber-50 text-amber-700 border border-amber-200'
          : 'bg-sky-50 text-sky-700 border border-sky-200'
      }`}
    >
      <div className={`w-1 h-1 rounded-full ${isMainnet ? 'bg-amber-500' : 'bg-sky-500'}`} />
      <span className="text-[10px] uppercase tracking-wider">{NETWORK_BADGE}</span>
    </div>
  );
}
