const getImageUrl = (url, fallback) => {
    const defaultAvatar = fallback || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
    if (!url || url === 'null' || url === 'undefined' || url === '') {
        return defaultAvatar;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    return `${baseUrl}${cleanUrl}`;
};

module.exports = { getImageUrl };
