const hasPersonalContext = (req) => {
    const personalQueryKeys = ['userId', 'accountId', 'currentUserId', 'admin_id'];

    const hasPersonalQuery = personalQueryKeys.some((key) => {
        const value = req.query?.[key];
        return typeof value === 'string' ? value.trim().length > 0 : value !== undefined;
    });

    const hasAuthHeader = Boolean(req.headers?.authorization);
    const hasCookie = Boolean(req.headers?.cookie);

    return hasPersonalQuery || hasAuthHeader || hasCookie;
};

const setNoStore = (res) => {
    res.set('Cache-Control', 'no-store');
};

const setPublicEdgeCache = (res, { sMaxAge = 60, staleWhileRevalidate = 300 } = {}) => {
    // Browser keeps fresh data, CDN absorbs burst traffic.
    const policy = `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
    res.set('Cache-Control', policy);
    res.set('CDN-Cache-Control', policy);
};

const cachePublicGet = (options = {}) => {
    const { shouldBypass } = options;

    return (req, res, next) => {
        if (req.method !== 'GET') return next();

        if (typeof shouldBypass === 'function' && shouldBypass(req)) {
            setNoStore(res);
            return next();
        }

        if (hasPersonalContext(req)) {
            setNoStore(res);
            return next();
        }

        setPublicEdgeCache(res, options);
        return next();
    };
};

module.exports = {
    cachePublicGet,
    setNoStore,
    setPublicEdgeCache
};
