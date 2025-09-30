'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';

export default function Home() {
  const { connected } = useWallet();

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      {/* Hero Card - Lavender */}
      <div className="bg-gradient-to-br from-lavender-200 to-lavender-300 rounded-3xl p-8 mb-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-gray-700 text-sm mb-2">Your Legacy</p>
            <h1 className="text-4xl font-bold text-gray-900">Peace of mind</h1>
            <p className="text-gray-700 mt-2">in minutes</p>
          </div>
          <div className="w-12 h-12 bg-white/40 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        {connected && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Ready to secure</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          href="/create"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium text-gray-900">Create New Vault</span>
        </Link>
        
        <button className="flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-gray-900">How it works</span>
        </button>
      </div>

      {/* Digital Vaults Section */}
      {connected ? (
        <div className="mb-8">
          <h2 className="text-gray-500 text-sm font-medium mb-4">Digital Vaults</h2>
          
          <div className="space-y-3">
            {/* Legacy Vault Card */}
            <div className="bg-gradient-to-br from-lavender-100 to-lavender-200 rounded-2xl p-5 border border-lavender-300/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Legacy</p>
                  <p className="text-sm text-gray-700">Vault</p>
                </div>
                <div className="w-8 h-8 bg-white/50 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-3">Pass on your wealth securely</p>
              <button className="w-full px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors">
                Secure my legacy
              </button>
            </div>

            {/* Pension Vault Card */}
            <div className="bg-gradient-to-br from-mint-100 to-mint-200 rounded-2xl p-5 border border-mint-300/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Pension</p>
                  <p className="text-sm text-gray-700">Vault</p>
                </div>
                <div className="w-8 h-8 bg-white/50 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-3">Pass on your wealth securely</p>
              <button className="w-full px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors">
                Secure my pension
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">Connect your wallet to get started</p>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Why Keepr?</h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Non custodial</p>
              <p className="text-xs text-gray-600 mt-1">You control your keys</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Transparent & Secure</p>
              <p className="text-xs text-gray-600 mt-1">On-chain verification</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Trusted Infrastructure</p>
              <p className="text-xs text-gray-600 mt-1">Built on Solana</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-xs text-gray-400">Powered by Solana</p>
      </div>
    </div>
  );
}
