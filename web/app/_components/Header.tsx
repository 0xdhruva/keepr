'use client';

import Link from 'next/link';
import { WalletConnect } from './WalletConnect';
import { NetworkBadge } from './NetworkBadge';
import { APP_NAME } from '../_lib/solana';

export function Header() {
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
          <WalletConnect />
        </nav>
      </div>
    </header>
  );
}
