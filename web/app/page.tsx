'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { useState } from 'react';
import { HeroVaultCarousel } from './_components/HeroVaultCarousel';
import { ActionButtons } from './_components/ActionButtons';
import { TutorialModal } from './_components/TutorialModal';
import { VaultTemplateCarousel } from './_components/VaultTemplateCarousel';
import { PricingTierSection } from './_components/PricingTierSection';

export default function Home() {
  const { connected } = useWallet();
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Hero Vault Carousel - Always visible */}
      <HeroVaultCarousel />

      {/* Action Buttons */}
      <ActionButtons onTutorialClick={() => setShowTutorial(true)} />

      {/* Digital Vaults Section */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">Digital Vaults</h2>
        <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
          Choose the vault that fits your needs. From simple time-locks to enterprise-grade planning.
        </p>
        <VaultTemplateCarousel />
      </div>

      {/* Pricing Tiers */}
      <div className="mb-16">
        <PricingTierSection />
      </div>

      {/* Why Keepr Section */}
      <div className="bg-gradient-to-br from-gray-50 to-sage-50/20 rounded-3xl p-6 md:p-12 mb-16">
        <h3 className="text-center text-xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-12">Why Keepr?</h3>

        {/* Mobile: Compact horizontal layout */}
        <div className="flex flex-col gap-4 md:hidden">
          <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm">
            <div className="w-12 h-12 bg-sage-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-base font-bold text-gray-900 mb-0.5">Your Funds, Your Rules</h4>
              <p className="text-sm text-gray-600">Keepr never holds your money.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm">
            <div className="w-12 h-12 bg-sage-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-base font-bold text-gray-900 mb-0.5">Transparent by Design</h4>
              <p className="text-sm text-gray-600">Every vault is open and auditable.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm">
            <div className="w-12 h-12 bg-sage-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-base font-bold text-gray-900 mb-0.5">Failsafe Forever</h4>
              <p className="text-sm text-gray-600">Even if Keepr disappears, your vault works.</p>
            </div>
          </div>
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden md:grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-sage-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Your Funds, Your Rules</h4>
            <p className="text-gray-600">Keepr never holds your money.</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-sage-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Transparent by Design</h4>
            <p className="text-gray-600">Every vault is open and auditable.</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-sage-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Failsafe Forever</h4>
            <p className="text-gray-600">Even if Keepr disappears, your vault works.</p>
          </div>
        </div>
      </div>

      {/* Illustration Placeholder */}
      <div className="text-center py-8 mb-8">
        <div className="w-48 h-48 bg-gradient-to-br from-neon-green-100 to-neon-green-200 rounded-3xl mx-auto mb-4 flex items-center justify-center">
          <svg className="w-24 h-24 text-neon-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-xs text-gray-400">[Illustration placeholder]</p>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-gray-200">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Secured by</span>
          <svg className="h-5" viewBox="0 0 397 311" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M64.6 237.4c2.4-2.3 5.2-4.5 8.2-6.2 3.1-1.8 6.4-3.1 9.9-3.9 3.5-.8 7.3-1.2 11.2-1.2 5.4 0 10.5.7 15.3 2.1 4.8 1.4 9 3.5 12.5 6.3 3.5 2.8 6.3 6.3 8.4 10.5 2 4.2 3.1 9 3.1 14.4v68h-34.7v-61.8c0-1.7-.2-3.3-.7-4.8-.5-1.5-1.2-2.8-2.3-3.9-1-1.1-2.3-2-3.9-2.7-1.6-.7-3.5-1-5.7-1-2.2 0-4.1.3-5.7 1-1.6.7-2.9 1.6-3.9 2.7-1 1.1-1.8 2.4-2.3 3.9-.5 1.5-.7 3.1-.7 4.8v61.8H38.6v-91.2h25.9v1.1z" fill="url(#paint0_linear)" /><path d="M167.8 237.4c2.4-2.3 5.2-4.5 8.2-6.2 3.1-1.8 6.4-3.1 9.9-3.9 3.5-.8 7.3-1.2 11.2-1.2 5.4 0 10.5.7 15.3 2.1 4.8 1.4 9 3.5 12.5 6.3 3.5 2.8 6.3 6.3 8.4 10.5 2 4.2 3.1 9 3.1 14.4v68h-34.7v-61.8c0-1.7-.2-3.3-.7-4.8-.5-1.5-1.2-2.8-2.3-3.9-1-1.1-2.3-2-3.9-2.7-1.6-.7-3.5-1-5.7-1-2.2 0-4.1.3-5.7 1-1.6.7-2.9 1.6-3.9 2.7-1 1.1-1.8 2.4-2.3 3.9-.5 1.5-.7 3.1-.7 4.8v61.8h-34.7v-91.2h25.9v1.1z" fill="url(#paint1_linear)" /><defs><linearGradient id="paint0_linear" x1="200" y1="0" x2="200" y2="400" gradientUnits="userSpaceOnUse"><stop stopColor="#00FFA3" /><stop offset="1" stopColor="#DC1FFF" /></linearGradient><linearGradient id="paint1_linear" x1="200" y1="0" x2="200" y2="400" gradientUnits="userSpaceOnUse"><stop stopColor="#00FFA3" /><stop offset="1" stopColor="#DC1FFF" /></linearGradient></defs>
          </svg>
        </div>
        <p className="text-xs text-gray-400">Non-custodial • Open Source • On-Chain</p>
      </div>

      {/* Tutorial Modal */}
      <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
}
