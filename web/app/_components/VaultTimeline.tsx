'use client';

import { useEffect, useState } from 'react';
import { getVaultStatus, VaultData, VaultStatusInfo, getStatusText, formatTimeRemaining } from '../_lib/vault-status';

interface VaultTimelineProps {
  unlockUnix: number;
  vaultPeriodSeconds: number;
  notificationWindowSeconds: number;
  gracePeriodSeconds: number;
  lastCheckinUnix: number;
  released: boolean;
  cancelled?: boolean;
}

export function VaultTimeline({
  unlockUnix,
  vaultPeriodSeconds,
  notificationWindowSeconds,
  gracePeriodSeconds,
  lastCheckinUnix,
  released,
  cancelled,
}: VaultTimelineProps) {
  const [statusInfo, setStatusInfo] = useState<VaultStatusInfo | null>(null);

  // Update status every second
  useEffect(() => {
    const updateStatus = () => {
      const vaultData: VaultData = {
        unlockUnix,
        vaultPeriodSeconds,
        notificationWindowSeconds,
        gracePeriodSeconds,
        lastCheckinUnix,
        released,
        cancelled,
      };
      setStatusInfo(getVaultStatus(vaultData));
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [unlockUnix, vaultPeriodSeconds, notificationWindowSeconds, gracePeriodSeconds, lastCheckinUnix, released, cancelled]);

  if (!statusInfo) return null;

  const { status, timeUntilNext, canCheckIn, canRelease, percentComplete, notificationStartUnix, graceEndUnix } = statusInfo;

  // Status colors
  const statusColors = {
    locked: 'bg-lavender-200 text-lavender-900 border-lavender-300',
    notification: 'bg-amber-200 text-amber-900 border-amber-300',
    grace_period: 'bg-orange-200 text-orange-900 border-orange-300',
    ready_for_release: 'bg-rose-200 text-rose-900 border-rose-300',
    released: 'bg-green-200 text-green-900 border-green-300',
    cancelled: 'bg-warm-200 text-warm-900 border-warm-300',
  };

  const currentColor = statusColors[status] || statusColors.locked;

  // Timeline phases
  // Calculate effective unlock time (from statusInfo)
  const effectiveUnlock = lastCheckinUnix > 0 
    ? lastCheckinUnix + vaultPeriodSeconds 
    : unlockUnix;

  const phases = [
    {
      key: 'locked',
      label: 'Locked',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      color: 'lavender',
      time: notificationStartUnix,
    },
    {
      key: 'notification',
      label: 'Notification',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      color: 'amber',
      time: effectiveUnlock,
    },
    {
      key: 'unlock',
      label: 'Unlock',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
      ),
      color: 'orange',
      time: graceEndUnix,
    },
    {
      key: 'release',
      label: 'Release',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      color: 'green',
      time: null,
    },
  ];

  // Calculate which phase we're in
  const now = Math.floor(Date.now() / 1000);
  let currentPhaseIndex = 0;
  if (cancelled) {
    // Show cancelled state
  } else if (released) {
    currentPhaseIndex = 3; // Released
  } else if (now >= graceEndUnix) {
    currentPhaseIndex = 3; // Ready for release
  } else if (now >= effectiveUnlock) {
    currentPhaseIndex = 2; // Grace period / Unlock
  } else if (now >= notificationStartUnix) {
    currentPhaseIndex = 1; // Notification window
  } else {
    currentPhaseIndex = 0; // Locked
  }

  return (
    <div className="bg-white rounded-xl border border-warm-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-warm-900">Vault Timeline</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${currentColor}`}>
          {getStatusText(status)}
        </span>
      </div>

      {/* Status description */}
      <div className="mb-6">
        {status === 'locked' && (
          <p className="text-sm text-warm-600">
            Vault is locked. Notification window opens in {timeUntilNext ? formatTimeRemaining(timeUntilNext) : 'calculating...'}.
          </p>
        )}
        {status === 'notification' && (
          <div className="space-y-2">
            <p className="text-sm text-amber-700 font-medium">
              ⚠️ Notification window is active! Creator should check in.
            </p>
            <p className="text-sm text-warm-600">
              Unlock time in {timeUntilNext ? formatTimeRemaining(timeUntilNext) : 'calculating...'}.
            </p>
          </div>
        )}
        {status === 'grace_period' && (
          <div className="space-y-2">
            <p className="text-sm text-orange-700 font-medium">
              🔓 Vault has unlocked. Grace period active.
            </p>
            <p className="text-sm text-warm-600">
              Can be released now. Grace period ends in {timeUntilNext ? formatTimeRemaining(timeUntilNext) : 'calculating...'}.
            </p>
          </div>
        )}
        {status === 'ready_for_release' && (
          <p className="text-sm text-rose-700 font-medium">
            🚨 Grace period has ended. Vault is ready for release!
          </p>
        )}
        {status === 'released' && (
          <p className="text-sm text-green-700 font-medium">
            ✅ Funds have been released to the beneficiary.
          </p>
        )}
        {status === 'cancelled' && (
          <p className="text-sm text-warm-600">
            ❌ Vault has been cancelled. Funds returned to creator.
          </p>
        )}
      </div>

      {/* Progress bar */}
      {!cancelled && !released && (
        <div className="mb-6">
          <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-lavender-400 via-amber-400 to-rose-400 transition-all duration-1000"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {/* Timeline phases */}
      {!cancelled && (
        <div className="space-y-3">
          {phases.map((phase, index) => {
            const isPast = index < currentPhaseIndex;
            const isCurrent = index === currentPhaseIndex;
            const isFuture = index > currentPhaseIndex;

            return (
              <div key={phase.key} className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isPast || isCurrent
                      ? `bg-${phase.color}-100 border-${phase.color}-400 text-${phase.color}-700`
                      : 'bg-warm-50 border-warm-200 text-warm-400'
                  }`}
                >
                  {phase.icon}
                </div>

                {/* Label and time */}
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <span
                      className={`text-sm font-medium ${
                        isPast || isCurrent ? 'text-warm-900' : 'text-warm-500'
                      }`}
                    >
                      {phase.label}
                    </span>
                    {phase.time && (
                      <span className="text-xs text-warm-500">
                        {new Date(phase.time * 1000).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Phase-specific info */}
                  {isCurrent && phase.key === 'notification' && canCheckIn && (
                    <p className="text-xs text-amber-600 mt-1">Creator can check in to extend time</p>
                  )}
                  {isCurrent && (phase.key === 'unlock' || phase.key === 'release') && canRelease && (
                    <p className="text-xs text-rose-600 mt-1">Beneficiary can trigger release</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Check-in indicator */}
      {lastCheckinUnix > 0 && !cancelled && !released && (
        <div className="mt-6 pt-4 border-t border-warm-200">
          <div className="flex items-center gap-2 text-sm text-warm-700">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Last check-in: {new Date(lastCheckinUnix * 1000).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
