// Global hard blocklist to reject obvious toxic/illegal content fast.
const HARD_BLOCKLIST = [
    'địt', 'djt', 'đjt', 'đ.ị.t', 'đýt', 'mọe', 'đm', 'đ.m', 'đkm', 'dcm', 'vcl', 'vkl', 'clgt', 'cmnr', 'vc', 'lồn', 'l0n', 'cặc', 'c@c', 'buồi', 'đầu buồi', 'súc vật', 'chó đẻ',
    'việt tân', 'cách mạng màu', 'biểu tình', 'lật đổ', 'đa đảng', 'đường lưỡi bò', 'ba que', 'đu càng', 'phản động', 'bạo loạn', 'bất tuân dân sự', 'xuyên tạc',
    'bắc kỳ', 'nam kỳ', 'hoa thanh quế', 'tộc cối', 'tọc cối', 'người rừng', 'mọi miên',
    'cá độ', 'lô đề', 'soi cầu', 'tín dụng đen', 'bốc bát họ', 'thuốc kích dục', 'ma túy', 'đập đá', 'ke kẹo',
    'fuck', 'f*ck', 'motherfucker', 'shit', 'sh*it', 'asshole', 'bastard', 'bitch', 'pussy', 'dick', 'cock',
    'nigger', 'nigga', 'retard', 'slut', 'whore', 'hooker', 'porn', 'sex', 'hentai', 'terrorism', 'isisl'
];

const VIDEO_FRAME_SECONDS = [0, 1, 3, 5, 8];
const MAX_VIDEO_FRAMES_TOTAL = 10;

function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase().replace(/[\s\.\-\_\*\|\,\@\(\)\[\]\{\}\?\!]/g, '');
}

function ensureArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
}

function normalizeCloudinaryUrl(url) {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http://res.cloudinary.com')) return url.replace('http://', 'https://');
    return url;
}

function bufferToGenerativePart(buffer, mimeType = 'image/jpeg') {
    return {
        inlineData: { data: buffer.toString('base64'), mimeType }
    };
}

async function fetchImageToGenerativePart(url) {
    try {
        if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
        const safeUrl = normalizeCloudinaryUrl(url);
        const response = await fetch(safeUrl);
        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        return bufferToGenerativePart(buffer, mimeType);
    } catch (e) {
        console.error('[AI Moderation] Loi tai anh/frame:', e.message);
        return null;
    }
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
    const urls = ensureArray(videoUrls).filter((u) => typeof u === 'string' && u);
    const allFrames = [];
    for (const url of urls) {
        allFrames.push(...buildVideoFrameUrls(url));
    }
    return [...new Set(allFrames)].slice(0, MAX_VIDEO_FRAMES_TOTAL);
}

const checkContent = async (title, content, imageInputs = [], videoInputs = []) => {
    const rawText = `${title || ''} ${content || ''}`.toLowerCase();
    const cleanText = normalizeText(`${title || ''} ${content || ''}`);

    for (const word of HARD_BLOCKLIST) {
        if (rawText.includes(word) || cleanText.includes(word)) {
            console.log(`[AI Moderation] BLOCKLIST CATCH: "${word}"`);
            return { status: 'REJECT', reason: `Phat hien tu ngu bi cam: ${word}` };
        }
    }

    return new Promise(async (resolve) => {
        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) return resolve({ status: 'PASS', reason: '' });

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 1024,
                    responseMimeType: 'application/json'
                }
            });

            const frameUrls = extractVideoFrameUrls(videoInputs);
            const prompt = `[INTERNATIONAL CONTENT MODERATION SYSTEM]
Analyze title/content and all attached media.
- Media includes images and sampled frames extracted from attached videos.
- Return strict JSON with:
  - status: "REJECT" or "PASS"
  - reason: short Vietnamese reason (max 20 words), empty when PASS

REJECT if any of: profanity/hate speech, political-sensitive violations, nudity/porn, extreme violence, illegal content.

Title: ${title || ''}
Content: ${content || ''}
Video frames count: ${frameUrls.length}

ONLY return JSON.`;

            const contentsParts = [{ text: prompt }];
            const mediaPromises = [];

            for (const input of ensureArray(imageInputs)) {
                if (Buffer.isBuffer(input)) {
                    mediaPromises.push(Promise.resolve(bufferToGenerativePart(input)));
                } else if (typeof input === 'string') {
                    mediaPromises.push(fetchImageToGenerativePart(input));
                }
            }

            for (const frameUrl of frameUrls) {
                mediaPromises.push(fetchImageToGenerativePart(frameUrl));
            }

            if (mediaPromises.length > 0) {
                const mediaParts = await Promise.all(mediaPromises);
                for (const part of mediaParts) {
                    if (part) contentsParts.push(part);
                }
            }

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: contentsParts }]
            });

            const textResponse = result.response.text().trim();
            let aiResult;
            try {
                aiResult = JSON.parse(textResponse);
            } catch (_) {
                const cleaned = textResponse.replace(/^```json\s*|\s*```$/g, '').trim();
                aiResult = JSON.parse(cleaned);
            }

            if (aiResult.status === 'REJECT') {
                return resolve({ status: 'REJECT', reason: aiResult.reason || 'Vi pham chinh sach cong dong' });
            }
            return resolve({ status: 'PASS', reason: '' });
        } catch (error) {
            console.error('[AI Moderation] Loi he thong AI:', error.message);
            if (error.message.includes('429') || error.message.includes('quota')) {
                return resolve({ status: 'PASS', reason: 'He thong AI dang bao tri - Dang cho Admin duyet' });
            }
            return resolve({ status: 'REJECT', reason: 'Loi he thong xu ly noi dung' });
        }
    });
};

module.exports = { checkContent };
