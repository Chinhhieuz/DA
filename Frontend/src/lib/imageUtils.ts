import { API_BASE_URL as BASE_URL } from './api';

/**
 * Chuyển đổi đường dẫn ảnh thành URL đầy đủ.
 * - Nếu ảnh là đường dẫn tương đối (/uploads/...) → ghép với BASE_URL
 * - Nếu ảnh đã là URL tuyệt đối (http/https) → giữ nguyên
 * - Nếu null/undefined → trả về ảnh mặc định
 */
export function getImageUrl(url?: string | null, fallback?: string): string {
  const defaultAvatar = fallback !== undefined ? fallback : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
  
  if (!url || url === 'null' || url === 'undefined' || url === '') {
    return defaultAvatar;
  }

  // Nếu đã là URL đầy đủ (http/https)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Nếu là đường dẫn tương đối
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${BASE_URL}${cleanUrl}`;
}
