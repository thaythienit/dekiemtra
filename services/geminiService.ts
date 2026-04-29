import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { FormData, GeneratedTest, TestMatrix, TestSolution } from '../types.ts';

/**
 * Gemini Service using Standard SDK (@google/generative-ai)
 * Handles:
 * 1. Multi-key rotation
 * 2. Intelligent cooling/retry for Free Quota
 * 3. Model fallback (1.5 Flash -> 1.5 Flash-8b -> 1.5 Pro)
 */

let apiKeys: string[] = [];
let currentKeyIndex = 0;
const coolingKeys: Record<string, number> = {};

export const initializeGemini = (keys: string | string[]) => {
    let keyArray: string[] = [];
    if (Array.isArray(keys)) {
        keyArray = keys;
    } else {
        keyArray = keys.split(/[,;\n]+/).map(k => k.trim()).filter(k => k.length > 20);
    }
    apiKeys = keyArray;
    currentKeyIndex = 0;
};

const getAiInstance = (key: string) => {
    return new GoogleGenerativeAI(key);
};

const getNextAvailableKey = (): string | null => {
    if (apiKeys.length === 0) return null;
    const now = Date.now();
    for (let i = 0; i < apiKeys.length; i++) {
        const idx = (currentKeyIndex + i) % apiKeys.length;
        const key = apiKeys[idx];
        if (!coolingKeys[key] || now > coolingKeys[key]) {
            currentKeyIndex = idx;
            return key;
        }
    }
    // Fallback: pick the one with earliest cooldown
    let earliest = apiKeys[0];
    for (const key of apiKeys) {
        if ((coolingKeys[key] || 0) < (coolingKeys[earliest] || 0)) earliest = key;
    }
    return earliest;
};

const markKeyAsCooling = (key: string, seconds: number = 45) => {
    coolingKeys[key] = Date.now() + (seconds * 1000);
};

export const validateApiKey = async (apiKey: string): Promise<{ valid: boolean; error?: string }> => {
    if (!apiKey?.trim()) return { valid: false, error: 'API Key không được để trống.' };
    const keys = apiKey.split(/[,;\n]+/).map(k => k.trim()).filter(k => k.length > 20);
    if (keys.length === 0) return { valid: false, error: 'Không tìm thấy API Key hợp lệ.' };

    let lastError = '';
    const testModels = ['gemini-1.5-flash', 'gemini-1.5-flash-8b'];
    
    for (const key of keys) {
        const genAI = new GoogleGenerativeAI(key);
        for (const modelName of testModels) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
                    generationConfig: { maxOutputTokens: 2 }
                });
                await result.response;
                return { valid: true };
            } catch (error: any) {
                lastError = error.message.toLowerCase();
                if (lastError.includes('quota') || lastError.includes('429')) return { valid: true };
                if (lastError.includes('404')) continue;
                break;
            }
        }
    }
    return { valid: false, error: `Key không hợp lệ hoặc lỗi: ${lastError}` };
};

const parseGeminiJson = <T>(jsonText: string): T => {
    let cleanedJson = jsonText.trim();
    if (cleanedJson.startsWith('```')) {
        const match = cleanedJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) cleanedJson = match[1];
    } else if (cleanedJson.startsWith('`')) {
        cleanedJson = cleanedJson.replace(/^`+|`+$/g, '');
    }
    cleanedJson = cleanedJson.trim();
    try {
        return JSON.parse(cleanedJson) as T;
    } catch (e) {
        const match = cleanedJson.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]) as T;
            } catch (innerE) {}
        }
        throw new Error("Phản hồi từ AI không đúng định dạng JSON. Vui lòng thử lại.");
    }
};

const callGeminiWithRetry = async <T>(
    prompt: string,
    images: string[],
    schema: any,
    temperature: number,
    onStatusUpdate?: (status: string) => void
): Promise<T> => {
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        const key = getNextAvailableKey();
        if (!key) throw new Error("Chưa cấu hình API Key.");

        for (const modelName of models) {
            try {
                if (onStatusUpdate) onStatusUpdate(`Sử dụng ${modelName} (Lần thử ${attempts + 1})...`);
                const genAI = getAiInstance(key);
                
                // standard SDK uses responseMimeType: "application/json" and responseSchema
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: {
                        temperature,
                        responseMimeType: "application/json",
                        responseSchema: schema
                    }
                });

                const parts: any[] = [{ text: prompt }];
                for (const img of images) {
                    parts.push({
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: img,
                        },
                    });
                }

                const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
                const response = await result.response;
                return parseGeminiJson<T>(response.text());
            } catch (error: any) {
                const msg = error.message.toLowerCase();
                console.warn(`Lỗi ${modelName}:`, msg);
                if (msg.includes('404')) continue;
                if (msg.includes('403')) {
                    markKeyAsCooling(key, 3600);
                    break;
                }
                if (msg.includes('quota') || msg.includes('429') || msg.includes('limit')) {
                    markKeyAsCooling(key, 45);
                    if (apiKeys.length > 1) break;
                    if (onStatusUpdate) onStatusUpdate(`Hết lượt miễn phí. Đang chờ 45s...`);
                    await new Promise(r => setTimeout(r, 45000));
                    break;
                }
                // Handle 400 cases where schema might not be supported by older model or location
                if (msg.includes('400')) break;
            }
        }
        attempts++;
        await new Promise(r => setTimeout(r, 1500));
    }
    throw new Error("Không thể kết nối đến AI sau nhiều lần thử. Vui lòng thử lại sau.");
};

export const generateMatrixFromGemini = async (formData: FormData, onStatusUpdate?: (status: string) => void): Promise<TestMatrix> => {
    const prompt = `Bạn là một chuyên gia giáo dục. Hãy tạo MA TRẬN ĐỀ KIỂM TRA (Test Matrix) cho môn ${formData.subject}, lớp ${formData.className} dựa trên các yêu cầu: MCQ: ${formData.mcqCount}, Tự luận: ${formData.writtenCount}. Nội dung: ${formData.fileContent}`;
    
    const schema: any = {
        type: SchemaType.OBJECT,
        properties: {
            matrix: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        themeName: { type: SchemaType.STRING },
                        lessonName: { type: SchemaType.STRING },
                        mcq: {
                            type: SchemaType.OBJECT,
                            properties: { recognition: { type: SchemaType.NUMBER }, comprehension: { type: SchemaType.NUMBER }, application: { type: SchemaType.NUMBER } },
                            required: ['recognition', 'comprehension', 'application']
                        },
                        written: {
                            type: SchemaType.OBJECT,
                            properties: { recognition: { type: SchemaType.NUMBER }, comprehension: { type: SchemaType.NUMBER }, application: { type: SchemaType.NUMBER } },
                            required: ['recognition', 'comprehension', 'application']
                        }
                    },
                    required: ['themeName', 'lessonName', 'mcq', 'written']
                }
            },
            specTable: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        themeName: { type: SchemaType.STRING },
                        lessonName: { type: SchemaType.STRING },
                        description: {
                            type: SchemaType.OBJECT,
                            properties: { recognition: { type: SchemaType.STRING }, comprehension: { type: SchemaType.STRING }, application: { type: SchemaType.STRING } },
                            required: ['recognition', 'comprehension', 'application']
                        }
                    },
                    required: ['themeName', 'lessonName', 'description']
                }
            }
        },
        required: ['matrix', 'specTable']
    };

    return await callGeminiWithRetry<TestMatrix>(prompt, formData.fileImages || [], schema, 0.2, onStatusUpdate);
};

export const generateTestFromGemini = async (formData: FormData, matrix: TestMatrix, onStatusUpdate?: (status: string) => void): Promise<GeneratedTest> => {
    const prompt = `Hãy soạn bộ đề kiểm tra dựa trên ma trận sau: ${JSON.stringify(matrix)}. Nội dung môn ${formData.subject}: ${formData.fileContent}`;
    
    const schema: any = {
        type: SchemaType.OBJECT,
        properties: {
            multipleChoiceQuestions: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        questionText: { type: SchemaType.STRING },
                        options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                        correctAnswer: { type: SchemaType.STRING },
                        cognitiveLevel: { type: SchemaType.STRING }
                    },
                    required: ['questionText', 'options', 'correctAnswer']
                }
            },
            trueFalseQuestions: { 
                type: SchemaType.ARRAY, 
                items: { 
                    type: SchemaType.OBJECT, 
                    properties: { 
                        questionText: { type: SchemaType.STRING }, 
                        correctAnswer: { type: SchemaType.BOOLEAN }, 
                        cognitiveLevel: { type: SchemaType.STRING } 
                    } 
                } 
            },
            matchingQuestions: { 
                type: SchemaType.ARRAY, 
                items: { 
                    type: SchemaType.OBJECT, 
                    properties: { 
                        prompt: { type: SchemaType.STRING }, 
                        pairs: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { itemA: { type: SchemaType.STRING }, itemB: { type: SchemaType.STRING } } } }, 
                        cognitiveLevel: { type: SchemaType.STRING } 
                    } 
                } 
            },
            fillBlankQuestions: { 
                type: SchemaType.ARRAY, 
                items: { 
                    type: SchemaType.OBJECT, 
                    properties: { 
                        questionText: { type: SchemaType.STRING }, 
                        correctAnswer: { type: SchemaType.STRING }, 
                        cognitiveLevel: { type: SchemaType.STRING } 
                    } 
                } 
            },
            writtenQuestions: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: { questionText: { type: SchemaType.STRING }, suggestedAnswer: { type: SchemaType.STRING }, cognitiveLevel: { type: SchemaType.STRING } },
                    required: ['questionText', 'suggestedAnswer']
                }
            }
        }
    };

    return await callGeminiWithRetry<GeneratedTest>(prompt, formData.fileImages || [], schema, 0.7, onStatusUpdate);
};

export const generateSolutionFromGemini = async (test: GeneratedTest, formData: FormData, onStatusUpdate?: (status: string) => void): Promise<TestSolution> => {
    const prompt = `Hãy tạo hướng dẫn chấm chi tiết cho bộ đề sau: ${JSON.stringify(test)}`;
    const schema: any = {
        type: SchemaType.OBJECT,
        properties: {
            writtenGradingGuides: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: { questionText: { type: SchemaType.STRING }, detailedGuide: { type: SchemaType.STRING } },
                    required: ['questionText', 'detailedGuide']
                }
            }
        },
        required: ['writtenGradingGuides']
    };
    return await callGeminiWithRetry<TestSolution>(prompt, [], schema, 0.3, onStatusUpdate);
};
