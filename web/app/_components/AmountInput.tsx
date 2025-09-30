'use client';

import { ChangeEvent } from 'react';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function AmountInput({ value, onChange, error, disabled }: AmountInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Allow only numbers and one decimal point
    if (val === '' || /^\d*\.?\d{0,6}$/.test(val)) {
      onChange(val);
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor="amount" className="block text-sm font-medium text-warm-700">
        Amount (USDC)
      </label>
      <div className="relative">
        <input
          id="amount"
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="0.00"
          className={`w-full px-4 py-3 pr-16 bg-white border rounded-lg text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
            error
              ? 'border-rose-500 focus:ring-rose-500 bg-rose-50'
              : 'border-warm-200 focus:ring-sage-600 focus:border-sage-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-500 text-sm font-semibold">
          USDC
        </div>
      </div>
      {error && (
        <p className="text-sm text-rose-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
      <p className="text-xs text-warm-500">
        Maximum: 500 USDC per vault
      </p>
    </div>
  );
}
