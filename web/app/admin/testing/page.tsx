'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { isAdminWallet } from '../../_lib/validation';

export default function AdminTestingPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!connected) {
      router.push('/');
      return;
    }

    if (publicKey && !isAdminWallet(publicKey.toBase58())) {
      router.push('/');
      return;
    }
  }, [connected, publicKey, router]);

  if (!connected || !publicKey || !isAdminWallet(publicKey.toBase58())) {
    return null;
  }

  const testScenarios = [
    {
      title: '2-Minute Test Vault',
      description: 'Create a vault that unlocks in 2 minutes',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      steps: [
        'Go to Create Vault page',
        'Set unlock time to 2 minutes from now',
        'Set beneficiary (can be yourself as admin)',
        'Set amount (e.g., 1 USDC)',
        'Create and fund vault',
      ],
      color: 'lavender',
    },
    {
      title: 'Self-Beneficiary Test',
      description: 'Create a vault where you are both creator and beneficiary',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      steps: [
        'Go to Create Vault page',
        'Enter your own wallet address as beneficiary',
        'Set unlock time (2+ minutes)',
        'Create and fund vault',
        'Wait for unlock, then release to yourself',
      ],
      color: 'mint',
    },
    {
      title: 'Full Lifecycle Test',
      description: 'Test complete vault lifecycle including dead man\'s switch',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      steps: [
        'Create vault with 5min unlock, 2min notification window, 1min grace period',
        'Wait for notification window (3 minutes)',
        'Perform check-in to extend unlock time',
        'Wait for new unlock time',
        'Release vault after grace period',
      ],
      color: 'amber',
    },
    {
      title: 'Cancel Vault Test',
      description: 'Test vault cancellation and fund recovery',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      steps: [
        'Create a test vault',
        'Fund it with small amount',
        'Navigate to vault details page',
        'Click "Cancel Vault" button',
        'Confirm cancellation',
        'Verify funds returned to your wallet',
      ],
      color: 'rose',
    },
  ];

  const utilityLinks = [
    {
      title: 'Create Test Vault',
      description: 'Create a new vault with admin privileges',
      href: '/create',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      color: 'bg-sage-600 hover:bg-sage-700',
    },
    {
      title: 'View All Vaults',
      description: 'Browse all vaults in the system',
      href: '/admin/vaults',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'bg-lavender-600 hover:bg-lavender-700',
    },
    {
      title: 'My Vaults',
      description: 'View vaults you created or will inherit',
      href: '/vaults',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'bg-mint-600 hover:bg-mint-700',
    },
    {
      title: 'Solana Explorer',
      description: 'View program on Solana Explorer',
      href: 'https://explorer.solana.com/address/74v7NZh7A6SH9DmKZRC4tFUwaLvq19KfD1NGni62XQJK?cluster=devnet',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      ),
      color: 'bg-amber-600 hover:bg-amber-700',
      external: true,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin" className="inline-flex items-center text-sage-600 hover:text-sage-700 mb-2">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-warm-900">Testing Utilities</h1>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
              ADMIN
            </span>
          </div>
          <p className="text-warm-600 mt-2">Quick access to testing tools and scenarios</p>
        </div>

        {/* Admin Privileges Info */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-8">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <h3 className="font-semibold text-purple-900 mb-1">Admin Testing Privileges</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Minimum unlock time: <span className="font-semibold">2 minutes</span> (vs 24 hours for regular users)</li>
                <li>• Can set yourself as beneficiary (self-beneficiary vaults)</li>
                <li>• Vaults are marked as test vaults on-chain</li>
                <li>• All regular vault operations work the same way</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Test Scenarios */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-warm-900 mb-4">Test Scenarios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testScenarios.map((scenario) => (
              <div key={scenario.title} className={`bg-${scenario.color}-50 border border-${scenario.color}-200 rounded-xl p-6`}>
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-12 h-12 bg-${scenario.color}-100 rounded-lg flex items-center justify-center text-${scenario.color}-700 flex-shrink-0`}>
                    {scenario.icon}
                  </div>
                  <div>
                    <h3 className={`font-semibold text-${scenario.color}-900 mb-1`}>{scenario.title}</h3>
                    <p className={`text-sm text-${scenario.color}-700`}>{scenario.description}</p>
                  </div>
                </div>
                <div className={`bg-white/50 rounded-lg p-4 border border-${scenario.color}-200`}>
                  <p className={`text-xs font-semibold text-${scenario.color}-800 mb-2`}>Steps:</p>
                  <ol className="text-xs space-y-1">
                    {scenario.steps.map((step, index) => (
                      <li key={index} className={`text-${scenario.color}-700`}>
                        {index + 1}. {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-xl font-bold text-warm-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {utilityLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                className={`${link.color} text-white rounded-xl p-4 transition-all hover:scale-105 shadow-sm`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {link.icon}
                  {link.external && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                </div>
                <h3 className="font-semibold text-white mb-1">{link.title}</h3>
                <p className="text-xs text-white/80">{link.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Testing Tips */}
        <div className="mt-8 bg-white border border-warm-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-warm-900 mb-4">Testing Tips</h2>
          <div className="space-y-3 text-sm text-warm-700">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-sage-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Use small amounts (1-10 USDC) for testing to conserve devnet tokens</p>
            </div>
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-sage-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Test cancellation before release to verify fund recovery works correctly</p>
            </div>
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-sage-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Use the VaultTimeline component to visualize vault lifecycle phases</p>
            </div>
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-sage-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Check Solana Explorer for transaction details and program account state</p>
            </div>
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-sage-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Test the dual-view "My Vaults" page by creating vaults for different beneficiaries</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
