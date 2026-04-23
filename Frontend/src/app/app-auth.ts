import type { AppUser as User, JwtPayload, UserPreferences, UserRole } from '@/types/user';

export const isAbortError = (error: unknown) => {
  return error instanceof DOMException && error.name === 'AbortError';
};

export const normalizeEntityId = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const maybeOid = record.$oid;
    if (typeof maybeOid === 'string') return maybeOid.trim();
    if (record._id !== undefined && record._id !== value) {
      const nested = normalizeEntityId(record._id);
      if (nested) return nested;
    }
    if (typeof record.id === 'string' || typeof record.id === 'number') {
      const direct = String(record.id).trim();
      if (direct) return direct;
    }
    const toHexString = record.toHexString;
    if (typeof toHexString === 'function') {
      const hex = toHexString();
      if (typeof hex === 'string' && hex.trim()) return hex.trim();
    }
    const toStringFn = record.toString;
    if (typeof toStringFn === 'function') {
      const str = toStringFn.call(record).trim();
      if (str && str !== '[object Object]') return str;
    }
  }

  return '';
};

export const sanitizeEntityId = (value: unknown): string => {
  const normalized = normalizeEntityId(value);
  if (!normalized) return '';

  const lowered = normalized.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null' || normalized === '[object Object]') {
    return '';
  }

  return normalized;
};

export const normalizePreferenceBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true') return true;
    if (lowered === 'false') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return fallback;
};

export const normalizeUserPreferences = (preferences: Partial<UserPreferences> | null | undefined): UserPreferences => ({
  darkMode: normalizePreferenceBoolean(preferences?.darkMode, false),
  pushNotifications: normalizePreferenceBoolean(preferences?.pushNotifications, true),
  commentNotifications: normalizePreferenceBoolean(preferences?.commentNotifications, true)
});

export const defaultUser: User = {
  id: '',
  name: 'Guest User',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
  username: 'guest',
  role: 'user',
  preferences: { darkMode: false, pushNotifications: true, commentNotifications: true },
  savedPosts: []
};

export const readAuthStorageItem = (key: 'token' | 'currentUser') => {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writeAuthStorageItem = (key: 'token' | 'currentUser', value: string) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore storage write failures
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage write failures
  }
};

export const removeAuthStorageItem = (key: 'token' | 'currentUser') => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore storage remove failures
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage remove failures
  }
};

export const parseJwtPayload = (token: string): JwtPayload | null => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as JwtPayload;
  } catch {
    return null;
  }
};

export const isTokenUsable = (token: string | null | undefined): boolean => {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) return false;

  const payload = parseJwtPayload(normalizedToken);
  if (!payload) return false;

  const exp = Number(payload.exp);
  if (Number.isFinite(exp) && exp > 0) {
    return Date.now() < exp * 1000;
  }

  return true;
};

export const readAuthToken = (): string => {
  return String(readAuthStorageItem('token') || '').trim();
};

export const normalizeUserRole = (value: unknown): UserRole => {
  const normalized = String(value || 'user').toLowerCase();
  if (normalized === 'admin' || normalized === 'moderator') return normalized;
  return 'user';
};

export const buildUserFromToken = (token: string): User | null => {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  const accountId = sanitizeEntityId(payload.accountId || payload.id || payload._id || payload.sub);
  if (!accountId) return null;

  return {
    ...defaultUser,
    id: accountId,
    _id: accountId,
    role: normalizeUserRole(payload.role)
  };
};
