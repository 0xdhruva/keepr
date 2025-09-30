'use client';

import { ChangeEvent } from 'react';
import { formatAddress } from '../_lib/format';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}

export function AddressInput({ 
  value, 
  onChange, 
  error, 
  disabled,
  label = 'Beneficiary Address',
  placeholder = 'Enter Solana wallet address'
}: AddressInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value.trim());
  };

  const isValid = value.length > 0 && !error;

  return (
    <div className="space-y-2">
      <label htmlFor="beneficiary" className="block text-sm font-medium text-warm-700">
        {label}
      </label>
      <div className="relative">
        <input
          id="beneficiary"
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full px-4 py-3 bg-white border rounded-lg text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 transition-colors font-mono text-sm ${
            error
              ? 'border-rose-500 focus:ring-rose-500 bg-rose-50'
              : isValid
              ? 'border-green-500 focus:ring-green-500'
              : 'border-warm-200 focus:ring-sage-600 focus:border-sage-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {isValid && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-rose-600">{error}</p>
      )}
      {isValid && (
        <p className="text-xs text-warm-500">
          {formatAddress(value, 8)}
        </p>
      )}
      <p className="text-xs text-warm-500">
        This address will receive the funds after unlock time
      </p>
    </div>
  );
}
