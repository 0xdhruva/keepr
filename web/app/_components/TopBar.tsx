'use client';

import { useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatUSDC } from '../_lib/format';
import { getVaultCache } from '../_lib/storage';
import { useNotifications } from '../_contexts/NotificationContext';

interface TopBarProps {
  onMenuClick: () => void;
  onNotificationClick: () => void;
}

export function TopBar({ onMenuClick, onNotificationClick }: TopBarProps) {
  const { publicKey } = useWallet();
  const { unreadCount } = useNotifications();

  // Memoize total locked calculation to avoid recalculation on every render
  const totalLocked = useMemo(() => {
    if (!publicKey) return 0;

    const cache = getVaultCache();
    const userVaults = cache.filter(vault =>
      vault.creator === publicKey.toBase58() &&
      !vault.released &&
      !vault.cancelled
    );

    return userVaults.reduce((sum, vault) => sum + (vault.amountLocked || 0), 0);
  }, [publicKey]);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 lg:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Hamburger Menu */}
        <button
          onClick={onMenuClick}
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Locked USDC Badge */}
        {publicKey && totalLocked > 0 && (
          <div className="flex-1 flex items-center justify-center px-2">
            <div className="bg-dark-100 text-white px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap">
              Locked USDC {formatUSDC(totalLocked)}
            </div>
          </div>
        )}

        {/* Notification Bell */}
        <button
          onClick={onNotificationClick}
          className="relative w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>

          {/* Notification Badge */}
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
