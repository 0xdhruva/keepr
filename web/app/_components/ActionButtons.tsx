'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface ActionButtonsProps {
  onTutorialClick: () => void;
}

export function ActionButtons({ onTutorialClick }: ActionButtonsProps) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const pendingRedirect = useRef<string | null>(null);

  // Redirect after wallet connects
  useEffect(() => {
    if (connected && pendingRedirect.current) {
      const redirect = pendingRedirect.current;
      pendingRedirect.current = null;
      router.push(redirect);
    }
  }, [connected, router]);

  const handleActionClick = (href: string) => (e: React.MouseEvent) => {
    if (!connected) {
      e.preventDefault();
      pendingRedirect.current = href;
      setVisible(true);
    }
  };

  const handleNewVaultClick = () => {
    if (connected) {
      router.push('/create');
    } else {
      pendingRedirect.current = '/create';
      setVisible(true);
    }
  };

  const actions = [
    {
      label: 'New Vault',
      onClick: handleNewVaultClick,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      label: 'My Vaults',
      href: '/vaults',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      label: 'Watch Tutorial',
      onClick: onTutorialClick,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex gap-4 justify-center py-6">
      {actions.map((action) => (
        action.href ? (
          <Link
            key={action.label}
            href={action.href}
            onClick={handleActionClick(action.href)}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center group-hover:shadow-lg group-hover:scale-105 transition-all duration-200 border border-gray-200">
              <div className="text-gray-700 group-hover:text-sage-600">
                {action.icon}
              </div>
            </div>
            <span className="text-xs font-medium text-gray-700 group-hover:text-sage-600 transition-colors">
              {action.label}
            </span>
          </Link>
        ) : (
          <button
            key={action.label}
            onClick={action.onClick}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-14 h-14 bg-white rounded-full shadow-md flex items-center justify-center group-hover:shadow-lg group-hover:scale-105 transition-all duration-200 border border-gray-200">
              <div className="text-gray-700 group-hover:text-sage-600">
                {action.icon}
              </div>
            </div>
            <span className="text-xs font-medium text-gray-700 group-hover:text-sage-600 transition-colors">
              {action.label}
            </span>
          </button>
        )
      ))}
    </div>
  );
}
