const normalizeOrigin = (origin = '') => String(origin || '').trim().replace(/\/+$/, '');

const parseOriginList = (rawValue = '') => {
    return String(rawValue || '')
        .split(',')
        .map((item) => normalizeOrigin(item))
        .filter(Boolean);
};

const localOrigins = [
    'http://localhost:5173',
    'http://localhost:5000'
];

const envOrigins = [
    process.env.FRONTEND_URL,
    ...parseOriginList(process.env.FRONTEND_URLS)
];

const allowedOrigins = new Set(
    [...localOrigins, ...envOrigins]
        .map((origin) => normalizeOrigin(origin))
        .filter(Boolean)
);

const allowVercelPreviews = String(process.env.ALLOW_VERCEL_PREVIEWS || '').toLowerCase() === 'true';
const vercelProjectSlug = String(process.env.VERCEL_PROJECT_SLUG || process.env.VERCEL_PROJECT_NAME || '')
    .trim()
    .toLowerCase();

const matchesVercelPreview = (origin) => {
    if (!allowVercelPreviews) return false;

    try {
        const hostname = new URL(origin).hostname.toLowerCase();
        if (!hostname.endsWith('.vercel.app')) return false;

        if (!vercelProjectSlug) return true;

        return hostname === `${vercelProjectSlug}.vercel.app`
            || hostname.startsWith(`${vercelProjectSlug}-`);
    } catch {
        return false;
    }
};

const isLocalDevOrigin = (origin) => {
    try {
        const parsed = new URL(origin);
        const protocol = parsed.protocol.toLowerCase();
        const hostname = parsed.hostname.toLowerCase();

        if (protocol !== 'http:' && protocol !== 'https:') return false;

        return hostname === 'localhost'
            || hostname === '127.0.0.1'
            || hostname === '::1'
            || hostname === '[::1]';
    } catch {
        return false;
    }
};

const isAllowedOrigin = (origin) => {
    if (!origin) return true;

    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOrigins.has(normalizedOrigin)) return true;
    if (isLocalDevOrigin(normalizedOrigin)) return true;

    return matchesVercelPreview(normalizedOrigin);
};

module.exports = {
    isAllowedOrigin
};
