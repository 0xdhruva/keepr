'use client';

import { ChangeEvent } from 'react';
import { formatDateTime } from '../_lib/format';

interface DateTimeInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function DateTimeInput({ value, onChange, error, disabled }: DateTimeInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Get minimum datetime (5 minutes from now)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16);
  };

  const minDateTime = getMinDateTime();

  return (
    <div className="space-y-2">
      <label htmlFor="unlockTime" className="block text-sm font-medium text-warm-700">
        Unlock Date & Time
        <span className="ml-2 text-xs text-warm-500 font-normal">
          (when funds become claimable)
        </span>
      </label>

      {/* Custom styled wrapper for datetime input */}
      <div className="relative">
        <input
          id="unlockTime"
          type="datetime-local"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          min={minDateTime}
          className={`w-full px-4 py-3 bg-white border-2 rounded-lg font-medium transition-all duration-200 ${
            error
              ? 'border-rose-500 focus:border-rose-600 focus:ring-4 focus:ring-rose-100 bg-rose-50 text-rose-900'
              : value
              ? 'border-sage-500 focus:border-sage-600 focus:ring-4 focus:ring-sage-100 text-sage-900'
              : 'border-warm-200 focus:border-sage-500 focus:ring-4 focus:ring-sage-100 text-warm-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none
          [color-scheme:light]
          appearance-none
          `}
          style={{
            colorScheme: 'light',
          }}
        />
        {value && !error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-sage-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-rose-600 flex items-center gap-1.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}

      {value && !error && (
        <div className="flex items-start gap-2 p-3 bg-sage-50 border border-sage-200 rounded-lg">
          <svg className="w-4 h-4 text-sage-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-sage-700">
            <p className="font-semibold mb-1">Unlock time set</p>
            <p>{formatDateTime(Math.floor(new Date(value).getTime() / 1000))}</p>
          </div>
        </div>
      )}

      {!value && (
        <p className="text-xs text-warm-500 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Minimum: 5 minutes from now
        </p>
      )}
    </div>
  );
}
