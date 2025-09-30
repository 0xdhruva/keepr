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
      </label>
      <input
        id="unlockTime"
        type="datetime-local"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        min={minDateTime}
        className={`w-full px-4 py-3 bg-white border rounded-lg text-white focus:outline-none focus:ring-2 transition-colors ${
          error
            ? 'border-rose-500 focus:ring-rose-500 bg-rose-50'
            : 'border-warm-200 focus:ring-sage-600 focus:border-sage-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {error && (
        <p className="text-sm text-rose-600">{error}</p>
      )}
      {value && !error && (
        <p className="text-xs text-warm-500">
          Funds will be released: {formatDateTime(Math.floor(new Date(value).getTime() / 1000))}
        </p>
      )}
      <p className="text-xs text-warm-500">
        Minimum: 5 minutes from now
      </p>
    </div>
  );
}
