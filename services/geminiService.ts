import { GoogleGenerativeAI } from "@google/generative-ai";
import type { FormData, GeneratedTest, TestMatrix, TestSolution } from '../types.ts';

// Định nghĩa Enum Type cục bộ để xây dựng Schema nếu thư viện không export
export enum Type {
  STRING = 'string',
  NUMBER = 'number',
  INTEGER = 'integer',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
}

let apiKeys: string[] = [];
let currentKeyIndex = 0;
// Lưu trữ thời điểm một key có thể sử dụng lại sau khi bị lỗi 429
const coolingKeys: Record<string, number> = {};

export const initializeGemini = (keys: string | string[]) => {
    let keyArray: string[] = [];
    if (Array.isArray(keys)) {
        keyArray = keys;
    } else {
        // Tách key bằng dấu phẩy, chấm phẩy hoặc xuống dòng
        keyArray = keys.split(/[,;\n]+/)
            .map(k => k.trim())
            // Chỉ lấy các key có độ dài hợp lý (thường > 30 ký tự) để tránh rác
            .filter(k => k.length > 20); 
    }
    apiKeys = keyArray;
    currentKeyIndex = 0;
};

const getAiInstance = (key: string) => {
    return new GoogleGenerativeAI(key);
};

/**
 * Tìm một API Key đang sẵn sàng (không trong thời gian chờ)
 */
const getNextAvailableKey = (): string | null => {
    if (apiKeys.length === 0) return null;
    
    const now = Date.now();
    const startIndex = currentKeyIndex;
    
    // Thử tìm key tiếp theo không bị "cooling"
    for (let i = 0; i < apiKeys.length; i++) {
        const idx = (startIndex + i) % apiKeys.length;
        const key = apiKeys[idx];
        
        if (!coolingKeys[key] || now > coolingKeys[key]) {
            currentKeyIndex = idx;
            return key;
        }
    }
    
    // Nếu tất cả đều bị cooling, lấy cái có thời gian chờ ngắn nhất
    let bestKey = apiKeys[0];
    let minWait = coolingKeys[bestKey] || 0;
    
    for (const key of apiKeys) {
        if (coolingKeys[key] < minWait) {
            minWait = coolingKeys[key];
            bestKey = key;
        }
    }
    
    return bestKey;
};

/**
 * Đánh dấu một key cần tạm nghỉ
 */
const markKeyAsCooling = (key: string, seconds: number = 30) => {
    coolingKeys[key] = Date.now() + (seconds * 1000);
    console.warn(`Key ${key.slice(-4)} đang tạm nghỉ trong ${seconds}s.`);
};

export const validateApiKey = async (apiKey: string): Promise<{ valid: boolean; error?: string }> => {
    if (!apiKey || apiKey.trim() === '') {
        return { valid: false, error: 'API Key không được để trống.' };
    }
    
    // Tách và lọc sạch các key
    const keysToTest = apiKey.split(/[,;\n]+/)
        .map(k => k.trim())
        .filter(k => k.length > 20);
        
    if (keysToTest.length === 0) {
        return { valid: false, error: 'Không tìm thấy API Key hợp lệ. Vui lòng kiểm tra lại định dạng.' };
    }

    let lastErrorMessage = '';
    let validKeysCount = 0;

    for (const key of keysToTest) {
        let keyValid = false;
        // Thử với các model khác nhau nếu gặp 404
        const testModels = ["gemini-1.5-flash", "gemini-1.5-flash-8b"];
        
        for (const modelName of testModels) {
            try {
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent({ 
                    contents: [{ role: 'user', parts: [{ text: 'hi' }] }], 
                    generationConfig: { maxOutputTokens: 1 } 
                });
                await result.response;
                keyValid = true;
                break;
            } catch (error: any) {
                const msg = error.message || '';
                lastErrorMessage = msg;
                // Nếu lỗi 429 thì vẫn coi như key đúng (chỉ là hết lượt)
                if (msg.includes('429') || msg.includes('quota')) {
                    keyValid = true;
                    break;
                }
                // Nếu lỗi 404 (Không tìm thấy model), thử model tiếp theo
                if (msg.includes('404')) continue;
                // Các lỗi khác (403 - Sai key) thì dừng thử model này
                break;
            }
        }
        if (keyValid) validKeysCount++;
    }

    if (validKeysCount > 0) return { valid: true };
    
    let userFriendlyError = 'API Key không hợp lệ.';
    if (lastErrorMessage.includes('403')) userFriendlyError = "Lỗi 403: API Key sai hoặc chưa bật quyền truy cập API.";
    if (lastErrorMessage.includes('404')) userFriendlyError = "Lỗi 404: Không tìm thấy Model AI. Có thể do Key của bạn thuộc vùng bị hạn chế.";
    
    return { valid: false, error: `${userFriendlyError}\n[Chi tiết: ${lastErrorMessage}]` };
};

const matrixSchema = {
    type: Type.OBJECT,
    properties: {
        matrix: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    themeName: { type: Type.STRING },
                    lessonName: { type: Type.STRING },
                    mcq: {
                        type: Type.OBJECT,
                        properties: {
                            recognition: { type: Type.NUMBER },
                            comprehension: { type: Type.NUMBER },
                            application: { type: Type.NUMBER },
                        },
                        required: ['recognition', 'comprehension', 'application'],
                    },
                    written: {
                        type: Type.OBJECT,
                        properties: {
                            recognition: { type: Type.NUMBER },
                            comprehension: { type: Type.NUMBER },
                            application: { type: Type.NUMBER },
                        },
                        required: ['recognition', 'comprehension', 'application'],
                    },
                },
                required: ['themeName', 'lessonName', 'mcq', 'written'],
            },
        },
        specTable: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    themeName: { type: Type.STRING },
                    lessonName: { type: Type.STRING },
                    description: {
                        type: Type.OBJECT,
                        properties: {
                            recognition: { type: Type.STRING },
                            comprehension: { type: Type.STRING },
                            application: { type: Type.STRING },
                        },
                        required: ['recognition', 'comprehension', 'application'],
                    },
                },
                required: ['themeName', 'lessonName', 'description'],
            },
        },
    },
    required: ['matrix', 'specTable'],
};

const testSchema = {
  type: Type.OBJECT,
  properties: {
    multipleChoiceQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionText: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING },
          cognitiveLevel: { type: Type.STRING },
        },
        required: ['questionText', 'options', 'correctAnswer', 'cognitiveLevel'],
      },
    },
    trueFalseQuestions: { type: Type.ARRAY, items: { type: Type.OBJECT } },
    matchingQuestions: { type: Type.ARRAY, items: { type: Type.OBJECT } },
    fillBlankQuestions: { type: Type.ARRAY, items: { type: Type.OBJECT } },
    writtenQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionText: { type: Type.STRING },
          suggestedAnswer: { type: Type.STRING },
          cognitiveLevel: { type: Type.STRING },
        },
        required: ['questionText', 'suggestedAnswer', 'cognitiveLevel'],
      },
    },
  },
  required: ['writtenQuestions'],
};

const solutionSchema = {
    type: Type.OBJECT,
    properties: {
        writtenGradingGuides: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    questionText: { type: Type.STRING },
                    detailedGuide: { type: Type.STRING },
                },
                required: ['questionText', 'detailedGuide'],
            },
        },
    },
    required: ['writtenGradingGuides'],
};

const parseGeminiJson = <T>(jsonText: string): T => {
    let cleanedJson = jsonText.trim();
    if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.substring(7);
        if (cleanedJson.endsWith('```')) cleanedJson = cleanedJson.slice(0, -3);
    } else if (cleanedJson.startsWith('`')) {
        cleanedJson = cleanedJson.substring(1);
        if (cleanedJson.endsWith('`')) cleanedJson = cleanedJson.slice(0, -1);
    }
    cleanedJson = cleanedJson.trim();
    try {
        return JSON.parse(cleanedJson) as T;
    } catch (e) {
        throw new Error("Phản hồi từ AI không đúng định dạng JSON.");
    }
};

const handleGeminiError = (error: unknown, context: string): Error => {
    console.error(`Lỗi ${context}:`, error);
    let msg = `Lỗi hệ thống khi ${context}.`;
    if (error instanceof Error) {
        const err = error.message.toLowerCase();
        if (err.includes('api key') || err.includes('403')) msg = "API Key không hợp lệ hoặc bị chặn.";
        else if (err.includes('quota') || err.includes('429')) msg = "Hết hạn ngạch (Quota). Hãy đợi 1 phút hoặc đổi Key.";
        else if (err.includes('location')) msg = "Vùng của bạn chưa được hỗ trợ. Hãy dùng VPN Singapore/Mỹ.";
        else msg = `Lỗi: ${error.message}`;
    }
    return new Error(msg);
};

const generateWithModelFallback = async <T>(
    prompt: string,
    fileImages: string[],
    schema: any,
    temperature: number,
    context: string,
    onStatusUpdate?: (status: string) => void
): Promise<T> => {
    if (apiKeys.length === 0) throw new Error("Vui lòng cấu hình API Key.");

    // Thứ tự ưu tiên mô hình: Flash 1.5 ổn định nhất cho Free Tier
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash-lite-preview-02-05'];
    let retryCount = 0;
    const maxRetries = 8; // Tăng số lần thử lại cho free key

    while (retryCount < maxRetries) {
        const currentKey = getNextAvailableKey();
        if (!currentKey) break;
        
        const genAI = getAiInstance(currentKey);

        for (const modelName of models) {
            try {
                if (onStatusUpdate) onStatusUpdate(`Đang sử dụng ${modelName} (Lượt thử ${retryCount + 1})...`);
                const model = genAI.getGenerativeModel({ 
                    model: modelName, 
                    generationConfig: { 
                        responseMimeType: "application/json", 
                        responseSchema: schema as any,
                        temperature 
                    } 
                });

                const parts: any[] = [{ text: prompt }];
                for (const img of fileImages) {
                    parts.push({ inlineData: { mimeType: 'image/jpeg', data: img } });
                }

                const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
                const response = await result.response;
                return parseGeminiJson<T>(response.text());
            } catch (error: any) {
                const msg = error.message.toLowerCase();
                console.warn(`Lỗi với ${modelName}:`, msg);
                
                // 1. Lỗi nội dung/Cấu trúc -> Ngừng thử model này
                if (msg.includes('400') && !msg.includes('quota') && !msg.includes('limit')) break;

                // 2. Lỗi Quyền truy cập/Không tìm thấy (403/404) -> Thử key khác ngay
                if (msg.includes('403') || msg.includes('404')) {
                    if (apiKeys.length > 1) {
                         console.warn(`Key bị lỗi ${msg.includes('403') ? '403' : '404'}. Đang chuyển key...`);
                         markKeyAsCooling(currentKey, 3600); // Cho key này "nghỉ" 1 tiếng vì lỗi này thường cố định
                         break; // Lấy key mới
                    }
                    // Nếu chỉ có 1 key và bị 404/403 thì không thể tiếp tục
                    throw handleGeminiError(error, context);
                }

                // 3. Lỗi Quota/Bận (429/503)
                if (msg.includes('quota') || msg.includes('429') || msg.includes('limit') || msg.includes('exhausted') || msg.includes('overload')) {
                    // Trích xuất thời gian chờ nếu có (Google thường trả về "retry in 31s")
                    let waitSeconds = 30;
                    const match = msg.match(/retry in (\d+\.?\d*)s/);
                    if (match) waitSeconds = Math.ceil(parseFloat(match[1]));
                    
                    markKeyAsCooling(currentKey, waitSeconds);
                    
                    if (apiKeys.length > 1) {
                        // Nếu có nhiều key, thử ngay key khác
                        if (onStatusUpdate) onStatusUpdate(`Key hiện tại bị giới hạn. Đang đổi sang Key dự phòng...`);
                        break; // Thoát khỏi vòng lặp models để lấy key mới ở vòng white
                    } else {
                        // Nếu chỉ có 1 key, buộc phải chờ
                        if (onStatusUpdate) onStatusUpdate(`Hết lượt miễn phí. Đang chờ AI "nghỉ ngơi" ${waitSeconds}s...`);
                        await new Promise(r => setTimeout(r, (waitSeconds + 1) * 1000));
                        retryCount++;
                        break; // Thử lại
                    }
                }
                
                // Các lỗi khác (mạng, local) -> thử model tiếp theo
            }
        }
        retryCount++;
        // Nghỉ ngắn giữa các đợt thử nếu chưa thành công
        if (retryCount < maxRetries) await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error("Không thể kết nối đến AI sau nhiều lần thử. Nguyên nhân thường do: 1. Hết lượt dùng miễn phí quá lâu (Hãy đợi 1-2 phút); 2. Key chưa được bật dịch vụ; 3. Nội dung quá dài.");
};

export const generateMatrixFromGemini = async (formData: FormData, onStatusUpdate?: (status: string) => void): Promise<TestMatrix> => {
    const prompt = `Tạo ma trận đề cho môn ${formData.subject}. Nội dung: ${formData.fileContent || ''}`;
    return await generateWithModelFallback<TestMatrix>(prompt, formData.fileImages || [], matrixSchema, 0.2, "tạo ma trận", onStatusUpdate);
};

export const generateTestFromGemini = async (formData: FormData, matrix: TestMatrix, onStatusUpdate?: (status: string) => void): Promise<GeneratedTest> => {
    const prompt = `Soạn đề dựa trên ma trận: ${JSON.stringify(matrix)}. Nội dung: ${formData.fileContent || ''}`;
    return await generateWithModelFallback<GeneratedTest>(prompt, formData.fileImages || [], testSchema, 0.7, "soạn đề", onStatusUpdate);
};

export const generateSolutionFromGemini = async (testData: GeneratedTest, formData: FormData, onStatusUpdate?: (status: string) => void): Promise<TestSolution> => {
    const prompt = `Tạo đáp án cho đề: ${JSON.stringify(testData)}`;
    return await generateWithModelFallback<TestSolution>(prompt, [], solutionSchema, 0.3, "tạo đáp án", onStatusUpdate);
};
