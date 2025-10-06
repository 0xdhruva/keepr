'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const { connected } = useWallet();
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* Hero Section - Calm & Trustworthy */}
      <div className="text-center mb-16 relative">
        {/* Decorative background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-sage-100 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDuration: '4s' }}></div>
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-lavender-100 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }}></div>
        </div>

        {/* Trust badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-sage-50 border border-sage-200 rounded-full mb-6 animate-[slideUp_600ms_ease-out]">
          <svg className="w-4 h-4 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <span className="text-sm font-medium text-sage-700">Secured on Solana</span>
        </div>

        <h1 className="text-6xl font-bold text-warm-900 mb-6 leading-tight animate-[slideUp_700ms_ease-out]">
          Peace of mind for your assets<br />
          <span className="text-sage-600">in minutes</span>
        </h1>

        <p className="text-xl text-warm-600 mb-10 max-w-2xl mx-auto animate-[slideUp_800ms_ease-out]">
          Lock your crypto with time-based protection. Simple, transparent, and trustworthy.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 animate-[slideUp_900ms_ease-out]">
          <Link
            href="/create"
            className="px-8 py-4 bg-sage-600 hover:bg-sage-700 text-white rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            Create a new Vault
          </Link>

          {connected && (
            <Link
              href="/vaults"
              className="px-8 py-4 bg-lavender-600 hover:bg-lavender-700 text-white rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              View My Vaults
            </Link>
          )}

          {!connected && (
            <button
              onClick={() => setShowHowItWorks(true)}
              className="px-8 py-4 bg-white hover:bg-warm-50 text-warm-800 rounded-xl font-semibold text-lg transition-all duration-200 border-2 border-warm-200 hover:border-sage-300 shadow-sm hover:shadow-md"
            >
              How it works
            </button>
          )}
        </div>

        {/* Social proof / stats */}
        <div className="mt-12 flex items-center justify-center gap-8 text-sm text-warm-500 animate-[fadeIn_1000ms_ease-out]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-sage-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Non-custodial</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-sage-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Open source</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-sage-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Transparent fees</span>
          </div>
        </div>
      </div>

      {/* Vault Templates Section */}
      <div className="mb-8">
        <h2 className="text-warm-600 text-sm font-semibold mb-6 uppercase tracking-wide">Vault Templates</h2>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Token2049 Vault Card */}
          <Link href="/create?template=token2049" className="block group">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200 hover:border-amber-300 transition-all duration-200 hover:shadow-md h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-amber-200 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="px-2 py-1 bg-amber-200 rounded-full">
                  <span className="text-xs font-semibold text-amber-800">Travel Safe</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-warm-900 mb-2">Token2049 Vault</h3>
              <p className="text-sm text-warm-700 mb-4">
                Protect your assets while traveling. Set a return date and check in safely to reclaim, or have funds sent to your beneficiary.
              </p>
              <div className="flex items-center text-sm text-amber-700 font-medium group-hover:text-amber-800 transition-colors">
                <span>Set up protection</span>
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Legacy Vault Card */}
          <Link href="/create?template=legacy" className="block group">
            <div className="bg-gradient-to-br from-lavender-50 to-lavender-100 rounded-xl p-6 border border-lavender-200 hover:border-lavender-300 transition-all duration-200 hover:shadow-md h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-lavender-200 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-lavender-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div className="px-2 py-1 bg-lavender-200 rounded-full">
                  <span className="text-xs font-semibold text-lavender-800">Forever</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-warm-900 mb-2">Legacy Vault</h3>
              <p className="text-sm text-warm-700 mb-4">
                Safekeep assets forever with quarterly check-ins. Miss a check-in and your beneficiary receives the funds after a grace period.
              </p>
              <div className="flex items-center text-sm text-lavender-700 font-medium group-hover:text-lavender-800 transition-colors">
                <span>Secure legacy</span>
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {!connected && (
        <div className="text-center py-8 bg-warm-50 rounded-xl border border-warm-200">
          <div className="w-16 h-16 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-warm-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
          <p className="text-warm-700 text-sm font-medium mb-2">Connect your wallet to get started</p>
          <p className="text-warm-500 text-xs">Start creating vaults in seconds</p>
        </div>
      )}

      {/* Why Keepr Section - Horizontal */}
      <div className="bg-gradient-to-br from-warm-50 to-sage-50/30 rounded-2xl p-8 border border-warm-200 mb-8">
        <h3 className="text-center text-lg font-bold text-warm-900 mb-8">Why Keepr?</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-sage-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-warm-900 mb-2">Non custodial</p>
            <p className="text-sm text-warm-600">You control your keys, always</p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-sage-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-warm-900 mb-2">Transparent & Secure</p>
            <p className="text-sm text-warm-600">On-chain verification you can trust</p>
          </div>

          <div className="text-center">
            <div className="w-14 h-14 bg-sage-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-warm-900 mb-2">Lightning Fast</p>
            <p className="text-sm text-warm-600">Built on Solana's infrastructure</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-xs text-warm-400">Powered by Solana</p>
      </div>

      {/* How it Works Modal */}
      {showHowItWorks && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-[fadeIn_200ms_ease-out]"
          onClick={() => setShowHowItWorks(false)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full p-8 shadow-lg animate-[slideUp_300ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold text-warm-900">How Keepr Works</h2>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-warm-100 transition-colors"
              >
                <svg className="w-5 h-5 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-sage-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sage-700 font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-warm-900 mb-1">Create Your Vault</h3>
                  <p className="text-sm text-warm-700">
                    Choose a template or create from scratch. Set the amount, unlock time, and beneficiary address.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-sage-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sage-700 font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-warm-900 mb-1">Lock Your Assets</h3>
                  <p className="text-sm text-warm-700">
                    Your USDC is secured in a time-locked vault on Solana. Funds are held in a PDA (Program Derived Address) — no one can access them until the unlock time.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-sage-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sage-700 font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-warm-900 mb-1">Wait for Unlock</h3>
                  <p className="text-sm text-warm-700">
                    Watch the countdown. Once the unlock time arrives, your designated beneficiary can claim the funds. You stay in control.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-warm-900 mb-1">Release & Peace of Mind</h3>
                  <p className="text-sm text-warm-700">
                    After unlock, funds are automatically released to your beneficiary. No backend, no middleman — just transparent, on-chain security.
                  </p>
                </div>
              </div>

              {/* Safety Features */}
              <div className="pt-4 border-t border-warm-200">
                <h3 className="font-semibold text-warm-900 mb-3">Safety First</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-warm-700">
                    <svg className="w-4 h-4 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Non-custodial</span>
                  </div>
                  <div className="flex items-center gap-2 text-warm-700">
                    <svg className="w-4 h-4 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Per-vault cap</span>
                  </div>
                  <div className="flex items-center gap-2 text-warm-700">
                    <svg className="w-4 h-4 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Solana speed</span>
                  </div>
                  <div className="flex items-center gap-2 text-warm-700">
                    <svg className="w-4 h-4 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Fully transparent</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Link
                href="/create"
                className="flex-1 px-6 py-3 bg-sage-600 hover:bg-sage-700 text-white rounded-lg font-semibold text-center transition-all duration-200"
                onClick={() => setShowHowItWorks(false)}
              >
                Create Vault
              </Link>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="px-6 py-3 bg-warm-100 hover:bg-warm-200 text-warm-800 rounded-lg font-semibold transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
