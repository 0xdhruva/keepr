'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WalletConnect } from './WalletConnect';
import { NetworkBadge } from './NetworkBadge';
import { NotificationPanel } from './NotificationPanel';
import { useNotifications } from '../_contexts/NotificationContext';
import { APP_NAME } from '../_lib/solana';

export function Header() {
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <header className="hidden lg:block sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">{APP_NAME}</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="flex items-center gap-6 ml-8">
            <Link href="/vaults" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              My Vaults
            </Link>
            <Link href="/profile" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              Profile
            </Link>
          </nav>
        </div>

        <nav className="flex items-center gap-3">
          <NetworkBadge />

          {/* Notification Bell */}
          <button
            onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <WalletConnect />
        </nav>
      </div>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
      />
    </header>
  );
}
