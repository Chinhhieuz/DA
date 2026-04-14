const https = require('https');
const http = require('http');

// 🛡️ LỚP 1: DANH SÁCH TỪ CẤM TOÀN CẦU (GLOBAL BLOCKLIST)
// Chặn ngay lập tức các từ chửi thề cực đoan bằng cả Tiếng Việt và Tiếng Anh
const HARD_BLOCKLIST = [
    // 🇻🇳 TIẾNG VIỆT
    'địt', 'djt', 'đjt', 'đ.ị.t', 'đýt', 'mọe', 'đm', 'đ.m', 'đkm', 'dcm', 'vcl', 'vkl', 'clgt', 'cmnr', 'vc', 'lồn', 'l0n', 'cặc', 'c@c', 'buồi', 'đầu buồi', 'súc vật', 'chó đẻ',
    'việt tân', 'cách mạng màu', 'biểu tình', 'lật đổ', 'đa đảng', 'đường lưỡi bò', 'ba que', 'đu càng', 'phản động', 'bạo loạn', 'bất tuân dân sự', 'xuyên tạc',
    'bắc kỳ', 'nam kỳ', 'hoa thanh quế', 'tộc cối', 'tọc cối', 'người rừng', 'mọi miên',
    'cá độ', 'lô đề', 'soi cầu', 'tín dụng đen', 'bốc bát họ', 'thuốc kích dục', 'ma túy', 'đập đá', 'ke kẹo',

    // 🇺🇸 TIẾNG ANH (GLOBAL HIGH-RISK)
    'fuck', 'f*ck', 'motherfucker', 'shit', 'sh*it', 'asshole', 'bastard', 'bitch', 'pussy', 'dick', 'cock',
    'nigger', 'nigga', 'retard', 'slut', 'whore', 'hooker', 'porn', 'sex', 'hentai', 'terrorism', 'isisl'
];

/**
 * Helper: Chuẩn hóa văn bản để phát hiện lách luật (Teencode, dấu chấm, khoảng trắng)
 * Ví dụ: "đ.m" -> "đm", "f u c k" -> "fuck"
 */
function normalizeText(text) {
    if (!text) return '';
    // Loại bỏ tất cả khoảng trắng và các ký tự gây nhiễu phổ biến
    return text.toLowerCase().replace(/[\s\.\-\_\*\|\,\@\(\)\[\]\{\}\?\!]/g, '');
}

/**
 * Helper: Chuyển đổi Buffer ảnh thành format tương thích với Gemini
 */
function bufferToGenerativePart(buffer, mimeType = 'image/jpeg') {
    return {
        inlineData: { data: buffer.toString("base64"), mimeType: mimeType },
    };
}

/**
 * Hàm tải ảnh từ URL và chuyển thành format tương thích với Gemini
 */
async function fetchImageToGenerativePart(url) {
    try {
        if (!url || !url.startsWith('http')) return null;
        if (url.startsWith('http://res.cloudinary.com')) url = url.replace('http://', 'https://');

        const response = await fetch(url);
        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        
        return bufferToGenerativePart(buffer, mimeType);
    } catch (e) {
        console.error('[AI Moderation] Lỗi khi tải ảnh từ URL:', e.message);
        return null;
    }
}

/**
 * Hệ thống kiểm duyệt AI Quốc tế - Bảo vệ đa quốc gia và đa ngôn ngữ
 */
const checkContent = async (title, content, imageUrls = []) => {
    // ⚔️ KIỂM TRA LỚP 1: GLOBAL HARD BLOCKLIST (CASE-INSENSITIVE)
    const rawText = (title + ' ' + content).toLowerCase();
    const cleanText = normalizeText(title + ' ' + content);

    for (const word of HARD_BLOCKLIST) {
        // Kiểm tra cả văn bản gốc và văn bản đã chuẩn hóa
        if (rawText.includes(word) || cleanText.includes(word)) {
            console.log(`[AI Moderation] 🛡️ GLOBAL BLOCKLIST CATCH: "${word}" found. REJECT!`);
            return { status: 'REJECT', reason: `Phát hiện từ ngữ bị cấm: ${word}` };
        }
    }

    // 🧠 KIỂM TRA LỚP 2: INTERNATIONAL SYSTEM PROMPT (Gemini)
    return new Promise(async (resolve) => {
        try {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) return resolve({ status: 'PASS', reason: '' });

            const genAI = new GoogleGenerativeAI(apiKey);
            // Sử dụng model 2.0-flash mà tài khoản của bạn có quyền truy cập
            const model = genAI.getGenerativeModel({ 
                model: 'gemini-2.0-flash',
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 1024,
                    responseMimeType: "application/json"
                }
            });

            const prompt = `[INTERNATIONAL CONTENT MODERATION SYSTEM - GLOBAL SAFETY SHIELD]
You are an Elite International Content Moderator. You are highly proficient in multiple languages, including Vietnamese, English, Spanish, French, and common internet slang across cultures.

TASK: Analyze the content and images provided. Return a JSON object with two fields:
- "status": "REJECT" if it violates policies, or "PASS" if safe.
- "reason": A short explanation in Vietnamese (max 20 words) detailing why it was rejected, or an empty string if PASS.

GLOBAL SAFETY POLICIES (REJECT IF ANY):
1. OFFENSIVE LANGUAGE (ALL LANGUAGES):
   - Profanity, insults, slurs in any language (Vietnamese, English, Spanish, etc.).
   - Hidden or "Leetspeak" variants (e.g., "f*ck", "đ.m", "vcl").
2. HARASSMENT & HATE SPEECH:
   - Attacks based on race, religion, sexual orientation, disability, or nationality.
   - Regional discrimination (e.g., "Bắc Kỳ", "Nam Kỳ").
3. SENSITIVE POLITICS (VIETNAM FOCUS):
   - Incitement of protests, illegal acts against the Vietnamese state.
   - Prohibited maps (Cow-tongue line) or flags (3rd Republic).
4. MULTIMODAL VISION:
   - Nudity, pornography, extreme violence, or blood in images.
   - OCR Check: Read text within images for violations.

Title: ${title}
Content: ${content}

RULES: Return ONLY JSON {"status": "REJECT"/"PASS", "reason": "Short text"}. NO intro/outro.`;

            let contentsParts = [{ text: prompt }];

            // 🚀 Xử lý danh sách Ảnh
            const allPromises = [];
            if (Array.isArray(imageUrls) && imageUrls.length > 0 && imageUrls[0] instanceof Buffer) {
                imageUrls.forEach(buf => {
                    allPromises.push(Promise.resolve(bufferToGenerativePart(buf)));
                });
            } else if (imageUrls && imageUrls.length > 0) {
                imageUrls.forEach(url => {
                    allPromises.push(fetchImageToGenerativePart(url));
                });
            }

            if (allPromises.length > 0) {
                const imgParts = await Promise.all(allPromises);
                imgParts.forEach(part => {
                    if (part) contentsParts.push(part);
                });
            }

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: contentsParts }]
            });

            const textResponse = result.response.text().trim();
            let aiResult;
            try {
                aiResult = JSON.parse(textResponse);
            } catch (e) {
                // Xử lý trường hợp AI trả về markdown code blocks
                const cleaned = textResponse.replace(/^```json\s*|\s*```$/g, '').trim();
                aiResult = JSON.parse(cleaned);
            }

            if (aiResult.status === 'REJECT') {
                console.log(`[AI Moderation] 🛡️ REJECTED: "${title}", Lý do: ${aiResult.reason}`);
                resolve({ status: 'REJECT', reason: aiResult.reason || 'Vi phạm chính sách cộng đồng' });
            } else {
                resolve({ status: 'PASS', reason: '' });
            }

        } catch (error) { 
            console.error('[AI Moderation] Lỗi hệ thống AI:', error.message);
            // Nếu lỗi là do hết hạn mức (Quota), chúng ta cho phép bài viết đi qua để Admin duyệt thủ công
            // thay vì chặn cứng bài viết của người dùng.
            if (error.message.includes('429') || error.message.includes('quota')) {
                console.log('[AI Moderation] ⚠️ Hết hạn mức API Gemini. Chuyển sang chế độ duyệt thủ công.');
                return resolve({ status: 'PASS', reason: 'Hệ thống AI đang bảo trì - Đang chờ Admin duyệt' });
            }
            resolve({ status: 'REJECT', reason: 'Lỗi hệ thống xử lý nội dung' }); 
        }
    });
};

module.exports = { checkContent };
