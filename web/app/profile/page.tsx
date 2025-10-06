'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatAddress } from '../_lib/format';
import { Identicon } from '../_components/Identicon';

interface Beneficiary {
  address: string;
  label: string;
  addedAt: number;
}

export default function ProfilePage() {
  const { connected, publicKey, disconnect } = useWallet();
  const router = useRouter();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [newBeneficiary, setNewBeneficiary] = useState({ address: '', label: '' });
  const [isAddingBeneficiary, setIsAddingBeneficiary] = useState(false);

  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  useEffect(() => {
    if (publicKey) {
      // Load beneficiaries from localStorage
      const stored = localStorage.getItem(`keepr.beneficiaries.${publicKey.toBase58()}`);
      if (stored) {
        try {
          setBeneficiaries(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to load beneficiaries:', e);
        }
      }
    }
  }, [publicKey]);

  const saveBeneficiaries = (list: Beneficiary[]) => {
    if (publicKey) {
      localStorage.setItem(`keepr.beneficiaries.${publicKey.toBase58()}`, JSON.stringify(list));
      setBeneficiaries(list);
    }
  };

  const handleAddBeneficiary = () => {
    if (!newBeneficiary.address || !newBeneficiary.label) {
      alert('Please fill in both address and label');
      return;
    }

    const newList = [
      ...beneficiaries,
      {
        address: newBeneficiary.address,
        label: newBeneficiary.label,
        addedAt: Date.now(),
      },
    ];

    saveBeneficiaries(newList);
    setNewBeneficiary({ address: '', label: '' });
    setIsAddingBeneficiary(false);
  };

  const handleRemoveBeneficiary = (address: string) => {
    if (confirm('Remove this beneficiary from your list?')) {
      saveBeneficiaries(beneficiaries.filter(b => b.address !== address));
    }
  };

  if (!connected || !publicKey) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl pb-24 lg:pb-8">
      {/* Profile Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-gray-600">Manage your account and beneficiaries</p>
      </div>

      {/* Wallet Info */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Wallet</h2>
        <div className="flex items-center gap-4 mb-4">
          <Identicon address={publicKey.toBase58()} size={64} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 mb-1">Connected Address</p>
            <p className="font-mono text-sm text-gray-900 break-all">{publicKey.toBase58()}</p>
          </div>
        </div>
        <button
          onClick={() => disconnect()}
          className="w-full px-4 py-3 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-medium transition-colors"
        >
          Disconnect Wallet
        </button>
      </div>

      {/* Beneficiaries */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Beneficiaries</h2>
            <p className="text-sm text-gray-600">Manage your list of beneficiaries</p>
          </div>
          <button
            onClick={() => setIsAddingBeneficiary(!isAddingBeneficiary)}
            className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            {isAddingBeneficiary ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {/* Add Beneficiary Form */}
        {isAddingBeneficiary && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <input
                type="text"
                value={newBeneficiary.label}
                onChange={(e) => setNewBeneficiary({ ...newBeneficiary, label: e.target.value })}
                placeholder="e.g., John Doe"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sage-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Solana Address</label>
              <input
                type="text"
                value={newBeneficiary.address}
                onChange={(e) => setNewBeneficiary({ ...newBeneficiary, address: e.target.value })}
                placeholder="Enter Solana address"
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sage-600 font-mono text-sm"
              />
            </div>
            <button
              onClick={handleAddBeneficiary}
              className="w-full px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-lg font-medium transition-colors"
            >
              Add Beneficiary
            </button>
          </div>
        )}

        {/* Beneficiary List */}
        <div className="space-y-3">
          {beneficiaries.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">No beneficiaries added yet</p>
            </div>
          ) : (
            beneficiaries.map((beneficiary) => (
              <div
                key={beneficiary.address}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Identicon address={beneficiary.address} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{beneficiary.label}</p>
                  <p className="text-xs font-mono text-gray-600">{formatAddress(beneficiary.address, 6)}</p>
                </div>
                <button
                  onClick={() => handleRemoveBeneficiary(beneficiary.address)}
                  className="w-8 h-8 hover:bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
