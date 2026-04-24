import { GoogleGenAI, Type } from '@google/genai';
import type { FormData, GeneratedTest, TestMatrix, TestSolution } from '../types.ts';

let apiKeys: string[] = [];
let currentKeyIndex = 0;
let aiInstances: GoogleGenAI[] = [];

export const initializeGemini = (keys: string | string[]) => {
    let keyArray: string[] = [];
    if (Array.isArray(keys)) {
        keyArray = keys;
    } else {
        keyArray = keys.split(/[,;\n]+/).map(k => k.trim()).filter(k => k !== '');
    }
    apiKeys = keyArray;
    aiInstances = keyArray.map(key => new GoogleGenAI({ apiKey: key }));
    currentKeyIndex = 0;
};

const getAiInstance = () => {
    if (aiInstances.length === 0) return null;
    return aiInstances[currentKeyIndex];
};

const rotateKey = () => {
    if (aiInstances.length > 1) {
        currentKeyIndex = (currentKeyIndex + 1) % aiInstances.length;
        console.log(`Đã chuyển sang API Key thứ ${currentKeyIndex + 1}`);
        return true;
    }
    return false;
};

const handleValidationGeminiError = (error: unknown): Error => {
    let errorMessage = "API Key không hợp lệ hoặc đã xảy ra lỗi mạng. Vui lòng kiểm tra lại key và kết nối internet.";
     if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('api key not valid') || msg.includes('403')) {
            errorMessage = "Lỗi xác thực: API Key không hợp lệ. Vui lòng kiểm tra lại key của bạn.";
        } else if (msg.includes('quota') || msg.includes('429') || msg.includes('resource_exhausted')) {
            errorMessage = "Lỗi giới hạn (Quota/429): Bạn đã dùng hết lượt miễn phí hoặc đang gọi quá nhanh (RPM). Vui lòng đợi 1-2 phút rồi thử lại. Nếu vẫn lỗi, hãy thử tạo một API Key mới.";
        } else if (msg.includes('location') || msg.includes('supported')) {
            errorMessage = "Lỗi vùng miền: Vùng quốc gia của bạn hiện chưa được Google AI hỗ trợ dịch vụ miễn phí (hoặc cần sử dụng VPN).";
        }
        errorMessage += `\n\n[Chi tiết kỹ thuật: ${error.message}]`;
    }
    return new Error(errorMessage);
}


export const validateApiKey = async (apiKey: string): Promise<{ valid: boolean; error?: string }> => {
    if (!apiKey || apiKey.trim() === '') {
        return { valid: false, error: 'API Key không được để trống.' };
    }
    
    // Support multiple keys separated by comma or semicolon
    const keys = apiKey.split(/[,;\n]+/).map(k => k.trim()).filter(k => k !== '');
    if (keys.length === 0) return { valid: false, error: 'Dữ liệu không hợp lệ.' };

    const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash'];
    let lastError: any = null;
    let validKeysCount = 0;

    for (const key of keys) {
        let keyValid = false;
        for (const modelName of modelsToTry) {
            let modelRetries = 2; // Try each model up to twice if quota hit
            while (modelRetries > 0) {
                try {
                    const tempAi = new GoogleGenAI({ apiKey: key });
                    await tempAi.models.generateContent({
                        model: modelName,
                        contents: 'hi',
                        config: { maxOutputTokens: 1 }
                    });
                    keyValid = true;
                    break;
                } catch (error) {
                    lastError = error;
                    const msg = error instanceof Error ? error.message.toLowerCase() : '';
                    
                    if (msg.includes('api key not valid') || msg.includes('403') || msg.includes('invalid api key')) {
                        modelRetries = 0; // Don't retry invalid keys
                        break;
                    }
                    
                    if (msg.includes('quota') || msg.includes('429')) {
                        modelRetries--;
                        if (modelRetries > 0) {
                            console.warn(`Validation quota hit for ${modelName}, waiting 2s before retry...`);
                            await new Promise(r => setTimeout(r, 2000));
                            continue;
                        }
                    }
                    break; // Other errors, move to next model
                }
            }
            if (keyValid) break;
        }
        if (keyValid) validKeysCount++;
    }

    if (validKeysCount > 0) {
        return { valid: true };
    }

    const validationError = handleValidationGeminiError(lastError);
    return { valid: false, error: validationError.message };
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
                            recognition: { type: Type.STRING, description: "Mô tả yêu cầu đạt được ở mức Nhận biết" },
                            comprehension: { type: Type.STRING, description: "Mô tả yêu cầu đạt được ở mức Thông hiểu" },
                            application: { type: Type.STRING, description: "Mô tả yêu cầu đạt được ở mức Vận dụng" },
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
          cognitiveLevel: { type: Type.STRING, enum: ['Nhận biết', 'Thông hiểu', 'Vận dụng'] },
        },
        required: ['questionText', 'options', 'correctAnswer', 'cognitiveLevel'],
      },
    },
    trueFalseQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionText: { type: Type.STRING },
          correctAnswer: { type: Type.BOOLEAN },
          cognitiveLevel: { type: Type.STRING, enum: ['Nhận biết', 'Thông hiểu', 'Vận dụng'] },
        },
        required: ['questionText', 'correctAnswer', 'cognitiveLevel'],
      },
    },
    matchingQuestions: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                prompt: { type: Type.STRING },
                pairs: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            itemA: { type: Type.STRING },
                            itemB: { type: Type.STRING },
                        },
                        required: ['itemA', 'itemB'],
                    }
                },
                cognitiveLevel: { type: Type.STRING, enum: ['Nhận biết', 'Thông hiểu', 'Vận dụng'] },
            },
            required: ['prompt', 'pairs', 'cognitiveLevel'],
        },
    },
    fillBlankQuestions: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                questionText: { type: Type.STRING, description: "Câu hỏi có chứa '___' để biểu thị chỗ trống cần điền." },
                correctAnswer: { type: Type.STRING },
                cognitiveLevel: { type: Type.STRING, enum: ['Nhận biết', 'Thông hiểu', 'Vận dụng'] },
            },
            required: ['questionText', 'correctAnswer', 'cognitiveLevel'],
        },
    },
    writtenQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionText: { type: Type.STRING },
          suggestedAnswer: { type: Type.STRING },
          cognitiveLevel: { type: Type.STRING, enum: ['Nhận biết', 'Thông hiểu', 'Vận dụng'] },
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
                    detailedGuide: { type: Type.STRING, description: "Hướng dẫn chấm chi tiết, bao gồm cả phân bổ điểm cho từng ý nếu có." },
                },
                required: ['questionText', 'detailedGuide'],
            },
        },
    },
    required: ['writtenGradingGuides'],
};


/**
 * Robustly parses a JSON string that might be wrapped in markdown backticks.
 * @param jsonText The raw text response from the model.
 * @returns The parsed JSON object.
 */
const parseGeminiJson = <T>(jsonText: string): T => {
    let cleanedJson = jsonText.trim();
    if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.substring(7);
        if (cleanedJson.endsWith('```')) {
            cleanedJson = cleanedJson.slice(0, -3);
        }
    } else if (cleanedJson.startsWith('`')) {
        cleanedJson = cleanedJson.substring(1);
        if (cleanedJson.endsWith('`')) {
            cleanedJson = cleanedJson.slice(0, -1);
        }
    }
    cleanedJson = cleanedJson.trim();
    try {
        return JSON.parse(cleanedJson) as T;
    } catch (e) {
        console.error("Failed to parse JSON:", cleanedJson);
        throw new Error("Phản hồi từ AI không phải là định dạng JSON hợp lệ.");
    }
};

/**
 * Handles errors from Gemini API calls and provides more user-friendly messages.
 * @param error The caught error object.
 * @param context A string describing the action that failed (e.g., "tạo ma trận đề").
 * @returns An Error object with a user-friendly message.
 */
const handleGeminiError = (error: unknown, context: string): Error => {
    console.error(`Lỗi khi ${context}:`, error);
    let errorMessage = `Không thể ${context}. Vui lòng kiểm tra lại thông tin đầu vào và nội dung file.`;

    if (error instanceof Error) {
        const errMessage = error.message.toLowerCase();
        if (errMessage.includes('api key not valid')) {
            errorMessage = "Lỗi xác thực: API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại key của bạn.";
        } else if (errMessage.includes('quota') || errMessage.includes('429') || errMessage.includes('resource_exhausted')) {
            errorMessage = "Lỗi giới hạn (Quota): Bạn đã hết lượt miễn phí hoặc đang thực hiện yêu cầu quá nhanh. Vui lòng đợi 1-2 phút rồi thử lại. Nếu vẫn lỗi, thử dùng API Key khác.";
        } else if (errMessage.includes('400')) {
            errorMessage = `Lỗi yêu cầu (${context}): Dữ liệu không hợp lệ. Có thể do nội dung quá lớn hoặc bị hệ thống Safety chặn (an toàn).`;
        } else if (errMessage.includes('500') || errMessage.includes('server error')) {
            errorMessage = `Lỗi máy chủ AI (${context}): Máy chủ Google đang gặp sự cố. Vui lòng thử lại sau.`;
        } else if (errMessage.includes('json')) {
             errorMessage = `Lỗi phân tích JSON (${context}): Phản hồi từ AI không đúng định dạng. Hãy thử lại.`;
        } else {
             errorMessage = `Lỗi không xác định khi ${context}.`;
        }
        errorMessage += `\n\n[Chi tiết: ${error.message}]`;
    }
    return new Error(errorMessage);
};

// Helper function to create multimodal content
const createMultimodalContent = (prompt: string, images: string[]) => {
    const contentParts: any[] = [{ text: prompt }];
    
    for (const image of images) {
        contentParts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: image,
            }
        });
    }
    return contentParts;
};

/**
 * A robust generation helper that tries multiple models (gemini-1.5-flash, gemini-1.5-flash-8b, etc.)
 * when encountering quota errors.
 */
const generateWithModelFallback = async <T>(
    prompt: string,
    fileImages: string[],
    schema: any,
    temperature: number,
    context: string
): Promise<T> => {
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-2.0-flash'];
    let lastError: any = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        const ai = getAiInstance();
        if (!ai) {
            throw new Error("Lỗi: AI chưa được khởi tạo. Vui lòng kiểm tra API Key.");
        }

        for (const model of models) {
            try {
                const multimodalContents = createMultimodalContent(prompt, fileImages);
                const response = await ai.models.generateContent({
                    model: model,
                    contents: { parts: multimodalContents },
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: schema,
                        temperature: temperature,
                    },
                });
                return parseGeminiJson<T>(response.text);
            } catch (error) {
                lastError = error;
                const msg = error instanceof Error ? error.message.toLowerCase() : '';
                
                if (msg.includes('400') || msg.includes('403') || msg.includes('api key not valid')) {
                    // Critical error, don't retry this model/key
                    break;
                }

                if (msg.includes('quota') || msg.includes('429') || msg.includes('resource_exhausted')) {
                    console.warn(`Hết hạn ngạch mô hình ${model}. Đang thử phương án dự phòng...`);
                    // If we have more keys, try rotating keys before trying next model
                    if (rotateKey()) {
                        // Restart model loop with new key
                        break; 
                    }
                    // If no more keys, continue to next model
                    continue;
                }

                console.warn(`Model ${model} failed for ${context}, attempting fallback...`, error);
            }
        }

        // If we reached here, all models on all keys (if rotated) failed
        // Wait a bit and retry the whole process if it's a quota issue
        const isQuota = lastError instanceof Error && (lastError.message.toLowerCase().includes('quota') || lastError.message.includes('429'));
        if (isQuota) {
            retryCount++;
            const waitTime = retryCount * 2000;
            console.log(`Đang đợi ${waitTime}ms trước khi thử lại lần ${retryCount}...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
            break;
        }
    }

    throw handleGeminiError(lastError, context);
};

export const generateMatrixFromGemini = async (formData: FormData): Promise<TestMatrix> => {
    if (!getAiInstance()) {
        throw new Error("Lỗi: API Key chưa được thiết lập. Vui lòng vào phần 'Cấu hình API Key' để nhập key của bạn.");
    }

    const themesAndLessons = formData.subjectThemes
        .map(theme => {
            const lessons = theme.lessons.map(l => `  - Bài học: "${l.name}" (phạm vi từ trang ${l.startPage} đến trang ${l.endPage}).`).join('\n');
            return `- Chủ đề: "${theme.name}" bao gồm:\n${lessons}`;
        })
        .join('\n');
    
    const prompt = `
    Bạn là chuyên gia thiết kế chương trình giảng dạy cho trường tiểu học Việt Nam.
    Nhiệm vụ của bạn là tạo một **Thiết kế kĩ thuật đề kiểm tra** (bao gồm Ma trận đề và Bản đặc tả) chi tiết dựa trên thông tin sau.

    Môn học: ${formData.subject} Lớp ${formData.className}
    
    ${formData.fileContent ? `
    Bối cảnh: Nội dung được trích từ một file sách giáo khoa, có thể bao gồm cả văn bản và hình ảnh. Bạn cần phân tích cả hai để hiểu toàn bộ ngữ cảnh.
    
    Nội dung chính từ sách giáo khoa để phân tích:
    ---
    (Văn bản)
    ${formData.fileContent}
    ---
    (Các hình ảnh liên quan cũng được cung cấp. Hãy phân tích chúng cùng với văn bản.)
    ` : `
    Bối cảnh: Bạn sẽ dựa trên kiến thức chuyên môn về chương trình giáo dục phổ thông mới của Việt Nam cho bộ môn này để thiết kế.
    `}

    Các chủ đề và bài học cần tạo đề và phạm vi trang tương ứng:
    ${themesAndLessons}

    Cấu trúc đề (tổng cộng):
    - Tổng số câu trắc nghiệm: ${formData.mcqCount}
        - Mức 1 (Nhận biết): ${formData.cognitiveLevelCounts.mcq.recognition} câu
        - Mức 2 (Thông hiểu): ${formData.cognitiveLevelCounts.mcq.comprehension} câu
        - Mức 3 (Vận dụng): ${formData.cognitiveLevelCounts.mcq.application} câu
    - Tổng số câu tự luận: ${formData.writtenCount}
        - Mức 1 (Nhận biết): ${formData.cognitiveLevelCounts.written.recognition} câu
        - Mức 2 (Thông hiểu): ${formData.cognitiveLevelCounts.written.comprehension} câu
        - Mức 3 (Vận dụng): ${formData.cognitiveLevelCounts.written.application} câu
    
    Tỉ lệ điểm tham khảo (Tổng 10 điểm):
    - Phần trắc nghiệm chiếm ${formData.mcqRatio}% tổng số điểm.
    - Phần tự luận chiếm ${formData.writtenRatio}% tổng số điểm.

    ${formData.additionalRequirements ? `
    Yêu cầu bổ sung của người dùng (HÃY TUÂN THỦ NGHIÊM NGẶT):
    ---
    ${formData.additionalRequirements}
    ---
    ` : ''}

    Yêu cầu:
    1.  **Ma trận đề (matrix)**:
        - Phân tích danh sách "Các chủ đề và bài học". Tạo một hàng cho MỖI BÀI HỌC được liệt kê.
        - Phân bổ TỔNG SỐ câu hỏi trắc nghiệm (mcq) và tự luận (written) vào các hàng này.
        - Tổng số câu của từng loại và từng mức độ (recognition, comprehension, application) phải khớp chính xác với cấu trúc đề đã cho.
        - 'themeName' là tên chủ đề, 'lessonName' là tên bài học.
    2.  **Bản đặc tả (specTable)**:
        - Với mỗi bài học đã liệt kê trong ma trận, hãy viết mô tả "Mức độ đánh giá" (assessment levels).
        - 'description.recognition': Mô tả những gì học sinh cần nhận biết/nhớ được từ bài học đó.
        - 'description.comprehension': Mô tả những gì học sinh cần hiểu/giải thích được.
        - 'description.application': Mô tả những gì học sinh cần vận dụng được vào thực tế hoặc giải quyết vấn đề.
        - Nội dung đặc tả phải bám sát nội dung SGK đã cung cấp.

    Chỉ trả về một đối tượng JSON tuân thủ đúng schema. Không thêm bất kỳ văn bản giải thích nào.
    `;
    
    return await generateWithModelFallback<TestMatrix>(prompt, formData.fileImages || [], matrixSchema, 0.2, "tạo ma trận đề");
};
export const generateTestFromGemini = async (formData: FormData, matrix: TestMatrix): Promise<GeneratedTest> => {
  if (!getAiInstance()) {
    throw new Error("Lỗi: API Key chưa được thiết lập. Vui lòng vào phần 'Cấu hình API Key' để nhập key của bạn.");
  }
  
  const mcqDistributionText = Object.entries(formData.mcqTypeCounts)
    .map(([key, value]) => {
      if (value > 0) {
        let typeName = '';
        switch (key) {
          case 'multipleChoice': typeName = 'Nhiều lựa chọn (A, B, C, D)'; break;
          case 'trueFalse': typeName = 'Đúng - Sai'; break;
          case 'matching': typeName = 'Ghép đôi'; break;
          case 'fillBlank': typeName = 'Điền khuyết'; break;
        }
        return `- ${typeName}: ${value} câu`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');

  const themesAndLessons = formData.subjectThemes
      .map(theme => {
          const lessons = theme.lessons.map(l => `  - Bài học: "${l.name}" (dựa trên nội dung từ trang ${l.startPage} đến trang ${l.endPage}).`).join('\n');
          return `- Chủ đề: "${theme.name}" bao gồm:\n${lessons}`;
      })
      .join('\n');

  const prompt = `
    Bạn là một trợ lý chuyên tạo đề kiểm tra cho học sinh tiểu học tại Việt Nam, tuân thủ nghiêm ngặt theo Thông tư 27/2020/TT-BGDĐT.

    Nhiệm vụ: Tạo một đề kiểm tra hoàn chỉnh cho môn ${formData.subject} Lớp ${formData.className} dựa trên Ma trận và Bản đặc tả đã cung cấp.

    Hãy tạo một đề kiểm tra hoàn chỉnh dựa trên MA TRẬN ĐỀ sau đây (ma trận này được tạo theo từng BÀI HỌC):
    ---
    ${JSON.stringify(matrix.matrix, null, 2)}
    ---

    ${formData.fileContent ? `
    Nội dung tham khảo từ sách giáo khoa (bao gồm văn bản và hình ảnh):
    ---
    (Văn bản)
    ${formData.fileContent}
    ---
    (Các hình ảnh liên quan cũng được cung cấp trong yêu cầu này. Hãy sử dụng chúng làm ngữ cảnh khi cần thiết, đặc biệt cho các câu hỏi yêu cầu phân tích hình ảnh.)
    ` : `
    Bối cảnh: Dựa trên chương trình giáo dục phổ thông (GDPT) mới của Việt Nam và các chủ đề đã liệt kê để soạn thảo câu hỏi phù hợp với trình độ học sinh.
    `}
    
    Yêu cầu quan trọng:
    -   Nội dung đề phải bám sát vào "Các chủ đề và bài học trọng tâm" sau đây và phạm vi trang tương ứng:
${themesAndLessons}
    -   Điểm số cho từng câu hỏi sẽ được tính toán sau dựa trên mức độ nhận thức của nó. Bạn chỉ cần tập trung vào việc tạo ra câu hỏi chất lượng.
    -   Tổng số câu trắc nghiệm cần tạo là ${formData.mcqCount}. Hãy tạo ra số lượng câu hỏi chính xác cho mỗi dạng như sau:
${mcqDistributionText || 'Không có câu hỏi trắc nghiệm nào được yêu cầu.'}
    -   Tạo ra số lượng câu hỏi chính xác cho mỗi bài học ('topic'), mỗi loại (trắc nghiệm/tự luận) và mỗi mức độ nhận thức như đã quy định trong ma trận.
    -   Nội dung câu hỏi phải liên quan mật thiết đến "topic" (bài học) tương ứng trong ma trận và dựa trên kiến thức của bài học đó, ĐẶC BIỆT chú ý đến PHẠM VI TRANG đã được chỉ định.
    -   Nếu một câu hỏi liên quan đến một hình ảnh, hãy mô tả hình ảnh đó một cách ngắn gọn trong câu hỏi nếu cần.
    -   Ngôn ngữ phải phù hợp với học sinh tiểu học.
    -   Đối với dạng "Nhiều lựa chọn": phải có 4 lựa chọn và chỉ có một đáp án đúng. Các lựa chọn chỉ chứa nội dung đáp án, KHÔNG bao gồm các ký hiệu A, B, C, D ở đầu.
    -   Đối với dạng "Đúng - Sai": câu trả lời đúng phải là true (Đúng) hoặc false (Sai).
    -   Đối với dạng "Ghép đôi": tạo một câu dẫn (prompt) và một bộ các cặp (pairs) tương ứng, thường từ 3-5 cặp.
    -   Đối với dạng "Điền khuyết": câu hỏi (questionText) phải chứa một ký tự gạch dưới dài '___' để biểu thị chỗ trống cần điền.
    ${formData.writtenType === 'practice' ? '-   Phần phi trắc nghiệm: Chỉ tạo các câu hỏi THỰC HÀNH (yêu cầu học sinh thao tác trên máy tính hoặc thiết bị).' : ''}
    ${formData.writtenType === 'essay' ? '-   Phần phi trắc nghiệm: Chỉ tạo các câu hỏi TỰ LUẬN (yêu cầu học sinh viết câu trả lời, giải thích).' : ''}
    ${formData.writtenType === 'both' ? '-   Phần phi trắc nghiệm: Tạo kết hợp cả câu hỏi TỰ LUẬN và THỰC HÀNH.' : ''}
    -   Câu hỏi tự luận/thực hành cần có câu trả lời mẫu hoặc hướng dẫn thực hiện/chấm điểm.

    ${formData.additionalRequirements ? `
    Yêu cầu bổ sung của người dùng (HÃY TUÂN THỦ NGHIÊM NGẶT khi soạn câu hỏi):
    ---
    ${formData.additionalRequirements}
    ---
    ` : ''}

    Vui lòng trả về kết quả dưới dạng JSON theo đúng cấu trúc đã định nghĩa. Nếu một loại câu hỏi không được yêu cầu hoặc không có câu nào được tạo cho loại đó, hãy trả về một mảng rỗng cho loại đó.
  `;

  const multimodalContents = createMultimodalContent(prompt, formData.fileImages || []);

  try {
    const parsedData = await generateWithModelFallback<any>(prompt, formData.fileImages || [], testSchema, 0.7, "tạo đề kiểm tra");
    
    // Sanitize Multiple Choice options to remove redundant A, B, C, D prefixes if AI included them
    const sanitizeOptions = (options: string[]) => {
        return options.map(opt => {
            const trimmed = opt.trim();
            // Match Patterns like "A. Content", "AContent", "A: Content" etc.
            const regex = /^[A-D](\.|\:|\s|\-)+\s*/i;
            return trimmed.replace(regex, '');
        });
    };

    const sanitizedMcqs = (parsedData.multipleChoiceQuestions || []).map((q: any) => ({
        ...q,
        options: sanitizeOptions(q.options || []),
        correctAnswer: sanitizeOptions([q.correctAnswer || ''])[0]
    }));

    const finalData: GeneratedTest = {
        multipleChoiceQuestions: sanitizedMcqs,
        trueFalseQuestions: parsedData.trueFalseQuestions || [],
        matchingQuestions: parsedData.matchingQuestions || [],
        fillBlankQuestions: parsedData.fillBlankQuestions || [],
        writtenQuestions: parsedData.writtenQuestions || [],
    };
    
    if (!finalData.writtenQuestions) {
        throw new Error("Phản hồi từ AI không có cấu trúc như mong đợi (thiếu câu hỏi tự luận).");
    }

    return finalData;

  } catch (error) {
    throw handleGeminiError(error, "tạo đề kiểm tra");
  }
};

export const generateSolutionFromGemini = async (testData: GeneratedTest, formData: FormData): Promise<TestSolution> => {
    if (!getAiInstance()) {
        throw new Error("Lỗi: API Key chưa được thiết lập. Vui lòng vào phần 'Cấu hình API Key' để nhập key của bạn.");
    }
    const writtenQuestionsText = testData.writtenQuestions.map((q, index) => `Câu ${index + 1}: ${q.questionText}`).join('\n');
    const writtenScore = (formData.writtenRatio / 100 * 10);
    const pointsPerWritten = testData.writtenQuestions.length > 0 ? writtenScore / testData.writtenQuestions.length : 0;

    const prompt = `
    Bạn là một chuyên gia giáo dục tiểu học, nhiệm vụ của bạn là tạo ra một hướng dẫn chấm điểm chi tiết và công bằng cho các câu hỏi tự luận của một đề kiểm tra.

    Môn học: ${formData.subject}
    Tổng điểm cho phần tự luận: ${writtenScore} điểm.
    Số câu tự luận: ${testData.writtenQuestions.length}
    Điểm trung bình mỗi câu: ${pointsPerWritten.toFixed(2)} điểm.

    Đây là các câu hỏi tự luận cần tạo hướng dẫn chấm:
    ---
    ${writtenQuestionsText}
    ---
    
    Yêu cầu:
    1.  Với MỖI câu hỏi tự luận ở trên, hãy cung cấp một "hướng dẫn chấm chi tiết".
    2.  Hướng dẫn này cần nêu rõ các ý chính mà học sinh cần trả lời để đạt điểm tối đa.
    3.  Phân bổ điểm một cách hợp lý cho từng ý hoặc từng phần của câu trả lời. Tổng điểm cho mỗi câu hỏi phải gần đúng với điểm trung bình đã tính ở trên.
    4.  Đảm bảo rằng 'questionText' trong output JSON phải khớp chính xác với câu hỏi đã cho.
    5.  Ngôn ngữ phải rõ ràng, dễ hiểu cho giáo viên chấm bài.

    Chỉ trả về một đối tượng JSON tuân thủ đúng schema đã cho.
    `;
    
    try {
        return await generateWithModelFallback<TestSolution>(prompt, [], solutionSchema, 0.3, "tạo đáp án và hướng dẫn chấm");
    } catch (error) {
        throw handleGeminiError(error, "tạo đáp án và hướng dẫn chấm");
    }
};