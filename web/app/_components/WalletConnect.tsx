'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { formatAddress } from '../_lib/format';
import { useEffect, useState } from 'react';

export function WalletConnect() {
  const { publicKey, connected } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex items-center gap-4">
      {mounted && connected && publicKey && (
        <div className="hidden sm:flex items-center gap-2 text-sm text-warm-600">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="font-mono">{formatAddress(publicKey.toBase58(), 4)}</span>
        </div>
      )}
      {mounted && (
        <WalletMultiButton className="!bg-gray-900 hover:!bg-gray-800 !rounded-xl !h-9 !px-4 !text-sm !font-medium !transition-colors" />
      )}
    </div>
  );
}
