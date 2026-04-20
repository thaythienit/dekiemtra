
import React, { useState, useCallback, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { FormData, GeneratedTest, TestMatrix, SavedTest, TestSolution } from './types.ts';
import Header from './components/Header.tsx';
import FormSection from './components/FormSection.tsx';
import GeneratedTestComponent from './components/GeneratedTest.tsx';
import TestMatrixComponent from './components/TestMatrixComponent.tsx';
import SavedTestsList from './components/SavedTestsList.tsx';
import SolutionComponent from './components/SolutionComponent.tsx';
import { initializeGemini, generateMatrixFromGemini, generateTestFromGemini, generateSolutionFromGemini, validateApiKey } from './services/geminiService.ts';
import { exportTestToDocx, exportTestWithSolutionToDocx, exportFullBundleToDocx } from './services/docxService.ts';
import ProgressBar from './components/ProgressBar.tsx';
import { KeyIcon, EyeIcon, EyeOffIcon, CheckCircleIcon } from './components/IconComponents.tsx';


// Configure the PDF.js worker from a CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@^4.4.183/build/pdf.worker.mjs`;

const LOCAL_STORAGE_KEY = 'savedElementaryTests';
const LOCAL_STORAGE_API_KEY = 'geminiApiKey';

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    schoolName: '',
    subject: '',
    className: '',
    testName: 'Kiểm tra Định kỳ Cuối học kì 1',
    schoolYear: '2023 - 2024',
    mcqRatio: 70,
    writtenRatio: 30,
    mcqCount: 7,
    writtenCount: 3,
    totalQuestionCount: 10,
    cognitiveLevelCounts: {
      mcq: { recognition: 4, comprehension: 2, application: 1 },
      written: { recognition: 1, comprehension: 1, application: 1 },
    },
    fileContent: '', 
    fileImages: [],
    subjectThemes: [],
    timeLimit: 40,
    mcqTypeCounts: {
      multipleChoice: 7,
      trueFalse: 0,
      matching: 0,
      fillBlank: 0,
    },
    additionalRequirements: '',
  });

  const [apiKey, setApiKey] = useState('');
  const [isKeyValidating, setIsKeyValidating] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [perPageContent, setPerPageContent] = useState<{ text: string; image: string }[]>([]);
  
  const [testMatrix, setTestMatrix] = useState<TestMatrix | null>(null);
  const [generatedTest, setGeneratedTest] = useState<GeneratedTest | null>(null);
  const [solutionData, setSolutionData] = useState<TestSolution | null>(null);
  const [isMatrixLoading, setIsMatrixLoading] = useState<boolean>(false);
  const [isTestLoading, setIsTestLoading] = useState<boolean>(false);
  const [isSolutionLoading, setIsSolutionLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);

  useEffect(() => {
    try {
      const savedTestsJson = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedTestsJson) {
        setSavedTests(JSON.parse(savedTestsJson));
      }
      const storedApiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
      if (storedApiKey) {
        setApiKey(storedApiKey);
        initializeGemini(storedApiKey);
        setIsKeyValid(true); // Assume stored key is valid until an operation fails
      } else {
        setIsKeyValid(false); // No key, so it's not valid
      }
    } catch (error) {
      console.error("Không thể tải dữ liệu từ local storage:", error);
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (generatedTest) {
        event.preventDefault();
        event.returnValue = 'Bạn có chắc chắn muốn rời đi? Các thay đổi chưa được lưu sẽ bị mất.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [generatedTest]);

  useEffect(() => {
    let intervalId: number | undefined;
    if (isMatrixLoading || isTestLoading) {
      setLoadingProgress(0);
      intervalId = window.setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) {
            // Stop incrementing when we reach 95%
            return 95;
          }
          // Use a smaller, randomized increment for a smoother, more realistic feel.
          const increment = 0.5 + Math.random() * 1.5;
          return Math.min(prev + increment, 95);
        });
      }, 100); // Update every 100ms for a more fluid animation.
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isMatrixLoading, isTestLoading]);

  const handleApiKeyCheck = async () => {
    setIsKeyValidating(true);
    setError(null);
    const result = await validateApiKey(apiKey);
    if (result.valid) {
      localStorage.setItem(LOCAL_STORAGE_API_KEY, apiKey);
      initializeGemini(apiKey);
      setIsKeyValid(true);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_API_KEY);
      initializeGemini('');
      setIsKeyValid(false);
      setError(result.error || "API Key không hợp lệ.");
    }
    setIsKeyValidating(false);
  };
  
  const handleChangeKey = () => {
      setIsKeyValid(null);
      setError(null);
  };

  const updateSavedTests = (newSavedTests: SavedTest[]) => {
    setSavedTests(newSavedTests);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSavedTests));
    } catch (error) {
      console.error("Không thể lưu đề vào local storage:", error);
      if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.message.includes('exceeded the quota'))) {
        setError("Lỗi: Không đủ dung lượng lưu trữ trên trình duyệt để lưu đề này. Vui lòng xóa bớt các đề cũ.");
      } else {
        setError("Đã xảy ra lỗi khi lưu đề.");
      }
    }
  };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    setUploadedFileName(null);
    setPerPageContent([]);
    setFormData(prev => ({ ...prev, fileContent: '', fileImages: [] }));
    setError(null);
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Lỗi: Vui lòng chỉ tải lên file có định dạng .pdf.');
        e.target.value = '';
        return;
      }
      
      setUploadedFileName(file.name);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        
        const textItems: string[] = [];
        const imageItems: string[] = [];
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          
          const textContent = await page.getTextContent();
          
          let lastY, text = '';
          textContent.items.sort((a, b) => {
              if ('transform' in a && 'transform' in b) {
                  if (a.transform[5] > b.transform[5]) return -1;
                  if (a.transform[5] < b.transform[5]) return 1;
                  if (a.transform[4] < b.transform[4]) return -1;
                  if (a.transform[4] > b.transform[4]) return 1;
              }
              return 0;
          });

          for (let item of textContent.items) {
              if ('str' in item) {
                  if (lastY !== undefined && lastY !== item.transform[5]) {
                      text += '\n';
                  }
                  text += item.str;
                  if (lastY !== undefined && lastY === item.transform[5]) {
                    text += ' ';
                  }
                  lastY = item.transform[5];
              }
          }
          textItems.push(text);

          if (context) {
            const viewport = page.getViewport({ scale: 1.0 });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport, canvas } as any).promise;
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            imageItems.push(imageDataUrl.split(',')[1]);
          }
        }
        
        canvas.remove();

        const pageContents = textItems.map((text, index) => ({
            text,
            image: imageItems[index],
        }));
        setPerPageContent(pageContents);

        setFormData(prev => ({ ...prev, fileContent: file.name, fileImages: [] }));
        
        if (pageContents.length === 0 || pageContents.every(p => p.text.trim() === '' && !p.image)) {
          setError("Lỗi: Không tìm thấy nội dung văn bản hoặc hình ảnh nào trong file PDF.");
        } else {
          setError(null);
        }

      } catch (err) {
        console.error("Lỗi khi xử lý PDF:", err);
        setError('Không thể đọc được file PDF. File có thể bị hỏng hoặc không tương thích.');
        setUploadedFileName(null);
      }
    }
  };

  const getRelevantContent = (formData: FormData) => {
    const relevantPages = new Set<number>();
    formData.subjectThemes.forEach(theme => {
        theme.lessons.forEach(lesson => {
            if (lesson.startPage && lesson.endPage && lesson.endPage >= lesson.startPage) {
                for (let i = lesson.startPage; i <= lesson.endPage; i++) {
                    relevantPages.add(i);
                }
            }
        });
    });

    let relevantText = "";
    const relevantImages: string[] = [];
    
    if (relevantPages.size > 0 && perPageContent.length > 0) {
        relevantText = `Bối cảnh: Nội dung sau được trích xuất từ các trang có liên quan trong tài liệu học liệu.\n`;
        const sortedPages = Array.from(relevantPages).sort((a, b) => a - b);

        for (const pageNum of sortedPages) {
            const pageIndex = pageNum - 1;
            if (pageIndex >= 0 && pageIndex < perPageContent.length) {
                const content = perPageContent[pageIndex];
                relevantText += `\n--- NỘI DUNG TRANG ${pageNum} ---\n${content.text}`;
                if (content.image) {
                    relevantImages.push(content.image);
                }
            }
        }
    }

    return { relevantText, relevantImages };
  };

  const handleGenerateMatrix = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMatrixLoading(true);
    setError(null);
    setTestMatrix(null);
    setGeneratedTest(null);
    setSolutionData(null);

    try {
        const { relevantText, relevantImages } = getRelevantContent(formData);
        
        const payload: FormData = {
            ...formData,
            fileContent: relevantText,
            fileImages: relevantImages,
        };
        
        const matrixData = await generateMatrixFromGemini(payload);
        setTestMatrix(matrixData);
        setLoadingProgress(100);

    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('Đã xảy ra lỗi không xác định khi tạo ma trận.');
        }
    } finally {
      setIsMatrixLoading(false);
    }
  }, [formData, perPageContent]);

  const handleGenerateTest = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMatrix) {
        setError("Vui lòng tạo ma trận đề trước khi tạo đề kiểm tra.");
        return;
    }
    setIsTestLoading(true);
    setError(null);
    setGeneratedTest(null);
    setSolutionData(null);
    
    try {
        const { relevantText, relevantImages } = getRelevantContent(formData);

        const payload: FormData = {
            ...formData,
            fileContent: relevantText,
            fileImages: relevantImages,
        };

        const testData = await generateTestFromGemini(payload, testMatrix);
        setGeneratedTest(testData);
        setLoadingProgress(100);
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('Đã xảy ra lỗi không xác định khi tạo đề.');
        }
    } finally {
      setIsTestLoading(false);
    }
  }, [formData, testMatrix, perPageContent]);

  const handleGenerateSolution = useCallback(async () => {
    if (!generatedTest) return;

    setIsSolutionLoading(true);
    setError(null);
    setSolutionData(null);

    try {
        const solution = await generateSolutionFromGemini(generatedTest, formData);
        setSolutionData(solution);
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('Đã xảy ra lỗi không xác định khi tạo hướng dẫn chấm.');
        }
    } finally {
        setIsSolutionLoading(false);
    }
  }, [generatedTest, formData]);

  const handleSaveTest = useCallback(() => {
    if (!generatedTest) return;

    const formDataToSave = { ...formData };
    formDataToSave.fileContent = '';
    formDataToSave.fileImages = [];

    const newSavedTest: SavedTest = {
      id: Date.now().toString(),
      name: `Đề ${formData.subject} - ${new Date().toLocaleString('vi-VN')}`,
      createdAt: new Date().toISOString(),
      testData: generatedTest,
      formData: formDataToSave,
    };
    
    updateSavedTests([newSavedTest, ...savedTests]);
    if(!error) {
        alert("Đã lưu đề kiểm tra thành công!");
    }
  }, [generatedTest, formData, savedTests, error]);

  const handleLoadTest = useCallback((testId: string) => {
    const testToLoad = savedTests.find(t => t.id === testId);
    if (testToLoad) {
      let loadedFormData = { ...testToLoad.formData };

      // Backwards compatibility for tests saved before decoupling scores/counts
      if (!('mcqRatio' in loadedFormData) || ('cognitiveLevelScores' in loadedFormData)) {
        loadedFormData.mcqRatio = 70;
        loadedFormData.writtenRatio = 30;
        delete (loadedFormData as any).cognitiveLevelScores;
      }

      if (!('schoolName' in loadedFormData)) {
        loadedFormData.schoolName = '';
      }
      
      if (!('testName' in loadedFormData)) {
        loadedFormData.testName = 'ĐỀ KIỂM TRA CUỐI HỌC KỲ';
      }

      if (!('schoolYear' in loadedFormData)) {
        const currentYear = new Date().getFullYear();
        loadedFormData.schoolYear = `${currentYear} – ${currentYear + 1}`;
      }
      
      if (!('cognitiveLevelCounts' in loadedFormData) && ('recognitionRatio' in loadedFormData)) {
        const { mcqCount, writtenCount, recognitionRatio, comprehensionRatio } = loadedFormData as any;
        const mcqRec = Math.round(mcqCount * (recognitionRatio / 100));
        const mcqComp = Math.round(mcqCount * (comprehensionRatio / 100));
        const mcqApp = mcqCount - mcqRec - mcqComp;
        const writtenRec = Math.round(writtenCount * (recognitionRatio / 100));
        const writtenComp = Math.round(writtenCount * (comprehensionRatio / 100));
        const writtenApp = writtenCount - writtenRec - writtenComp;
        loadedFormData.cognitiveLevelCounts = {
          mcq: { recognition: mcqRec, comprehension: mcqComp, application: mcqApp },
          written: { recognition: writtenRec, comprehension: writtenComp, application: writtenApp },
        };
        delete (loadedFormData as any).recognitionRatio;
        delete (loadedFormData as any).comprehensionRatio;
        delete (loadedFormData as any).applicationRatio;
      }

      setFormData(loadedFormData);
      setGeneratedTest(testToLoad.testData);
      setTestMatrix(null);
      setSolutionData(null);
      setError(null);
      setUploadedFileName(null);
      setPerPageContent([]); 
      setTimeout(() => {
          const generatedTestElement = document.getElementById('generated-test-section');
          if (generatedTestElement) {
              generatedTestElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
      }, 100);
    }
  }, [savedTests]);

  const handleDeleteTest = useCallback((testId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa đề kiểm tra này? Thao tác này không thể hoàn tác.")) {
      const updatedTests = savedTests.filter(t => t.id !== testId);
      updateSavedTests(updatedTests);
    }
  }, [savedTests]);


  const handleExport = (editedData: GeneratedTest) => {
    exportTestToDocx(editedData, formData);
  };

  const handleExportWithSolution = () => {
    if (generatedTest && solutionData) {
        exportTestWithSolutionToDocx(
            generatedTest,
            solutionData,
            formData
        );
    }
  };

  const handleExportFullBundle = (editedTest: GeneratedTest) => {
    if (testMatrix && generatedTest) {
        exportFullBundleToDocx({
            matrixData: testMatrix,
            testData: editedTest,
            solutionData: solutionData,
            formData: formData
        });
    }
  };
  
  return (
    <div className="min-h-screen bg-blue-50 text-gray-900 font-sans">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          
           <div className="mb-8 p-4 sm:p-6 bg-white rounded-2xl shadow-lg border border-amber-300 bg-amber-50">
              <div className="flex items-center mb-3">
                  <KeyIcon className="w-6 h-6 mr-3 text-amber-600" />
                  <h2 className="text-xl font-bold text-gray-800">Cấu hình API Key</h2>
              </div>

              {isKeyValid ? (
                  <>
                      <div className="flex items-center gap-2 p-3 bg-green-100 border border-green-200 rounded-md">
                          <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <p className="text-sm text-green-800 font-medium">API Key hợp lệ và đã được lưu.</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                          <p className="text-sm text-gray-600 font-mono bg-gray-200 px-2 py-1 rounded">•••••••••••••••••{apiKey.slice(-4)}</p>
                          <button
                              onClick={handleChangeKey}
                              className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                          >
                              Thay đổi
                          </button>
                      </div>
                  </>
              ) : (
                  <>
                      <p className="text-sm text-gray-600 mb-3">
                          Để sử dụng ứng dụng, bạn cần có Google AI API Key.
                          <button 
                            type="button" 
                            onClick={() => setIsGuideOpen(true)} 
                            className="ml-1 text-blue-600 hover:underline font-medium focus:outline-none"
                          >
                            Xem hướng dẫn.
                          </button>
                      </p>
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                          <div className="relative flex-grow w-full">
                              <input 
                                  type={showApiKey ? 'text' : 'password'}
                                  placeholder="Dán API Key của bạn vào đây"
                                  value={apiKey}
                                  onChange={(e) => setApiKey(e.target.value)}
                                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                  aria-label="API Key Input"
                              />
                              <button
                                  type="button"
                                  onClick={() => setShowApiKey(!showApiKey)}
                                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                                  aria-label={showApiKey ? "Ẩn key" : "Hiển thị key"}
                              >
                                  {showApiKey ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                              </button>
                          </div>
                          <button 
                              onClick={handleApiKeyCheck}
                              disabled={isKeyValidating}
                              className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                              {isKeyValidating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 'Lưu & Kiểm tra'}
                          </button>
                      </div>
                      {error && isKeyValid === false && <p className="text-sm text-red-600 mt-2">{error}</p>}
                  </>
              )}
          </div>
          
          <SavedTestsList
            savedTests={savedTests}
            onLoad={handleLoadTest}
            onDelete={handleDeleteTest}
          />
          
          <FormSection 
            formData={formData}
            setFormData={setFormData}
            onGenerateMatrix={handleGenerateMatrix}
            onGenerateTest={handleGenerateTest}
            onFileChange={handleFileChange}
            fileName={uploadedFileName}
            isMatrixLoading={isMatrixLoading}
            isTestLoading={isTestLoading}
            error={error}
            hasMatrix={!!testMatrix}
            isKeyConfigured={!!isKeyValid}
          />

          {(isMatrixLoading || isTestLoading) && (
            <div className="mt-8 p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
                <ProgressBar 
                    progress={loadingProgress} 
                    text={isMatrixLoading ? 'AI đang phân tích để tạo ma trận...' : 'AI đang soạn câu hỏi theo ma trận...'}
                />
            </div>
          )}

          {testMatrix && !isMatrixLoading && (
            <TestMatrixComponent
              matrixData={testMatrix}
              formData={formData}
            />
          )}

          {generatedTest && !isTestLoading && (
            <div id="generated-test-section">
                <GeneratedTestComponent 
                    testData={generatedTest} 
                    onExport={handleExport}
                    onSave={handleSaveTest}
                    formData={formData}
                    onGenerateSolution={handleGenerateSolution}
                    isSolutionLoading={isSolutionLoading}
                    hasSolution={!!solutionData}
                    onExportWithSolution={handleExportWithSolution}
                    onExportFullBundle={handleExportFullBundle}
                />
            </div>
          )}
          
          {solutionData && !isSolutionLoading && generatedTest && (
            <SolutionComponent 
                testData={generatedTest}
                solutionData={solutionData}
                mcqRatio={formData.mcqRatio}
                writtenRatio={formData.writtenRatio}
            />
          )}

        </div>
      </main>
      <footer className="text-center py-4 text-sm text-gray-500 border-t border-gray-200 mt-8">
        <p>Phát triển bởi Hứa Văn Thiện. &copy; {new Date().getFullYear()}</p>
         <p>Điện thoại: 0843.48.2345</p>
      </footer>

      {isGuideOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
          onClick={() => setIsGuideOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-title"
        >
          <div 
            className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 sm:p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsGuideOpen(false)} 
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Đóng"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 id="guide-title" className="text-2xl font-bold text-gray-900 mb-6">Hướng dẫn lấy Google AI API Key</h3>
            <ol className="list-decimal list-inside space-y-4 text-gray-700">
              <li>
                Truy cập <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Google AI Studio</a> và đăng nhập bằng tài khoản Google của bạn.
              </li>
              <li>
                Ở trang chủ, tìm và nhấp vào nút <span className="font-semibold bg-gray-100 px-2 py-1 rounded-md text-gray-800">Get API Key</span>.
              </li>
              <li>
                Một cửa sổ sẽ hiện ra. Nhấp vào nút <span className="font-semibold bg-gray-100 px-2 py-1 rounded-md text-gray-800">Create API key in new project</span>.
              </li>
              <li>
                Key của bạn sẽ được tạo. Nhấp vào biểu tượng sao chép để lưu key vào clipboard.
              </li>
              <li>
                Quay lại ứng dụng, dán key vào ô "Cấu hình API Key" và nhấp <span className="font-semibold bg-gray-100 px-2 py-1 rounded-md text-gray-800">Lưu Key</span>.
              </li>
            </ol>
             <div className="mt-6 text-right">
                <button 
                    onClick={() => setIsGuideOpen(false)}
                    className="px-5 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Đã hiểu
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;