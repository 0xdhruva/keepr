'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  loadNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
} from '../../_components/NotificationPoller';

export default function NotificationSettingsPage() {
  const { connected } = useWallet();
  const router = useRouter();
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default'>('default');
  const [settings, setSettings] = useState({
    enabled: false,
    notificationWindow: true,
    gracePerio: true,
    release: true,
    cancel: true,
    checkInterval: 60,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!connected) {
      router.push('/');
      return;
    }

    // Check notification permission
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }

    // Load settings
    const loadedSettings = loadNotificationSettings();
    setSettings(loadedSettings);
  }, [connected, router]);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermissionStatus('granted');
      setSettings((prev) => ({ ...prev, enabled: true }));
    } else {
      setPermissionStatus('denied');
    }
  };

  const handleSave = () => {
    saveNotificationSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🔔 Test Notification', {
        body: 'Keepr notifications are working correctly!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }
  };

  if (!connected) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/vaults" className="inline-flex items-center text-sage-600 hover:text-sage-700 mb-2">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Vaults
          </Link>
          <h1 className="text-3xl font-bold text-warm-900">Notification Settings</h1>
          <p className="text-warm-600 mt-2">Manage browser notifications for your vaults</p>
        </div>

        {/* Permission Status */}
        <div className="bg-white rounded-xl border border-warm-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-warm-900 mb-4">Browser Permissions</h2>

          {permissionStatus === 'default' && (
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <p className="text-sm text-warm-700 mb-3">
                  Enable browser notifications to receive alerts about your vaults, including check-in reminders and release notifications.
                </p>
                <button
                  onClick={handleRequestPermission}
                  className="px-4 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-lg font-medium transition-colors"
                >
                  Enable Notifications
                </button>
              </div>
              <svg className="w-12 h-12 text-warm-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          )}

          {permissionStatus === 'granted' && (
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-green-900">Notifications Enabled</span>
                </div>
                <p className="text-sm text-warm-700 mb-3">
                  You will receive browser notifications based on your preferences below.
                </p>
                <button
                  onClick={handleTestNotification}
                  className="px-4 py-2 bg-warm-200 hover:bg-warm-300 text-warm-900 rounded-lg font-medium transition-colors text-sm"
                >
                  Send Test Notification
                </button>
              </div>
              <svg className="w-12 h-12 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          )}

          {permissionStatus === 'denied' && (
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="font-medium text-rose-900">Notifications Blocked</span>
                </div>
                <p className="text-sm text-warm-700">
                  You have blocked notifications for this site. To enable them, please update your browser settings.
                </p>
              </div>
              <svg className="w-12 h-12 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        {permissionStatus === 'granted' && (
          <>
            <div className="bg-white rounded-xl border border-warm-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-warm-900 mb-4">Notification Preferences</h2>

              {/* Master Toggle */}
              <div className="flex items-center justify-between py-3 border-b border-warm-100">
                <div>
                  <p className="font-medium text-warm-900">Enable Notifications</p>
                  <p className="text-xs text-warm-600">Master switch for all notifications</p>
                </div>
                <button
                  onClick={() => setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.enabled ? 'bg-sage-600' : 'bg-warm-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Individual Toggles */}
              <div className={`space-y-3 mt-4 ${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-warm-900">Notification Window</p>
                    <p className="text-xs text-warm-600">Alert when check-in is required</p>
                  </div>
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, notificationWindow: !prev.notificationWindow }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.notificationWindow ? 'bg-sage-600' : 'bg-warm-300'
                    }`}
                    disabled={!settings.enabled}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.notificationWindow ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-warm-900">Grace Period</p>
                    <p className="text-xs text-warm-600">Alert when vault unlocks</p>
                  </div>
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, gracePerio: !prev.gracePerio }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.gracePerio ? 'bg-sage-600' : 'bg-warm-300'
                    }`}
                    disabled={!settings.enabled}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.gracePerio ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-warm-900">Release Ready</p>
                    <p className="text-xs text-warm-600">Alert when vault is ready to release</p>
                  </div>
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, release: !prev.release }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.release ? 'bg-sage-600' : 'bg-warm-300'
                    }`}
                    disabled={!settings.enabled}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.release ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-warm-900">Vault Cancelled</p>
                    <p className="text-xs text-warm-600">Alert when a vault is cancelled</p>
                  </div>
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, cancel: !prev.cancel }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.cancel ? 'bg-sage-600' : 'bg-warm-300'
                    }`}
                    disabled={!settings.enabled}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.cancel ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Check Interval */}
            <div className="bg-white rounded-xl border border-warm-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-warm-900 mb-4">Check Frequency</h2>
              <div className={`${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block mb-2">
                  <span className="text-sm text-warm-700">How often should we check for notifications?</span>
                </label>
                <select
                  value={settings.checkInterval}
                  onChange={(e) => setSettings((prev) => ({ ...prev, checkInterval: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-500"
                  disabled={!settings.enabled}
                >
                  <option value={30}>Every 30 seconds</option>
                  <option value={60}>Every minute</option>
                  <option value={300}>Every 5 minutes</option>
                  <option value={600}>Every 10 minutes</option>
                </select>
                <p className="text-xs text-warm-600 mt-2">
                  More frequent checks provide faster notifications but use more battery
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-3 bg-sage-600 hover:bg-sage-700 text-white rounded-xl font-medium transition-colors"
              >
                Save Settings
              </button>
            </div>

            {saved && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-green-800 text-sm text-center">✓ Settings saved successfully</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
