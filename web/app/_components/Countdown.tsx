'use client';

import { useEffect, useState } from 'react';

interface CountdownProps {
  unlockUnix: number;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isUnlocked: boolean;
}

function calculateTimeRemaining(unlockUnix: number): TimeRemaining {
  const now = Math.floor(Date.now() / 1000);
  const diff = unlockUnix - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isUnlocked: true };
  }

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  return { days, hours, minutes, seconds, isUnlocked: false };
}

export function Countdown({ unlockUnix, className = '' }: CountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(unlockUnix)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(unlockUnix));
    }, 1000);

    return () => clearInterval(interval);
  }, [unlockUnix]);

  if (timeRemaining.isUnlocked) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <svg className="w-5 h-5 text-emerald-600 animate-[scaleIn_600ms_ease-out]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-emerald-700 font-semibold">Unlocked</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {timeRemaining.days > 0 && (
        <div className="text-center">
          <div className="text-2xl font-bold text-sage-600 font-mono transition-all duration-300">{timeRemaining.days}</div>
          <div className="text-xs text-warm-500 uppercase tracking-wide font-semibold">days</div>
        </div>
      )}
      <div className="text-center">
        <div className="text-2xl font-bold text-sage-600 font-mono transition-all duration-300">
          {String(timeRemaining.hours).padStart(2, '0')}
        </div>
        <div className="text-xs text-warm-500 uppercase tracking-wide font-semibold">hrs</div>
      </div>
      <div className="text-warm-300 text-xl font-bold">:</div>
      <div className="text-center">
        <div className="text-2xl font-bold text-sage-600 font-mono transition-all duration-300">
          {String(timeRemaining.minutes).padStart(2, '0')}
        </div>
        <div className="text-xs text-warm-500 uppercase tracking-wide font-semibold">min</div>
      </div>
      <div className="text-warm-300 text-xl font-bold">:</div>
      <div className="text-center">
        <div className="text-2xl font-bold text-sage-600 font-mono transition-all duration-300">
          {String(timeRemaining.seconds).padStart(2, '0')}
        </div>
        <div className="text-xs text-warm-500 uppercase tracking-wide font-semibold">sec</div>
      </div>
    </div>
  );
}

export function CountdownCompact({ unlockUnix }: CountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(unlockUnix)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(unlockUnix));
    }, 1000);

    return () => clearInterval(interval);
  }, [unlockUnix]);

  if (timeRemaining.isUnlocked) {
    return (
      <span className="text-emerald-600 font-semibold text-sm">
        Ready to release
      </span>
    );
  }

  const parts: string[] = [];
  if (timeRemaining.days > 0) parts.push(`${timeRemaining.days} Days`);
  else if (timeRemaining.hours > 0) parts.push(`${timeRemaining.hours} Hours`);
  else parts.push(`${timeRemaining.minutes} Minutes`);
  
  return (
    <span className="text-gray-700 font-medium text-sm">
      {parts[0]} Remaining
    </span>
  );
}
