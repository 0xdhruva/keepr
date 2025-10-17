'use client';

import Link from 'next/link';
import { VaultNotification, dismissNotification } from '../_lib/notifications';

interface NotificationBannerProps {
  notifications: VaultNotification[];
  onDismiss?: (vaultPda: string, type: VaultNotification['type']) => void;
}

export function NotificationBanner({ notifications, onDismiss }: NotificationBannerProps) {
  if (notifications.length === 0) return null;

  const handleDismiss = (notification: VaultNotification) => {
    dismissNotification(notification.vaultPda, notification.type);
    if (onDismiss) {
      onDismiss(notification.vaultPda, notification.type);
    }
  };

  return (
    <div className="space-y-3">
      {notifications.map((notification, index) => (
        <div
          key={`${notification.vaultPda}-${notification.type}-${index}`}
          className={`rounded-xl border p-4 flex items-start gap-3 ${
            notification.severity === 'critical'
              ? 'bg-red-50 border-red-200'
              : notification.severity === 'warning'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200'
          }`}
        >
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {notification.severity === 'critical' && (
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            {notification.severity === 'warning' && (
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {notification.severity === 'info' && (
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium ${
                notification.severity === 'critical'
                  ? 'text-red-900'
                  : notification.severity === 'warning'
                  ? 'text-amber-900'
                  : 'text-blue-900'
              }`}
            >
              {notification.message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <Link
              href={notification.actionUrl}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                notification.severity === 'critical'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : notification.severity === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {notification.actionText}
            </Link>
            <button
              onClick={() => handleDismiss(notification)}
              className={`p-1.5 rounded-lg transition-colors ${
                notification.severity === 'critical'
                  ? 'hover:bg-red-100 text-red-600'
                  : notification.severity === 'warning'
                  ? 'hover:bg-amber-100 text-amber-600'
                  : 'hover:bg-blue-100 text-blue-600'
              }`}
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
