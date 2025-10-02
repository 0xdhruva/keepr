/**
 * Local storage helpers for non-critical metadata
 */

export interface Profile {
  wallet: string;
  displayName?: string;
  createdAt: number;
  lastSeen: number;
}

export interface AddressLabel {
  address: string;
  label: string;
}

export interface VaultMeta {
  vaultPda: string;
  name: string;
  createdAt: number;
  lastRefreshed: number;
  unlockUnix: number;
  amountLocked: number;
  beneficiary: string;
  creator: string;
  released?: boolean;
}

export interface ActivityLogEntry {
  vaultPda: string;
  type: 'created' | 'deposited' | 'released';
  timestamp: number;
  signature?: string;
  amount?: number;
}

const STORAGE_KEYS = {
  PROFILE: 'keepr.profile',
  LABELS: 'keepr.labels',
  VAULT_CACHE: 'keepr.vaultCache',
  ACTIVITY_LOG: 'keepr.activityLog',
} as const;

// Profile
export function getProfile(wallet: string): Profile | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!data) return null;
    
    const profile = JSON.parse(data) as Profile;
    if (profile.wallet === wallet) {
      return profile;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error('Failed to save profile:', error);
  }
}

export function updateLastSeen(wallet: string): void {
  const profile = getProfile(wallet);
  if (profile) {
    profile.lastSeen = Date.now();
    saveProfile(profile);
  } else {
    saveProfile({
      wallet,
      createdAt: Date.now(),
      lastSeen: Date.now(),
    });
  }
}

// Labels
export function getLabels(): AddressLabel[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LABELS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveLabel(address: string, label: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const labels = getLabels();
    const existing = labels.findIndex(l => l.address === address);
    
    if (existing >= 0) {
      labels[existing].label = label;
    } else {
      labels.push({ address, label });
    }
    
    localStorage.setItem(STORAGE_KEYS.LABELS, JSON.stringify(labels));
  } catch (error) {
    console.error('Failed to save label:', error);
  }
}

export function getLabel(address: string): string | null {
  const labels = getLabels();
  const found = labels.find(l => l.address === address);
  return found?.label || null;
}

// Vault Cache
export function getVaultCache(): VaultMeta[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEYS.VAULT_CACHE);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveVaultMeta(meta: VaultMeta): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cache = getVaultCache();
    const existing = cache.findIndex(v => v.vaultPda === meta.vaultPda);
    
    if (existing >= 0) {
      cache[existing] = meta;
    } else {
      cache.push(meta);
    }
    
    localStorage.setItem(STORAGE_KEYS.VAULT_CACHE, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to save vault meta:', error);
  }
}

export function getVaultMeta(vaultPda: string): VaultMeta | null {
  const cache = getVaultCache();
  return cache.find(v => v.vaultPda === vaultPda) || null;
}

// Activity Log
export function getActivityLog(vaultPda?: string): ActivityLogEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG);
    const log: ActivityLogEntry[] = data ? JSON.parse(data) : [];
    
    if (vaultPda) {
      return log.filter(entry => entry.vaultPda === vaultPda);
    }
    
    return log;
  } catch {
    return [];
  }
}

export function addActivityLog(entry: ActivityLogEntry): void {
  if (typeof window === 'undefined') return;
  
  try {
    const log = getActivityLog();
    log.unshift(entry); // Add to beginning
    
    // Keep last 1000 entries
    const trimmed = log.slice(0, 1000);
    
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save activity log:', error);
  }
}
