'use client';

import { ChangeEvent } from 'react';
import { chunkAddress } from '../_lib/identicon';
import { Identicon } from './Identicon';

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

  const isValid = value.length >= 32 && !error;

  return (
    <div className="space-y-2">
      <label htmlFor="beneficiary" className="block text-sm font-medium text-warm-700">
        {label}
        <span className="ml-2 text-xs text-warm-500 font-normal">
          (will receive funds)
        </span>
      </label>
      <div className="relative">
        <input
          id="beneficiary"
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full px-4 py-3 bg-white border rounded-lg text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 transition-all duration-200 font-mono text-sm ${
            error
              ? 'border-rose-500 focus:ring-rose-500 bg-rose-50'
              : isValid
              ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50/30'
              : 'border-warm-200 focus:ring-sage-600 focus:border-sage-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {isValid && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-[scaleIn_200ms_ease-out]">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Identicon + Chunked Address Display */}
      {isValid && (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg animate-[slideUp_300ms_ease-out]">
          <Identicon address={value} size={48} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-emerald-900 mb-1">Beneficiary Preview</p>
            <p className="text-sm font-mono text-emerald-700 break-all leading-relaxed">
              {chunkAddress(value)}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-600 flex items-center gap-1.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}

      {!isValid && !error && (
        <p className="text-xs text-warm-500">
          Double-check this address carefully — funds will be locked for this beneficiary only
        </p>
      )}
    </div>
  );
}
