const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';

const hasImageLikeExtension = (value = '') => /\.[a-z0-9]{2,8}$/i.test(String(value));

const getImageUrl = (url, fallback) => {
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

    if (raw.startsWith('res.cloudinary.com/')) {
        return `https://${raw}`;
    }

    const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const hasSlash = raw.includes('/');
    const looksLikeFilename = !hasSlash && hasImageLikeExtension(raw);
    const looksLikeRootFilename = raw.startsWith('/') && raw.indexOf('/', 1) === -1 && hasImageLikeExtension(raw);

    if (looksLikeFilename) {
        return `${baseUrl}/uploads/${raw}`;
    }

    if (looksLikeRootFilename) {
        return `${baseUrl}/uploads${raw}`;
    }

    if (raw.startsWith('uploads/')) {
        return `${baseUrl}/${raw}`;
    }

    const cleanUrl = raw.startsWith('/') ? raw : `/${raw}`;
    return `${baseUrl}${cleanUrl}`;
};

module.exports = { getImageUrl };
