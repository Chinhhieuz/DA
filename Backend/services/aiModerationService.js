// Fast hard-block terms for obvious toxic/illegal content in multiple languages.
// Keep this list focused on high-confidence terms to reduce false positives.
const HARD_BLOCKLIST = [
    // Vietnamese
    'dit', 'dm', 'dcm', 'vcl', 'lon', 'cac', 'buoi', 'suc vat', 'cho de',
    'viet tan', 'cach mang mau', 'bieu tinh', 'lat do', 'da dang', 'phan dong', 'bao loan',
    'ca do', 'lo de', 'tin dung den', 'thuoc kich duc', 'ma tuy', 'dap da', 'ke keo',

    // English
    'fuck', 'motherfucker', 'shit', 'asshole', 'bastard', 'bitch', 'pussy', 'dick', 'cock',
    'nigger', 'nigga', 'retard', 'slut', 'whore', 'hooker', 'porn', 'hentai',
    'terrorism', 'isis', 'meth', 'cocaine', 'heroin',

    // Spanish / Portuguese
    'puta', 'puto', 'mierda', 'cojones', 'joder', 'cabron', 'gilipollas', 'zorra',
    'porno', 'drogas', 'terrorismo',

    // French / German / Italian
    'salope', 'encule', 'merde', 'connard', 'pute',
    'scheisse', 'fotze', 'hurensohn', 'porno', 'terrorismus',
    'stronzo', 'troia', 'puttana',

    // Indonesian / Malay / Filipino / Thai translit
    'anjing', 'bangsat', 'kontol', 'memek', 'ngentot', 'goblok',
    'sial', 'bodoh', 'pelacur',

    // Russian/Ukrainian translit
    'blyat', 'suka', 'pidor', 'khuy',

    // Chinese/Japanese/Korean (common explicit/hate cues)
    '操你妈', '傻逼', '妈的', '色情', '毒品', '恐怖主义',
    'くそ', '死ね', 'ポルノ', 'ドラッグ',
    '씨발', '개새끼', '포르노', '마약',

    // Arabic/Hindi common explicit terms
    'كس', 'شرموطة', 'ارهاب', 'مخدرات',
    'हराम', 'अश्लील', 'आतंकवाद', 'नशीली दवाएं'
];

// Terms that are ambiguous without context (education/medical/history/news can be legitimate).
const CONTEXTUAL_BLOCKLIST = [
    'sex', 'sexual', 'porn', 'porno', 'hentai',
    'thuoc kich duc', 'ma tuy', 'dap da', 'ke keo',
    'drug', 'drugs', 'drogas', 'meth', 'cocaine', 'heroin',
    'terrorism', 'terrorismo', 'terrorismus', 'isis'
];

const BENIGN_CONTEXT_HINTS = [
    'giao duc gioi tinh', 'suc khoe sinh san', 'suc khoe tinh duc',
    'sex education', 'sexual health',
    'y te', 'medical', 'medicine', 'doctor', 'benh', 'dieu tri',
    'phong ngua', 'phong tranh', 'prevention', 'awareness',
    'lich su', 'historical', 'history',
    'nghien cuu', 'research', 'hoc tap', 'education', 'bai giang', 'tai lieu hoc',
    'bao chi', 'journalism', 'news', 'documentary',
    'phap ly', 'legal', 'luat', 'case study'
];

const RAW_UNSAFE_INTENT_PATTERNS = [
    /\b(xem|coi|watch|find|download|tim)\b.{0,24}\b(porn|porno|hentai|sex|xxx|18\+)\b/iu,
    /\b(clip|video|anh|image)\b.{0,18}\b(porn|porno|hentai|sex|xxx|18\+)\b/iu,
    /\b(mua|ban|buy|sell|ship)\b.{0,24}\b(ma tuy|dap da|ke keo|drug|drugs|meth|cocaine|heroin)\b/iu,
    /\b(tham gia|join|support|ung ho)\b.{0,24}\b(isis|terrorism|terrorismo|terrorismus)\b/iu
];

const COMPACT_UNSAFE_INTENT_PATTERNS = [
    /xemporn/,
    /watchporn/,
    /downloadporn/,
    /buydrugs/,
    /selldrugs/,
    /joinisis/
];

function parseExtraBlocklist(raw) {
    return String(raw || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseNumberEnv(value, fallback) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
}

function parseRemoteBlocklistUrls(raw) {
    return String(raw || '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => /^https?:\/\//i.test(item));
}

const VIDEO_FRAME_SECONDS = [0, 1, 3, 5, 8];
const MAX_VIDEO_FRAMES_TOTAL = 10;
const REMOTE_REFRESH_MS = parseNumberEnv(process.env.AI_MODERATION_REMOTE_REFRESH_MS, 6 * 60 * 60 * 1000);
const REMOTE_FETCH_TIMEOUT_MS = parseNumberEnv(process.env.AI_MODERATION_REMOTE_TIMEOUT_MS, 2500);
const REMOTE_MAX_TERMS = parseNumberEnv(process.env.AI_MODERATION_REMOTE_MAX_TERMS, 5000);
const REMOTE_MAX_TERM_LENGTH = parseNumberEnv(process.env.AI_MODERATION_REMOTE_MAX_TERM_LENGTH, 80);
const MEDIA_FETCH_TIMEOUT_MS = parseNumberEnv(process.env.AI_MODERATION_MEDIA_FETCH_TIMEOUT_MS, 6500);
const MODEL_RETRY_ATTEMPTS = Math.max(1, parseNumberEnv(process.env.AI_MODERATION_MODEL_RETRY_ATTEMPTS, 2));
const MODEL_RETRY_BASE_DELAY_MS = parseNumberEnv(process.env.AI_MODERATION_MODEL_RETRY_BASE_DELAY_MS, 800);
const MIN_COMPACT_TERM_MATCH_LENGTH = parseNumberEnv(process.env.AI_MODERATION_MIN_COMPACT_TERM_MATCH_LENGTH, 5);

const LEET_CHAR_MAP = {
    '0': 'o',
    '1': 'i',
    '2': 'z',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '6': 'g',
    '7': 't',
    '8': 'b',
    '9': 'g',
    '@': 'a',
    '$': 's',
    '!': 'i',
    '|': 'i'
};

// Extra high-confidence insult patterns not fully covered by simple term lists.
const RAW_BLOCK_PATTERNS = [
    /\bcon\s*m[eẹ]\b/iu,
    /\bth[aă]ng\s*lol\b/iu,
    /\blol\s+vcl\b/iu
];

const COMPACT_BLOCK_PATTERNS = [
    /conme/,
    /thanglol/,
    /dmmay/,
    /conchode/
];

function ensureArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function normalizeCloudinaryUrl(url) {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http://res.cloudinary.com')) return url.replace('http://', 'https://');
    return url;
}

function normalizeForMatch(input) {
    const text = String(input || '').toLowerCase().normalize('NFKC');
    const mapped = [...text].map((ch) => LEET_CHAR_MAP[ch] || ch).join('');

    // Remove accents/diacritics while keeping base letters.
    const withoutMarks = mapped.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Remove separators/punctuation for obfuscation-resistant matching.
    return withoutMarks.replace(/[\s.\-_*|,@"'`~:;()[\]{}?!+=\\/]+/g, '');
}

function normalizeForTokenMatch(input) {
    const text = String(input || '').toLowerCase().normalize('NFKC');
    const mapped = [...text].map((ch) => LEET_CHAR_MAP[ch] || ch).join('');
    const withoutMarks = mapped.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return withoutMarks
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

function escapeRegex(input) {
    return String(input || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSearchVariants(title, content) {
    const source = `${title || ''} ${content || ''}`.trim();
    const rawLower = source.toLowerCase();
    const nfkc = rawLower.normalize('NFKC');
    const withoutMarks = nfkc.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tokenized = normalizeForTokenMatch(source);
    const compact = normalizeForMatch(source);
    const textVariants = [...new Set([
        normalizeForTokenMatch(rawLower),
        normalizeForTokenMatch(nfkc),
        normalizeForTokenMatch(withoutMarks),
        tokenized
    ].filter(Boolean))];
    return { textVariants, compact };
}

function toBlockTerm(term, minCompactLength = 2) {
    const raw = String(term || '').trim().toLowerCase();
    if (!raw || raw.length > REMOTE_MAX_TERM_LENGTH) return null;

    const tokenized = normalizeForTokenMatch(raw);
    const compact = normalizeForMatch(raw);
    if (!compact || compact.length < minCompactLength) return null;
    return { raw, compact, tokenized };
}

function buildBlockTerms(terms, minCompactLength = 2) {
    return [...new Set(terms.map((term) => String(term || '').trim()).filter(Boolean))]
        .map((term) => toBlockTerm(term, minCompactLength))
        .filter(Boolean);
}

function buildExcludedCompactSet(terms) {
    const blockedTerms = buildBlockTerms(terms, 2);
    return new Set(
        blockedTerms
            .map((term) => term.compact)
            .filter(Boolean)
    );
}

const BLOCKLIST_EXCLUDED_COMPACTS = buildExcludedCompactSet([
    // Guardrail against known false-positive in Vietnamese educational text: "Giai đoạn".
    'giai',
    // "cac" is highly ambiguous in Vietnamese after diacritic stripping (e.g. "các").
    'cac',
    ...parseExtraBlocklist(process.env.AI_MODERATION_EXCLUDED_TERMS)
]);

const BASE_BLOCK_TERMS = buildBlockTerms([
    ...HARD_BLOCKLIST,
    ...parseExtraBlocklist(process.env.AI_MODERATION_EXTRA_BLOCKLIST)
], 2);
const CONTEXTUAL_BLOCK_TERMS = buildBlockTerms(CONTEXTUAL_BLOCKLIST, 2);
const CONTEXTUAL_BLOCK_TERM_COMPACTS = new Set(
    CONTEXTUAL_BLOCK_TERMS
        .map((term) => term.compact)
        .filter(Boolean)
);
const BENIGN_CONTEXT_TERMS = buildBlockTerms(BENIGN_CONTEXT_HINTS, 3);

let remoteBlockTerms = [];
let remoteBlocklistRefreshingPromise = null;
let remoteBlocklistLastRefreshAt = 0;

function parseRemoteBlocklistPayload(text) {
    const raw = String(text || '').trim();
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') {
            const maybeList = parsed.terms || parsed.blocklist || parsed.words;
            if (Array.isArray(maybeList)) return maybeList;
        }
    } catch (_) {
        // Not JSON, continue with plain text parser.
    }

    return raw
        .split(/\r?\n|,/g)
        .map((item) => item.trim())
        .filter(Boolean);
}

async function fetchTextWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } finally {
        clearTimeout(timer);
    }
}

async function refreshRemoteBlockTerms(force = false) {
    const urls = parseRemoteBlocklistUrls(process.env.AI_MODERATION_BLOCKLIST_URLS);
    if (urls.length === 0) {
        remoteBlockTerms = [];
        remoteBlocklistLastRefreshAt = Date.now();
        return;
    }

    const now = Date.now();
    if (!force && now - remoteBlocklistLastRefreshAt < REMOTE_REFRESH_MS) return;
    if (remoteBlocklistRefreshingPromise) return remoteBlocklistRefreshingPromise;

    remoteBlocklistRefreshingPromise = (async () => {
        try {
            const fetchedTerms = [];
            const results = await Promise.all(urls.map(async (url) => {
                try {
                    const payloadText = await fetchTextWithTimeout(url, REMOTE_FETCH_TIMEOUT_MS);
                    return parseRemoteBlocklistPayload(payloadText);
                } catch (error) {
                    console.warn(`[AI Moderation] Remote blocklist fetch failed (${url}): ${error.message}`);
                    return [];
                }
            }));

            for (const terms of results) {
                fetchedTerms.push(...terms);
            }

            const capped = fetchedTerms.slice(0, REMOTE_MAX_TERMS);
            // Remote lists can contain noisy short tokens; require >=4 chars after normalization.
            remoteBlockTerms = buildBlockTerms(capped, 4);
            remoteBlocklistLastRefreshAt = Date.now();
            console.log(`[AI Moderation] Remote blocklist refreshed: ${remoteBlockTerms.length} terms`);
        } catch (error) {
            console.warn('[AI Moderation] Remote blocklist refresh failed:', error.message);
            remoteBlocklistLastRefreshAt = Date.now();
        }
    })();

    try {
        await remoteBlocklistRefreshingPromise;
    } finally {
        remoteBlocklistRefreshingPromise = null;
    }
}

function getActiveBlockTerms() {
    if (!remoteBlockTerms.length) return BASE_BLOCK_TERMS;
    return [...BASE_BLOCK_TERMS, ...remoteBlockTerms];
}

function hasCjkLikeScript(term) {
    return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(String(term || ''));
}

function hasWholeTermMatch(term, textVariants) {
    const normalizedTerm = normalizeForTokenMatch(term);
    if (!normalizedTerm) return false;

    if (hasCjkLikeScript(normalizedTerm)) {
        return textVariants.some((sample) => sample.includes(normalizedTerm));
    }

    const pattern = new RegExp(
        `(^|[^\\p{L}\\p{N}])${escapeRegex(normalizedTerm)}([^\\p{L}\\p{N}]|$)`,
        'iu'
    );
    return textVariants.some((sample) => pattern.test(sample));
}

function findTermInVariants(terms, variants, options = {}) {
    const skipCompacts = options.skipCompacts instanceof Set ? options.skipCompacts : null;
    const textVariants = Array.isArray(variants?.textVariants) ? variants.textVariants : [];
    const compactText = typeof variants?.compact === 'string' ? variants.compact : '';

    for (const term of terms) {
        if (!term.raw && !term.compact) continue;
        if (term.compact && BLOCKLIST_EXCLUDED_COMPACTS.has(term.compact)) continue;
        if (skipCompacts && term.compact && skipCompacts.has(term.compact)) continue;

        const rawMatched = term.raw ? hasWholeTermMatch(term.raw, textVariants) : false;
        const compactMatched = Boolean(
            term.compact
            && compactText
            && term.compact.length >= MIN_COMPACT_TERM_MATCH_LENGTH
            && compactText.includes(term.compact)
        );
        const matched = rawMatched || compactMatched;

        if (matched) return term.raw || term.compact;
    }
    return '';
}

function findBlockedTerm(title, content) {
    const variants = buildSearchVariants(title, content);
    const terms = getActiveBlockTerms();
    return findTermInVariants(terms, variants, { skipCompacts: CONTEXTUAL_BLOCK_TERM_COMPACTS });
}

function findContextualTerm(title, content) {
    const variants = buildSearchVariants(title, content);
    return findTermInVariants(CONTEXTUAL_BLOCK_TERMS, variants);
}

function hasBenignContext(title, content) {
    const variants = buildSearchVariants(title, content);
    return Boolean(findTermInVariants(BENIGN_CONTEXT_TERMS, variants));
}

function hasUnsafeIntentSignals(title, content) {
    const raw = `${title || ''} ${content || ''}`.toLowerCase().normalize('NFKC');
    const compact = normalizeForMatch(raw);

    for (const pattern of RAW_UNSAFE_INTENT_PATTERNS) {
        if (pattern.test(raw)) return true;
    }
    for (const pattern of COMPACT_UNSAFE_INTENT_PATTERNS) {
        if (pattern.test(compact)) return true;
    }
    return false;
}

function findBlockedPattern(title, content) {
    const raw = `${title || ''} ${content || ''}`.toLowerCase().normalize('NFKC');
    const compact = normalizeForMatch(raw);

    for (const pattern of RAW_BLOCK_PATTERNS) {
        if (pattern.test(raw)) return pattern.toString();
    }
    for (const pattern of COMPACT_BLOCK_PATTERNS) {
        if (pattern.test(compact)) return pattern.toString();
    }
    return '';
}

function detectLikelyScripts(text) {
    const input = String(text || '');
    const scripts = [];

    if (/[\u4E00-\u9FFF]/.test(input)) scripts.push('Chinese');
    if (/[\u3040-\u30FF]/.test(input)) scripts.push('Japanese');
    if (/[\uAC00-\uD7AF]/.test(input)) scripts.push('Korean');
    if (/[\u0400-\u04FF]/.test(input)) scripts.push('Cyrillic');
    if (/[\u0600-\u06FF]/.test(input)) scripts.push('Arabic');
    if (/[\u0900-\u097F]/.test(input)) scripts.push('Devanagari');
    if (/[\u0E00-\u0E7F]/.test(input)) scripts.push('Thai');
    if (/[a-z]/i.test(input)) scripts.push('Latin');

    return scripts;
}

function normalizeImageMimeType(mimeType = 'image/jpeg') {
    const normalized = String(mimeType || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
    if (!normalized.startsWith('image/')) return 'image/jpeg';
    return normalized;
}

function isImageInputItem(item) {
    if (Buffer.isBuffer(item)) return item.length > 0;
    if (typeof item === 'string') return item.trim().length > 0;
    if (!item || typeof item !== 'object') return false;
    if (Buffer.isBuffer(item.buffer) && item.buffer.length > 0) return true;
    if (typeof item.url === 'string' && item.url.trim().length > 0) return true;
    return false;
}

function normalizeImageInputItem(item) {
    if (Buffer.isBuffer(item)) {
        return { buffer: item, mimeType: 'image/jpeg', url: '' };
    }

    if (typeof item === 'string') {
        const url = item.trim();
        return url ? { buffer: null, mimeType: '', url } : null;
    }

    if (!item || typeof item !== 'object') return null;

    const buffer = Buffer.isBuffer(item.buffer) ? item.buffer : null;
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    const mimeType = normalizeImageMimeType(item.mimeType || item.mimetype || 'image/jpeg');

    if (!buffer && !url) return null;
    return { buffer, mimeType, url };
}

function bufferToGenerativePart(buffer, mimeType = 'image/jpeg') {
    return {
        inlineData: { data: buffer.toString('base64'), mimeType: normalizeImageMimeType(mimeType) }
    };
}

async function fetchImageToGenerativePart(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MEDIA_FETCH_TIMEOUT_MS);
    try {
        if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
        const safeUrl = normalizeCloudinaryUrl(url);
        const response = await fetch(safeUrl, { signal: controller.signal });
        if (!response.ok) return null;

        const rawMimeType = String(response.headers.get('content-type') || '')
            .split(';')[0]
            .trim()
            .toLowerCase();
        if (rawMimeType && !rawMimeType.startsWith('image/')) {
            console.warn(`[AI Moderation] Skip non-image media from URL: ${safeUrl}`);
            return null;
        }
        const mimeType = normalizeImageMimeType(rawMimeType || 'image/jpeg');

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return bufferToGenerativePart(buffer, mimeType);
    } catch (error) {
        console.error('[AI Moderation] Failed to fetch image/frame:', error.message);
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function resolveImageInputToGenerativePart(item) {
    const normalized = normalizeImageInputItem(item);
    if (!normalized) return null;

    if (normalized.buffer) {
        return bufferToGenerativePart(normalized.buffer, normalized.mimeType);
    }

    if (normalized.url) {
        return fetchImageToGenerativePart(normalized.url);
    }

    return null;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function buildModerationModelCandidates() {
    const preferred = String(process.env.GEMINI_MODERATION_MODEL || 'gemini-2.0-flash').trim();
    const fallbackModels = String(
        process.env.GEMINI_MODERATION_FALLBACK_MODELS || 'gemini-2.5-flash,gemini-2.0-flash,gemini-1.5-flash,gemini-1.5-flash-8b'
    )
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);

    return [...new Set([preferred, ...fallbackModels].filter(Boolean))];
}

function isModelUnavailableError(error) {
    const lower = String(error?.message || '').toLowerCase();
    if (!lower) return false;

    if (lower.includes('404')) return true;
    if (!lower.includes('model')) return false;
    return (
        lower.includes('not found')
        || lower.includes('not available')
        || lower.includes('unsupported')
        || lower.includes('permission')
    );
}

function isResponseMimeUnsupportedError(error) {
    const lower = String(error?.message || '').toLowerCase();
    return (
        lower.includes('responsemimetype')
        || lower.includes('response mime type')
        || (lower.includes('application/json') && lower.includes('unsupported'))
    );
}

function buildModelConfig(modelName, useJsonResponse = true) {
    const generationConfig = {
        temperature: 0.1,
        maxOutputTokens: 1024
    };

    if (useJsonResponse) {
        generationConfig.responseMimeType = 'application/json';
    }

    return { model: modelName, generationConfig };
}

function isTransientProviderError(error) {
    const code = classifyProviderError(error)?.code;
    return (
        code === 'provider_overload'
        || code === 'provider_timeout'
        || code === 'provider_network_error'
    );
}

async function generateContentWithModelRetries(genAI, modelName, payload, useJsonResponse = true) {
    let lastError = null;
    for (let attempt = 1; attempt <= MODEL_RETRY_ATTEMPTS; attempt += 1) {
        try {
            const model = genAI.getGenerativeModel(buildModelConfig(modelName, useJsonResponse));
            return await model.generateContent(payload);
        } catch (error) {
            lastError = error;
            const shouldRetry = isTransientProviderError(error) && attempt < MODEL_RETRY_ATTEMPTS;
            if (!shouldRetry) throw error;

            const delayMs = MODEL_RETRY_BASE_DELAY_MS * attempt;
            console.warn(
                `[AI Moderation] ${modelName} transient failure (attempt ${attempt}/${MODEL_RETRY_ATTEMPTS}), retry in ${delayMs}ms: ${error.message}`
            );
            await sleep(delayMs);
        }
    }

    throw lastError || new Error(`Model ${modelName} failed without detailed error`);
}

async function generateModerationContentWithFallbackModels(genAI, modelCandidates, payload) {
    let lastError = null;

    for (const modelName of modelCandidates) {
        try {
            return await generateContentWithModelRetries(genAI, modelName, payload, true);
        } catch (error) {
            // Retry same model without responseMimeType for older/limited endpoints.
            if (isResponseMimeUnsupportedError(error)) {
                try {
                    return await generateContentWithModelRetries(genAI, modelName, payload, false);
                } catch (retryError) {
                    lastError = retryError;
                    console.warn(`[AI Moderation] Model ${modelName} retry failed: ${retryError.message}`);
                    if (!isModelUnavailableError(retryError) && !isTransientProviderError(retryError)) throw retryError;
                    continue;
                }
            }

            lastError = error;
            console.warn(`[AI Moderation] Model ${modelName} failed: ${error.message}`);
            if (!isModelUnavailableError(error) && !isTransientProviderError(error)) throw error;
        }
    }

    throw lastError || new Error('Khong tim duoc model moderation kha dung');
}

function buildVideoFrameUrls(videoUrl) {
    const safeUrl = normalizeCloudinaryUrl(videoUrl);
    if (!safeUrl || !safeUrl.includes('/video/upload/')) return [];

    const [prefix, afterUpload] = safeUrl.split('/video/upload/');
    if (!prefix || !afterUpload) return [];

    const [pathNoQuery, query = ''] = afterUpload.split('?');
    const querySuffix = query ? `?${query}` : '';
    return VIDEO_FRAME_SECONDS.map((sec) => (
        `${prefix}/video/upload/so_${sec},du_0.1,f_jpg/${pathNoQuery}${querySuffix}`
    ));
}

function extractVideoFrameUrls(videoUrls) {
    const urls = ensureArray(videoUrls).filter((item) => typeof item === 'string' && item);
    const allFrames = [];
    for (const url of urls) {
        allFrames.push(...buildVideoFrameUrls(url));
    }
    return [...new Set(allFrames)].slice(0, MAX_VIDEO_FRAMES_TOTAL);
}

function parseJsonFromModelText(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;

    const candidates = [
        raw,
        raw.replace(/^```json\s*|\s*```$/g, '').trim()
    ];

    const objectLike = raw.match(/\{[\s\S]*\}/);
    if (objectLike && objectLike[0]) {
        candidates.push(objectLike[0].trim());
    }

    for (const candidate of candidates) {
        if (!candidate) continue;
        try {
            return JSON.parse(candidate);
        } catch (_) {
            // try next candidate
        }
    }

    return null;
}

function normalizeStatus(value) {
    const status = String(value || '').trim().toUpperCase();
    if (['REJECT', 'BLOCK', 'UNSAFE', 'DENY', 'FAIL', 'FLAG', 'FLAGGED', 'REVIEW'].includes(status)) {
        return 'REJECT';
    }
    if (['PASS', 'APPROVE', 'APPROVED', 'ALLOW', 'SAFE'].includes(status)) {
        return 'PASS';
    }
    // Fail-closed: unknown status must not auto-pass.
    return 'REJECT';
}

function toStringArray(value) {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => String(item || '').trim())
        .filter(Boolean);
}

const GRAPHIC_MEDIA_KEYWORDS = [
    'violence', 'violent', 'graphic violence', 'gore', 'gory',
    'blood', 'bloody', 'bleeding', 'injury', 'wound', 'corpse', 'dead body',
    'dismember', 'dismemberment', 'decapitation', 'beheading', 'mutilation', 'gruesome',
    'bao luc', 'mau me', 'dam mau', 'chay mau', 'thi the', 'xac chet', 'chan thuong', 'cat lia'
];

const MEDIA_ISSUE_TRANSLATIONS = [
    {
        keywords: ['blood', 'bloody', 'bleeding', 'mau me', 'dam mau', 'chay mau'],
        label: 'co mau/chay mau ro rang'
    },
    {
        keywords: ['gore', 'gory', 'graphic violence', 'gruesome'],
        label: 'bao luc do hoa (gore)'
    },
    {
        keywords: ['injury', 'wound', 'chan thuong'],
        label: 'co vet thuong nghiem trong'
    },
    {
        keywords: ['corpse', 'dead body', 'thi the', 'xac chet'],
        label: 'xuat hien thi the/xac chet'
    },
    {
        keywords: ['dismember', 'dismemberment', 'beheading', 'decapitation', 'mutilation', 'cat lia'],
        label: 'co hinh anh cat lia/tat roi bo phan co the'
    },
    {
        keywords: ['violence', 'violent', 'bao luc'],
        label: 'co hanh vi bao luc'
    }
];

function normalizeEvidenceText(input) {
    return String(input || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function containsGraphicMediaKeyword(input) {
    const text = normalizeEvidenceText(input);
    if (!text) return false;
    return GRAPHIC_MEDIA_KEYWORDS.some((keyword) => text.includes(normalizeEvidenceText(keyword)));
}

function hasGraphicMediaViolation(parsed) {
    const labels = toStringArray(parsed?.categories || parsed?.violations || parsed?.labels);
    const findings = toStringArray(parsed?.media_findings || parsed?.evidence || parsed?.findings);
    const reason = String(parsed?.reason || '').trim();

    return labels.some(containsGraphicMediaKeyword)
        || findings.some(containsGraphicMediaKeyword)
        || containsGraphicMediaKeyword(reason);
}

function summarizeMediaIssue(parsed) {
    const categories = toStringArray(parsed?.categories || parsed?.violations || parsed?.labels);
    const findings = toStringArray(parsed?.media_findings || parsed?.evidence || parsed?.findings);
    const reason = String(parsed?.reason || '').trim();
    const evidence = [...categories, ...findings, reason].filter(Boolean);
    if (!evidence.length) return '';

    const normalizedEvidence = evidence.map((item) => normalizeEvidenceText(item));
    const translated = [];

    for (const group of MEDIA_ISSUE_TRANSLATIONS) {
        const hasHit = group.keywords.some((keyword) => {
            const normalizedKeyword = normalizeEvidenceText(keyword);
            return normalizedEvidence.some((sample) => sample.includes(normalizedKeyword));
        });
        if (hasHit) translated.push(group.label);
    }

    const uniqueTranslated = [...new Set(translated)].slice(0, 3);
    if (uniqueTranslated.length) return uniqueTranslated.join(', ');

    const conciseFinding = findings.slice(0, 2).join('; ');
    if (conciseFinding) return conciseFinding;

    return '';
}

function buildDetailedRejectReason(parsedReason, parsed) {
    const baseReason = String(parsedReason || '').trim() || 'Vi pham chinh sach cong dong';
    const categories = toStringArray(parsed?.categories || parsed?.violations || parsed?.labels).slice(0, 3);
    const findings = toStringArray(parsed?.media_findings || parsed?.evidence || parsed?.findings).slice(0, 2);
    const mediaIssueSummary = summarizeMediaIssue(parsed);

    const parts = [];
    if (mediaIssueSummary) parts.push(`Loi anh/video: ${mediaIssueSummary}`);
    if (categories.length) parts.push(`Nhom: ${categories.join(', ')}`);
    if (findings.length) parts.push(`Bang chung: ${findings.join(', ')}`);
    if (!parts.length) return baseReason;

    const detail = parts.join(' | ');
    const merged = `${baseReason} (${detail})`;
    return merged.length > 260 ? `${merged.slice(0, 257)}...` : merged;
}

function classifyProviderError(error) {
    const message = String(error?.message || '').trim();
    const lower = message.toLowerCase();

    if (lower.includes('429') || lower.includes('quota') || lower.includes('rate limit')) {
        return {
            code: 'provider_overload',
            summary: 'vuot quota hoac rate-limit tu nha cung cap AI',
            raw: message
        };
    }

    if (
        lower.includes('timeout')
        || lower.includes('timed out')
        || lower.includes('deadline')
        || lower.includes('etimedout')
        || lower.includes('aborted')
        || lower.includes('aborterror')
    ) {
        return {
            code: 'provider_timeout',
            summary: 'het thoi gian cho ket noi/phan hoi tu AI provider',
            raw: message
        };
    }

    if (
        lower.includes('fetch failed')
        || lower.includes('network')
        || lower.includes('socket')
        || lower.includes('dns')
        || lower.includes('econnreset')
        || lower.includes('enotfound')
    ) {
        return {
            code: 'provider_network_error',
            summary: 'loi mang khi goi AI provider',
            raw: message
        };
    }

    if (
        lower.includes('401')
        || lower.includes('403')
        || lower.includes('unauthorized')
        || lower.includes('permission')
        || lower.includes('api key')
        || lower.includes('invalid key')
    ) {
        return {
            code: 'provider_auth_error',
            summary: 'sai API key hoac khong du quyen goi model moderation',
            raw: message
        };
    }

    if (
        lower.includes('model')
        && (
            lower.includes('404')
            || lower.includes('not found')
            || lower.includes('not available')
            || lower.includes('unsupported')
        )
    ) {
        return {
            code: 'provider_model_error',
            summary: 'model moderation khong kha dung tren API key hien tai',
            raw: message
        };
    }

    return {
        code: 'provider_unknown_error',
        summary: 'loi he thong AI khong xac dinh',
        raw: message
    };
}

function buildProviderFailureReason(prefix, classified, counts = {}) {
    const basePrefix = String(prefix || 'AI khong the kiem duyet tu dong').trim();
    const summary = String(classified?.summary || 'loi he thong AI').trim();
    const raw = String(classified?.raw || '').trim().replace(/\s+/g, ' ');
    const clippedRaw = raw ? raw.slice(0, 120) : '';
    const exposeProviderRaw = String(process.env.AI_MODERATION_EXPOSE_PROVIDER_ERROR || '').trim().toLowerCase() === 'true';
    const img = Number.isFinite(Number(counts.image)) ? Number(counts.image) : 0;
    const vid = Number.isFinite(Number(counts.video)) ? Number(counts.video) : 0;
    const mediaReadable = Number.isFinite(Number(counts.mediaReadable)) ? Number(counts.mediaReadable) : -1;
    const mediaTotal = Number.isFinite(Number(counts.mediaTotal)) ? Number(counts.mediaTotal) : 0;

    let reason = `${basePrefix}: ${summary}`;
    if (clippedRaw && exposeProviderRaw) reason += ` | Chi tiet: ${clippedRaw}`;
    if (mediaTotal > 0 && mediaReadable >= 0) {
        reason += ` | Tinh trang media: doc duoc ${mediaReadable}/${mediaTotal} tep, chua phan tich duoc noi dung hinh anh`;
    }
    reason += ` (anh=${img}, video=${vid})`;

    return reason.length > 300 ? `${reason.slice(0, 297)}...` : reason;
}

const checkContent = async (title, content, imageInputs = [], videoInputs = []) => {
    // Background refresh so remote blocklist stays up to date without blocking requests.
    void refreshRemoteBlockTerms(false).catch((error) => {
        console.warn('[AI Moderation] Remote blocklist refresh error:', error.message);
    });

    const hasImageInput = ensureArray(imageInputs).some((item) => isImageInputItem(item));
    const hasVideoInput = ensureArray(videoInputs).some((item) => (
        typeof item === 'string' && item.trim().length > 0
    ));
    const hasMediaInput = hasImageInput || hasVideoInput;
    const imageInputCount = ensureArray(imageInputs).filter((item) => isImageInputItem(item)).length;
    const videoInputCount = ensureArray(videoInputs).filter((item) => (
        typeof item === 'string' && item.trim().length > 0
    )).length;
    const mediaInputCount = imageInputCount + videoInputCount;
    let mediaReadableCount = 0;

    const blockedPattern = findBlockedPattern(title, content);
    if (blockedPattern) {
        console.log(`[AI Moderation] PATTERN HIT: ${blockedPattern}`);
        return { status: 'REJECT', reason: 'Phat hien ngon ngu xuc pham/tho tuc' };
    }

    const blockedTerm = findBlockedTerm(title, content);
    if (blockedTerm) {
        console.log(`[AI Moderation] BLOCKLIST HIT: "${blockedTerm}"`);
        return { status: 'REJECT', reason: `Phat hien tu ngu bi cam: ${blockedTerm}` };
    }

    const contextualTerm = findContextualTerm(title, content);
    const benignContext = contextualTerm ? hasBenignContext(title, content) : false;
    const unsafeIntentSignals = contextualTerm ? hasUnsafeIntentSignals(title, content) : false;
    if (contextualTerm) {
        if (unsafeIntentSignals && !benignContext) {
            console.log(`[AI Moderation] CONTEXTUAL+INTENT HIT: "${contextualTerm}"`);
            return { status: 'REJECT', reason: `Phat hien noi dung nhay cam co dau hieu vi pham: ${contextualTerm}` };
        }

        console.log(
            `[AI Moderation] CONTEXTUAL HIT: "${contextualTerm}" (benignContext=${benignContext}, unsafeIntent=${unsafeIntentSignals}) -> defer to AI model`
        );
    }

    try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            if (hasMediaInput) {
                return { status: 'REJECT', reason: 'Khong the duyet anh/video tu dong - Chuyen Admin duyet thu cong' };
            }
            if (contextualTerm && !benignContext) {
                return { status: 'REJECT', reason: `Phat hien chu de nhay cam can Admin duyet: ${contextualTerm}` };
            }
            return { status: 'PASS', reason: '' };
        }

        const modelCandidates = buildModerationModelCandidates();
        const genAI = new GoogleGenerativeAI(apiKey);

        const frameUrls = extractVideoFrameUrls(videoInputs);
        const rawText = `${title || ''}\n${content || ''}`.trim();
        const scriptHints = detectLikelyScripts(rawText);
        const normalizedTextHint = normalizeForMatch(rawText).slice(0, 1200);

        const prompt = `[MULTILINGUAL CONTENT MODERATION]
You must moderate content in ANY language and mixed-language text.
Supported language families include (not limited to):
Vietnamese, English, Indonesian, Malay, Filipino, Thai, Spanish, Portuguese, French, German,
Russian/Ukrainian, Chinese, Japanese, Korean, Arabic, Hindi.

Rules:
1) Reject if content contains profanity, hate speech, harassment, explicit sexual content, illegal drugs/weapons trafficking, terrorism/extremism, or politically sensitive harmful incitement.
2) Reject any graphic violence content in media: visible blood, gore, serious injury, corpse, dismemberment, beheading, or other gruesome scenes.
3) Detect obfuscation tricks: spaced letters, leetspeak, mixed scripts, symbol substitution.
4) Analyze both text and all media (images + video frames).
5) Return strict JSON only:
{
  "status": "REJECT" | "PASS",
  "reason": "<short Vietnamese reason, empty when PASS. If reject by media, must state what appears in image/video>",
  "categories": ["optional: violence, blood, gore, nudity, hate, drugs, terrorism, harassment, political"],
  "media_findings": ["required when reject by media: concise Vietnamese visual evidence from image/video frame"],
  "languages": ["optional detected languages"]
}
6) If media is the cause of REJECT, include at least one concrete visual cue (e.g., blood, open wound, corpse). Do not keep generic.
7) Do NOT reject solely because of keywords like sex/porn/drugs/terrorism when context is clearly educational, medical, historical, legal, journalistic, or prevention-focused and there is no solicitation/instruction for harm.

Script hints: ${scriptHints.join(', ') || 'Unknown'}
Contextual term hit: ${contextualTerm || 'none'}
Benign context signals: ${benignContext ? 'yes' : 'no'}
Unsafe intent signals: ${unsafeIntentSignals ? 'yes' : 'no'}
Text (original):
${rawText || '[EMPTY]'}

Text (normalized anti-obfuscation hint):
${normalizedTextHint || '[EMPTY]'}

Video frames count: ${frameUrls.length}
Return JSON only.`;

        const contentsParts = [{ text: prompt }];
        const mediaPromises = [];

        for (const input of ensureArray(imageInputs)) {
            mediaPromises.push(resolveImageInputToGenerativePart(input));
        }

        for (const frameUrl of frameUrls) {
            mediaPromises.push(fetchImageToGenerativePart(frameUrl));
        }

        if (mediaPromises.length > 0) {
            const mediaParts = await Promise.all(mediaPromises);
            let mediaPartCount = 0;
            for (const part of mediaParts) {
                if (part) {
                    contentsParts.push(part);
                    mediaPartCount += 1;
                }
            }
            mediaReadableCount = mediaInputCount > 0
                ? Math.min(mediaInputCount, mediaPartCount)
                : 0;

            if (hasMediaInput && mediaPartCount === 0) {
                return {
                    status: 'REJECT',
                    reason: `Khong doc duoc noi dung anh/video de kiem duyet (co the URL anh loi, media private, hoac dinh dang khong ho tro) (anh=${imageInputCount}, video=${videoInputCount})`
                };
            }
        }

        const result = await generateModerationContentWithFallbackModels(genAI, modelCandidates, {
            contents: [{ role: 'user', parts: contentsParts }]
        });

        const parsed = parseJsonFromModelText(result.response.text());
        if (!parsed) {
            console.warn('[AI Moderation] Invalid JSON output from model');
            return {
                status: 'REJECT',
                reason: 'AI tra ve du lieu khong hop le (JSON loi) - Chuyen Admin duyet thu cong'
            };
        }

        const finalStatus = normalizeStatus(parsed.status);
        const finalReason = typeof parsed.reason === 'string' ? parsed.reason.trim() : '';

        if (hasGraphicMediaViolation(parsed)) {
            const graphicReason = finalReason || 'Phat hien noi dung bao luc/mau me trong anh/video';
            return { status: 'REJECT', reason: buildDetailedRejectReason(graphicReason, parsed) };
        }

        if (finalStatus === 'REJECT') {
            return { status: 'REJECT', reason: buildDetailedRejectReason(finalReason, parsed) };
        }

        return { status: 'PASS', reason: '' };
    } catch (error) {
        console.error('[AI Moderation] System error:', error.message);
        const classified = classifyProviderError(error);

        // Text-only fallback: local block rules were already checked before AI call.
        // Do not block publishing because of provider/runtime failures.
        if (!hasMediaInput) {
            console.warn(
                '[AI Moderation] Text-only fallback PASS:',
                buildProviderFailureReason(
                    'AI gap su co - Dang dung bo loc noi bo',
                    classified,
                    {
                        image: imageInputCount,
                        video: videoInputCount,
                        mediaReadable: mediaReadableCount,
                        mediaTotal: mediaInputCount
                    }
                )
            );
            return { status: 'PASS', reason: '' };
        }

        if (classified.code === 'provider_overload') {
            // For media posts, fail-safe to manual review when provider is unavailable.
            return {
                status: 'REJECT',
                reason: buildProviderFailureReason(
                    'AI tam qua tai',
                    classified,
                    {
                        image: imageInputCount,
                        video: videoInputCount,
                        mediaReadable: mediaReadableCount,
                        mediaTotal: mediaInputCount
                    }
                )
            };
        }

        return {
            status: 'REJECT',
            reason: buildProviderFailureReason(
                'AI gap su co',
                classified,
                {
                    image: imageInputCount,
                    video: videoInputCount,
                    mediaReadable: mediaReadableCount,
                    mediaTotal: mediaInputCount
                }
            )
        };
    }
};

// Warm up remote blocklist once at service load.
void refreshRemoteBlockTerms(true).catch((error) => {
    console.warn('[AI Moderation] Initial remote blocklist load failed:', error.message);
});

module.exports = { checkContent };
