'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HeroVaultCard } from './HeroVaultCard';
import { getVaultCache } from '../_lib/storage';

interface Vault {
  vaultPda: string;
  name: string;
  amountLocked: number;
  unlockUnix: number;
  beneficiary: string;
  creator: string;
  released: boolean;
  cancelled?: boolean;
  notificationWindowSeconds?: number;
}

export function HeroVaultCarousel() {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const waitingForConnection = useRef(false);

  useEffect(() => {
    if (connected && waitingForConnection.current) {
      waitingForConnection.current = false;
      router.push('/create');
    }
  }, [connected, router]);

  const handleCreateFirstVaultClick = () => {
    if (connected) {
      router.push('/create');
    } else {
      waitingForConnection.current = true;
      try {
        setVisible(true);
      } catch (error) {
        // User rejected wallet connection - reset flag
        waitingForConnection.current = false;
      }
    }
  };

  // Memoize vault filtering and sorting to avoid recalculation on every render
  const sortedVaults = useMemo(() => {
    if (!publicKey) return [];

    // Load vaults from cache
    const cache = getVaultCache();
    const userVaults = cache
      .filter(vault =>
        vault.creator === publicKey.toBase58() &&
        !vault.released &&
        !vault.cancelled &&
        vault.amountLocked !== undefined &&
        vault.unlockUnix !== undefined
      )
      .map(vault => ({
        vaultPda: vault.vaultPda,
        name: vault.name,
        amountLocked: vault.amountLocked,
        unlockUnix: vault.unlockUnix,
        beneficiary: vault.beneficiary,
        creator: vault.creator,
        released: vault.released || false,
        cancelled: vault.cancelled || false,
        notificationWindowSeconds: vault.notificationWindowSeconds,
      }));

    // Sort by next check-in needed (soonest notification window)
    const now = Math.floor(Date.now() / 1000);
    return userVaults.sort((a, b) => {
      // Calculate next check-in time for each vault
      const aCheckInTime = a.unlockUnix - (a.notificationWindowSeconds || 0);
      const bCheckInTime = b.unlockUnix - (b.notificationWindowSeconds || 0);

      // If both are past due, sort by unlock time (soonest first)
      if (aCheckInTime < now && bCheckInTime < now) {
        return a.unlockUnix - b.unlockUnix;
      }

      // Otherwise sort by next check-in time (soonest first)
      return aCheckInTime - bCheckInTime;
    });
  }, [publicKey]);

  useEffect(() => {
    setVaults(sortedVaults);
  }, [sortedVaults]);

  // Throttled scroll handler to reduce CPU usage (max 1 update per 100ms)
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = 300; // Approximate width including margins
    const newIndex = Math.round(scrollLeft / cardWidth);

    if (newIndex !== focusedIndex && newIndex >= 0 && newIndex < vaults.length) {
      setFocusedIndex(newIndex);
    }
  }, [focusedIndex, vaults.length]);

  // Throttle scroll events
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout;
    const throttledScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    container.addEventListener('scroll', throttledScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', throttledScroll);
      clearTimeout(timeoutId);
    };
  }, [handleScroll]);

  // Empty state or not connected - show sample vault
  if (!publicKey || vaults.length === 0) {
    return (
      <div className="w-full py-8 mb-12 overflow-hidden">
        <div className="flex justify-center px-4">
          {/* Sample Vault Door */}
          <div className="relative flex-shrink-0 w-[255px] sm:w-[290px] overflow-hidden">
            {/* Main Vault Door */}
            <div className="relative bg-black rounded-[2rem] p-6 shadow-2xl border-4 border-dark-300/80 overflow-hidden">
              {/* Status Badge - Top Left */}
              <div className="absolute top-5 left-5">
                <span className="inline-block px-3 py-1 bg-purple-pink-500/30 text-purple-pink-300 text-xs font-bold uppercase tracking-wider rounded">
                  Sample
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
                  1,000
                </div>
                <div className="text-xl text-white font-semibold">USDC</div>
              </div>

              {/* Unlock Time */}
              <div className="mb-3">
                <div className="text-sm text-gray-300">Unlock in 30d</div>
              </div>

              {/* Beneficiary */}
              <div className="mb-6">
                <div className="text-xs text-gray-400 mb-1">Beneficiary</div>
                <div className="text-base text-white font-medium font-mono">
                  Your...loved ones
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleCreateFirstVaultClick}
                className="block w-full py-3 bg-gradient-to-r from-neon-green-500 to-neon-green-600 text-white text-center rounded-xl font-bold hover:from-neon-green-600 hover:to-neon-green-700 transition-all shadow-lg"
              >
                Create Your First Vault
              </button>
            </div>

            {/* Layered Vault Door Effect (background layers for 3D depth) */}
            <div className="absolute inset-0 bg-gray-700 rounded-[2rem] -z-10 transform translate-y-2.5 translate-x-2.5 opacity-70 border-2 border-gray-600" />
            <div className="absolute inset-0 bg-gray-600 rounded-[2rem] -z-20 transform translate-y-5 translate-x-5 opacity-50 border-2 border-gray-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8 overflow-hidden">
      {/* Carousel Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-scroll snap-x snap-mandatory scrollbar-hide px-[calc(50vw-128px)] sm:px-[calc(50vw-145px)] -mx-4"
        style={{
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {vaults.map((vault, index) => (
          <div key={vault.vaultPda} className="snap-center">
            <HeroVaultCard
              vaultPda={vault.vaultPda}
              name={vault.name}
              amountLocked={vault.amountLocked}
              unlockUnix={vault.unlockUnix}
              beneficiary={vault.beneficiary}
              released={vault.released}
              cancelled={vault.cancelled}
              isFocused={index === focusedIndex}
            />
          </div>
        ))}
      </div>

      {/* Carousel Indicators */}
      {vaults.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {vaults.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                const container = scrollContainerRef.current;
                if (container) {
                  const cardWidth = 300;
                  container.scrollTo({
                    left: index * cardWidth,
                    behavior: 'smooth',
                  });
                }
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === focusedIndex
                  ? 'w-8 bg-purple-pink-500'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to vault ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
