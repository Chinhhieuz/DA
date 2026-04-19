import { API_BASE_URL as BASE_URL } from './api';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';

const hasImageLikeExtension = (value: string): boolean => {
  return /\.[a-z0-9]{2,8}$/i.test(value);
};

export function getImageUrl(url?: string | null, fallback?: string): string {
  const defaultAvatar = fallback !== undefined ? fallback : DEFAULT_AVATAR;
  if (!url || url === 'null' || url === 'undefined' || url === '') {
    return defaultAvatar;
  }

  const raw = String(url).trim();

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  if (raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  // Legacy cloudinary URLs occasionally persisted without scheme.
  if (raw.startsWith('res.cloudinary.com/')) {
    return `https://${raw}`;
  }

  const hasSlash = raw.includes('/');
  const looksLikeFilename = !hasSlash && hasImageLikeExtension(raw);
  const looksLikeRootFilename = raw.startsWith('/') && raw.indexOf('/', 1) === -1 && hasImageLikeExtension(raw);

  // Legacy local uploads saved as plain filename.
  if (looksLikeFilename) {
    return `${BASE_URL}/uploads/${raw}`;
  }

  if (looksLikeRootFilename) {
    return `${BASE_URL}/uploads${raw}`;
  }

  if (raw.startsWith('uploads/')) {
    return `${BASE_URL}/${raw}`;
  }

  const cleanUrl = raw.startsWith('/') ? raw : `/${raw}`;
  return `${BASE_URL}${cleanUrl}`;
}

export function getOptimizedImageUrl(url?: string | null, fallback?: string, width: number = 800): string {
  const originalUrl = getImageUrl(url, fallback);
  
  if (originalUrl.includes('res.cloudinary.com') && originalUrl.includes('/upload/')) {
    if (originalUrl.includes('/upload/f_auto') || originalUrl.includes('/upload/q_auto')) {
      return originalUrl;
    }
    return originalUrl.replace('/upload/', `/upload/c_limit,w_${width},q_auto,f_auto/`);
  }
  
  return originalUrl;
}

