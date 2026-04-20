
import React, { useState } from 'react';
import type { FormData, SubjectTheme, Lesson } from '../types.ts';
import { TEXTBOOKS } from '../constants/textbooks.ts';
import LoadingSpinner from './LoadingSpinner.tsx';
import { BrainCircuitIcon, MatrixIcon, UploadIcon, PlusCircleIcon, TrashIcon, ChevronDownIcon, GripVerticalIcon, InfoIcon } from './IconComponents.tsx';

interface FormSectionProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onGenerateMatrix: (e: React.FormEvent) => void;
  onGenerateTest: (e: React.FormEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileName: string | null;
  isMatrixLoading: boolean;
  isTestLoading: boolean;
  error: string | null;
  hasMatrix: boolean;
  isKeyConfigured: boolean;
}

type Tab = 'params' | 'topics';

const FormSection: React.FC<FormSectionProps> = ({ 
  formData, 
  setFormData, 
  onGenerateMatrix, 
  onGenerateTest, 
  onFileChange,
  fileName,
  isMatrixLoading, 
  isTestLoading, 
  error,
  hasMatrix,
  isKeyConfigured,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('params');
  const [openThemes, setOpenThemes] = useState<Set<string>>(() => 
    new Set(formData.subjectThemes.length > 0 ? [formData.subjectThemes[0].id] : [])
  );
  
  // Available textbooks data based on current selection
  const availableData = TEXTBOOKS[formData.subject]?.[formData.className] || [];

  const handleAddFromTextbook = (templateTheme: SubjectTheme) => {
    const newThemeId = `theme-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setFormData(prev => ({
        ...prev,
        subjectThemes: [
            ...prev.subjectThemes,
            { 
                id: newThemeId, 
                name: templateTheme.name, 
                lessons: templateTheme.lessons.map(l => ({
                    ...l,
                    id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                }))
            }
        ]
    }));
    setOpenThemes(prev => new Set(prev).add(newThemeId));
  };

  const handleAddLessonFromTextbook = (themeId: string, templateLesson: Lesson) => {
    setFormData(prev => ({
        ...prev,
        subjectThemes: prev.subjectThemes.map(theme => 
            theme.id === themeId 
                ? { 
                    ...theme, 
                    lessons: [
                        ...theme.lessons, 
                        { 
                            ...templateLesson, 
                            id: `lesson-${Math.random().toString(36).substr(2, 9)}` 
                        }
                    ] 
                }
                : theme
        )
    }));
  };

  const [draggedItem, setDraggedItem] = useState<{ type: 'theme' | 'lesson'; themeId: string; lessonId?: string; index: number } | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ themeId: string; lessonId?: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubjectOrClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value,
      // Reset themes when subject/class changes to avoid confusion, or keep them?
      // User requested "lựa chọn Tên chủ đề và Tên bài học" so maybe we clear
      subjectThemes: [] 
    }));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) }));
  };
  
  const calculateLevelDistribution = (total: number) => {
    const recognition = Math.round(total * 0.5);
    const comprehension = Math.round(total * 0.3);
    const application = total - recognition - comprehension;
    return { recognition, comprehension, application: Math.max(0, application) };
  };

  const handleDistributionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value: rawValue } = e.target;
      const value = parseInt(rawValue, 10);
      if (isNaN(value)) return;

      const cleanValue = Math.max(0, value);

      setFormData(prev => {
          let mcqCount = prev.mcqCount;
          let writtenCount = prev.writtenCount;
          let mcqRatio = prev.mcqRatio;
          let mcqTypeCounts = prev.mcqTypeCounts;
          let cognitiveLevelCounts = prev.cognitiveLevelCounts;

          switch(name) {
              case 'mcqCount':
                  mcqCount = cleanValue;
                  mcqTypeCounts = { multipleChoice: mcqCount, trueFalse: 0, matching: 0, fillBlank: 0 };
                  cognitiveLevelCounts = { ...prev.cognitiveLevelCounts, mcq: calculateLevelDistribution(mcqCount) };
                  break;
              case 'writtenCount':
                  writtenCount = cleanValue;
                  cognitiveLevelCounts = { ...prev.cognitiveLevelCounts, written: calculateLevelDistribution(writtenCount) };
                  break;
              case 'mcqRatio': // This is for score ratio
                  mcqRatio = cleanValue > 100 ? 100 : cleanValue;
                  break;
              case 'multipleChoice':
              case 'trueFalse':
              case 'matching':
              case 'fillBlank':
                  mcqTypeCounts = { ...mcqTypeCounts, [name]: cleanValue };
                  mcqCount = Object.values(mcqTypeCounts).reduce((a: number, b: number) => a + b, 0);
                  cognitiveLevelCounts = { ...prev.cognitiveLevelCounts, mcq: calculateLevelDistribution(mcqCount) };
                  break;
          }
          
          const totalQuestionCount = mcqCount + writtenCount;

          return {
              ...prev,
              mcqCount,
              writtenCount,
              totalQuestionCount,
              mcqRatio,
              writtenRatio: 100 - mcqRatio,
              mcqTypeCounts,
              cognitiveLevelCounts,
          };
      });
  };

  const handleCognitiveLevelChange = (type: 'mcq' | 'written', level: 'recognition' | 'comprehension' | 'application', value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    setFormData(prev => ({
        ...prev,
        cognitiveLevelCounts: {
            ...prev.cognitiveLevelCounts,
            [type]: {
                ...prev.cognitiveLevelCounts[type],
                [level]: Math.max(0, numValue),
            }
        }
    }));
  };

  const handleToggleTheme = (themeId: string) => {
      setOpenThemes(prev => {
          const newSet = new Set(prev);
          if (newSet.has(themeId)) {
              newSet.delete(themeId);
          } else {
              newSet.add(themeId);
          }
          return newSet;
      });
  };

  const handleAddTheme = () => {
    const newThemeId = `theme-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setFormData(prev => ({
        ...prev,
        subjectThemes: [
            ...prev.subjectThemes,
            { 
                id: newThemeId, 
                name: '', 
                lessons: [{ id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: '', startPage: 1, endPage: 1 }] 
            }
        ]
    }));
    setOpenThemes(prev => new Set(prev).add(newThemeId));
  };

  const handleRemoveTheme = (themeIdToRemove: string) => {
    setFormData(prev => ({
        ...prev,
        subjectThemes: prev.subjectThemes.filter(theme => theme.id !== themeIdToRemove)
    }));
  };

  const handleThemeChange = (themeId: string, value: string) => {
    setFormData(prev => ({
        ...prev,
        subjectThemes: prev.subjectThemes.map(theme => 
            theme.id === themeId ? { ...theme, name: value } : theme
        )
    }));
  };

  const handleAddLesson = (themeId: string) => {
    setFormData(prev => ({
        ...prev,
        subjectThemes: prev.subjectThemes.map(theme => 
            theme.id === themeId 
                ? { ...theme, lessons: [...theme.lessons, { id: `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: '', startPage: 1, endPage: 1 }] }
                : theme
        )
    }));
  };
  
  const handleRemoveLesson = (themeId: string, lessonIdToRemove: string) => {
    setFormData(prev => ({
        ...prev,
        subjectThemes: prev.subjectThemes.map(theme => 
            theme.id === themeId 
                ? { ...theme, lessons: theme.lessons.filter(lesson => lesson.id !== lessonIdToRemove) }
                : theme
        )
    }));
  };

  const handleLessonChange = (themeId: string, lessonId: string, field: keyof Lesson, value: string | number) => {
     setFormData(prev => ({
        ...prev,
        subjectThemes: prev.subjectThemes.map(theme => 
            theme.id === themeId 
                ? { 
                    ...theme, 
                    lessons: theme.lessons.map(lesson => 
                        lesson.id === lessonId ? { ...lesson, [field]: value } : lesson
                    )
                  }
                : theme
        )
    }));
  };

  const handleDragStart = (type: 'theme' | 'lesson', themeId: string, lessonId: string | undefined, index: number) => {
    setDraggedItem({ type, themeId, lessonId, index });
  };
  
  const handleDragOver = (e: React.DragEvent, themeId: string, lessonId?: string) => {
      e.preventDefault();
      if (draggedItem && (draggedItem.lessonId ? draggedItem.themeId === themeId : true)) {
          setDragOverInfo({ themeId, lessonId });
      }
  };

  const handleDrop = (targetThemeId: string, targetLessonId?: string, targetIndex?: number) => {
    if (!draggedItem) return;

    if (draggedItem.type === 'theme' && targetIndex !== undefined) {
        const newThemes = [...formData.subjectThemes];
        const [draggedTheme] = newThemes.splice(draggedItem.index, 1);
        newThemes.splice(targetIndex, 0, draggedTheme);
        setFormData(prev => ({ ...prev, subjectThemes: newThemes }));
    }

    if (draggedItem.type === 'lesson' && draggedItem.themeId === targetThemeId && targetIndex !== undefined) {
        const newThemes = formData.subjectThemes.map(theme => {
            if (theme.id === targetThemeId) {
                const newLessons = [...theme.lessons];
                const [draggedLesson] = newLessons.splice(draggedItem.index, 1);
                newLessons.splice(targetIndex, 0, draggedLesson);
                return { ...theme, lessons: newLessons };
            }
            return theme;
        });
        setFormData(prev => ({ ...prev, subjectThemes: newThemes }));
    }

    setDraggedItem(null);
    setDragOverInfo(null);
  };
  
  const mcqCognitiveTotal = formData.cognitiveLevelCounts.mcq.recognition + formData.cognitiveLevelCounts.mcq.comprehension + formData.cognitiveLevelCounts.mcq.application;
  const writtenCognitiveTotal = formData.cognitiveLevelCounts.written.recognition + formData.cognitiveLevelCounts.written.comprehension + formData.cognitiveLevelCounts.written.application;

  const isMcqTotalMismatch = mcqCognitiveTotal !== formData.mcqCount;
  const isWrittenTotalMismatch = writtenCognitiveTotal !== formData.writtenCount;

  const isFormValid = formData.subject.trim() !== '' && 
                      formData.subjectThemes.length > 0 &&
                      formData.subjectThemes.every(theme => 
                        theme.name.trim() !== '' &&
                        theme.lessons.length > 0 &&
                        theme.lessons.every(lesson => lesson.name.trim() !== '' && lesson.startPage > 0 && lesson.endPage >= lesson.startPage)
                      ) &&
                      formData.totalQuestionCount > 0 &&
                      !isMcqTotalMismatch &&
                      !isWrittenTotalMismatch;
  
  const isReadyToGenerate = isKeyConfigured && isFormValid;

  const TabButton = ({ tabId, children, controls }: { tabId: Tab; children: React.ReactNode; controls: string; }) => (
    <button
      type="button"
      role="tab"
      id={`tab-${tabId}`}
      aria-controls={controls}
      aria-selected={activeTab === tabId}
      onClick={() => setActiveTab(tabId)}
      className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ${
        activeTab === tabId
          ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
          : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );

  return (
    <form className="p-4 sm:p-6 lg:p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
      <div className="border-b border-gray-200 mb-6">
        <div role="tablist" className="-mb-px flex space-x-2 sm:space-x-4" aria-label="Form sections">
          <TabButton tabId="params" controls="tabpanel-params" children="1. Thông số & Tỉ lệ" />
          <TabButton tabId="topics" controls="tabpanel-topics" children="2. Nội dung kiểm tra" />
        </div>
      </div>

      <div className="space-y-8 min-h-[400px]">
        {/* Tab 1: Test Parameters & Ratios */}
        <div 
          id="tabpanel-params"
          role="tabpanel"
          aria-labelledby="tab-params"
          hidden={activeTab !== 'params'} 
          className="space-y-8"
        >
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">Tên trường</label>
              <input type="text" name="schoolName" id="schoolName" value={formData.schoolName} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Trường Tiểu học ABC" />
            </div>
            <div className="space-y-2">
              <label htmlFor="testName" className="block text-sm font-medium text-gray-700">Bài kiểm tra</label>
              <input type="text" name="testName" id="testName" value={formData.testName} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Kiểm tra Cuối học kì 1" />
            </div>
            <div className="space-y-2">
              <label htmlFor="schoolYear" className="block text-sm font-medium text-gray-700">Năm học</label>
              <input type="text" name="schoolYear" id="schoolYear" value={formData.schoolYear} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="2023 - 2024" />
            </div>
            <div className="space-y-2">
              <label htmlFor="className" className="block text-sm font-medium text-gray-700">Lớp</label>
              <select 
                name="className" 
                id="className" 
                value={formData.className} 
                onChange={handleSubjectOrClassChange} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Chọn lớp --</option>
                <option value="3">Lớp 3</option>
                <option value="4">Lớp 4</option>
                <option value="5">Lớp 5</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Môn học <span className="text-red-500">*</span></label>
              <select 
                name="subject" 
                id="subject" 
                value={formData.subject} 
                onChange={handleSubjectOrClassChange} 
                required 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Chọn môn học --</option>
                <option value="Tin học">Tin học</option>
                <option value="Công nghệ">Công nghệ</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700">Thời gian làm bài (phút)</label>
              <input type="number" name="timeLimit" id="timeLimit" value={formData.timeLimit} onChange={handleSliderChange} min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="additionalRequirements" className="block text-sm font-medium text-gray-700">Yêu cầu khác (Ví dụ: Đề thi có nhiều bài toán thực tế, ngôn ngữ dí dỏm,...)</label>
            <textarea
              name="additionalRequirements"
              id="additionalRequirements"
              value={formData.additionalRequirements}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Nhập các yêu cầu bổ sung của bạn tại đây để AI thực hiện chính xác hơn..."
            />
          </div>

           <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Phân bổ Tỉ lệ Điểm (Tổng = 10 điểm)</h3>
             <div className="space-y-3">
                  <div>
                      <label className="block text-sm font-medium text-gray-700">Điểm Trắc nghiệm: {(formData.mcqRatio / 10).toFixed(1)} / Điểm Tự luận: {(formData.writtenRatio / 10).toFixed(1)}</label>
                      <input 
                          type="range" 
                          name="mcqRatio" 
                          min="0" 
                          max="100" 
                          step="5"
                          value={formData.mcqRatio} 
                          onChange={handleDistributionChange} 
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                      />
                  </div>
              </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Phân bổ Số lượng Câu hỏi</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-6">
                 <div className="space-y-2">
                    <label htmlFor="mcqCount" className="block text-sm font-medium text-gray-700">Số câu trắc nghiệm</label>
                    <input type="number" name="mcqCount" id="mcqCount" value={formData.mcqCount} onChange={handleDistributionChange} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                    <label htmlFor="writtenCount" className="block text-sm font-medium text-gray-700">Số câu tự luận</label>
                    <input type="number" name="writtenCount" id="writtenCount" value={formData.writtenCount} onChange={handleDistributionChange} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
                 <div className="space-y-2">
                    <label htmlFor="totalQuestionCount" className="block text-sm font-medium text-gray-700">Tổng số câu hỏi</label>
                    <input type="number" name="totalQuestionCount" id="totalQuestionCount" value={formData.totalQuestionCount} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 focus:outline-none" />
                </div>
            </div>
             <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Chi tiết câu hỏi trắc nghiệm</h4>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <label htmlFor="multipleChoice" className="block text-sm text-gray-900">Nhiều lựa chọn</label>
                        <input id="multipleChoice" name="multipleChoice" type="number" min="0" value={formData.mcqTypeCounts.multipleChoice} onChange={handleDistributionChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="trueFalse" className="block text-sm text-gray-900">Đúng - Sai</label>
                        <input id="trueFalse" name="trueFalse" type="number" min="0" value={formData.mcqTypeCounts.trueFalse} onChange={handleDistributionChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="matching" className="block text-sm text-gray-900">Ghép đôi</label>
                        <input id="matching" name="matching" type="number" min="0" value={formData.mcqTypeCounts.matching} onChange={handleDistributionChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="fillBlank" className="block text-sm text-gray-900">Điền khuyết</label>
                        <input id="fillBlank" name="fillBlank" type="number" min="0" value={formData.mcqTypeCounts.fillBlank} onChange={handleDistributionChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                 </div>
            </div>
          </div>
          
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Phân bổ mức độ nhận thức (Số câu)</h3>
                    <button 
                        type="button"
                        onClick={() => {
                            setFormData(prev => ({
                                ...prev,
                                cognitiveLevelCounts: {
                                    mcq: calculateLevelDistribution(prev.mcqCount),
                                    written: calculateLevelDistribution(prev.writtenCount)
                                }
                            }));
                        }}
                        className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 border border-blue-200 transition-colors"
                    >
                        Áp dụng tỉ lệ chuẩn (50/30/20)
                    </button>
                </div>
                <div className="overflow-x-auto p-1">
                    <table className="min-w-full border border-gray-300 text-center text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border-b border-gray-300 font-medium text-gray-600 text-left">Loại câu hỏi</th>
                                <th className="p-2 border-b border-gray-300 font-medium text-gray-600">Mức 1 (Nhận biết)</th>
                                <th className="p-2 border-b border-gray-300 font-medium text-gray-600">Mức 2 (Thông hiểu)</th>
                                <th className="p-2 border-b border-gray-300 font-medium text-gray-600">Mức 3 (Vận dụng)</th>
                                <th className="p-2 border-b border-gray-300 font-bold text-gray-800">Tổng</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-white">
                                <td className="p-2 border-b border-gray-200 font-medium text-left">Trắc nghiệm</td>
                                <td className="p-2 border-b border-gray-200">
                                    <input type="number" min="0" value={formData.cognitiveLevelCounts.mcq.recognition} onChange={(e) => handleCognitiveLevelChange('mcq', 'recognition', e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                </td>
                                <td className="p-2 border-b border-gray-200">
                                    <input type="number" min="0" value={formData.cognitiveLevelCounts.mcq.comprehension} onChange={(e) => handleCognitiveLevelChange('mcq', 'comprehension', e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                </td>
                                <td className="p-2 border-b border-gray-200">
                                    <input type="number" min="0" value={formData.cognitiveLevelCounts.mcq.application} onChange={(e) => handleCognitiveLevelChange('mcq', 'application', e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                </td>
                                <td className={`p-2 border-b border-gray-200 font-bold ${isMcqTotalMismatch ? 'text-red-600 bg-red-50' : 'text-gray-800'}`}>
                                    {mcqCognitiveTotal} / {formData.mcqCount}
                                </td>
                            </tr>
                            <tr className="bg-white">
                                <td className="p-2 font-medium text-left">Tự luận</td>
                                <td className="p-2">
                                    <input type="number" min="0" value={formData.cognitiveLevelCounts.written.recognition} onChange={(e) => handleCognitiveLevelChange('written', 'recognition', e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                </td>
                                <td className="p-2">
                                    <input type="number" min="0" value={formData.cognitiveLevelCounts.written.comprehension} onChange={(e) => handleCognitiveLevelChange('written', 'comprehension', e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                </td>
                                <td className="p-2">
                                    <input type="number" min="0" value={formData.cognitiveLevelCounts.written.application} onChange={(e) => handleCognitiveLevelChange('written', 'application', e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                                </td>
                                <td className={`p-2 font-bold ${isWrittenTotalMismatch ? 'text-red-600 bg-red-50' : 'text-gray-800'}`}>
                                    {writtenCognitiveTotal} / {formData.writtenCount}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    {(isMcqTotalMismatch || isWrittenTotalMismatch) && 
                        <p className="text-xs text-red-600 mt-2 text-center">Tổng số câu phân bổ theo mức độ phải khớp với tổng số câu đã thiết lập.</p>
                    }
                </div>
            </div>
        </div>
        
        {/* Tab 2: Lesson Topics */}
        <div 
            id="tabpanel-topics"
            role="tabpanel"
            aria-labelledby="tab-topics"
            hidden={activeTab !== 'topics'} 
            className="space-y-8"
        >
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <label className="block text-sm font-medium text-gray-700">
                        Nội dung cần tạo đề <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {availableData.length > 0 && (
                            <div className="relative group">
                                <button type="button" className="flex items-center px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100">
                                    <MatrixIcon className="w-4 h-4 mr-1.5" />
                                    Chọn từ SGK
                                    <ChevronDownIcon className="w-4 h-4 ml-1" />
                                </button>
                                <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-20 hidden group-hover:block max-h-80 overflow-y-auto">
                                    <div className="p-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100 uppercase tracking-wider">
                                        Chọn chủ đề từ {formData.subject} {formData.className}
                                    </div>
                                    {availableData.map(themeTemplate => (
                                        <button
                                            key={themeTemplate.id}
                                            type="button"
                                            onClick={() => handleAddFromTextbook(themeTemplate)}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors border-b border-gray-50 last:border-0"
                                        >
                                            {themeTemplate.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button type="button" onClick={handleAddTheme} className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100">
                            <PlusCircleIcon className="w-4 h-4 mr-1.5"/>
                            Thêm chủ đề mới
                        </button>
                    </div>
                </div>

                {availableData.length > 0 && formData.subjectThemes.length === 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
                        <InfoIcon className="w-10 h-10 text-orange-400 mx-auto mb-3" />
                        <h4 className="text-orange-900 font-semibold mb-1">Bắt đầu nhanh với Sách giáo khoa</h4>
                        <p className="text-orange-700 text-sm mb-4">Bạn đã chọn {formData.subject} Lớp {formData.className}. Bạn muốn thêm nhanh nội dung từ SGK không?</p>
                        <button 
                            type="button" 
                            onClick={() => {
                                availableData.forEach(t => handleAddFromTextbook(t));
                            }}
                            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-sm transition-all"
                        >
                            Thêm tất cả chủ đề từ SGK
                        </button>
                    </div>
                )}
                <div 
                    className="space-y-2"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(draggedItem?.themeId || '', undefined, undefined)}
                    onDragEnd={() => { setDraggedItem(null); setDragOverInfo(null); }}
                >
                    {formData.subjectThemes.map((theme, themeIndex) => (
                        <div 
                            key={theme.id}
                            draggable
                            onDragStart={() => handleDragStart('theme', theme.id, undefined, themeIndex)}
                            onDrop={(e) => { e.stopPropagation(); handleDrop(theme.id, undefined, themeIndex); }}
                            className={`rounded-lg border border-gray-200 transition-all ${draggedItem?.themeId === theme.id && draggedItem.type === 'theme' ? 'opacity-50' : ''} ${dragOverInfo?.themeId === theme.id && !dragOverInfo.lessonId ? 'ring-2 ring-blue-500' : ''}`}
                        >
                            <div className="flex items-center p-2 bg-gray-50 rounded-t-lg">
                                <span className="cursor-move p-2 text-gray-400 hover:text-gray-600" title="Kéo để sắp xếp">
                                    <GripVerticalIcon className="w-5 h-5"/>
                                </span>
                                <input 
                                    list={`themes-list-${theme.id}`}
                                    type="text" 
                                    placeholder={`Tên chủ đề ${themeIndex + 1}`}
                                    value={theme.name}
                                    onChange={(e) => handleThemeChange(theme.id, e.target.value)}
                                    className="flex-grow px-3 py-2 border-none bg-transparent focus:ring-0 font-semibold text-gray-800"
                                    aria-label="Tên chủ đề"
                                />
                                <datalist id={`themes-list-${theme.id}`}>
                                    {availableData.map(t => <option key={t.id} value={t.name} />)}
                                </datalist>
                                <button 
                                    type="button" 
                                    onClick={() => handleRemoveTheme(theme.id)} 
                                    disabled={formData.subjectThemes.length <= 1}
                                    className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed rounded-full hover:bg-red-100 transition-colors"
                                    aria-label="Xóa chủ đề"
                                >
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleTheme(theme.id)}
                                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                                  aria-label="Mở rộng/Thu gọn"
                                >
                                  <ChevronDownIcon className={`w-5 h-5 transition-transform ${openThemes.has(theme.id) ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                            
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${openThemes.has(theme.id) ? 'max-h-screen' : 'max-h-0'}`}>
                              <div className="p-4 space-y-3 pl-6 border-l-2 border-blue-200 ml-4">
                                {theme.lessons.map((lesson, lessonIndex) => (
                                    <div 
                                        key={lesson.id}
                                        draggable
                                        onDragStart={(e) => { e.stopPropagation(); handleDragStart('lesson', theme.id, lesson.id, lessonIndex); }}
                                        onDrop={(e) => { e.stopPropagation(); handleDrop(theme.id, lesson.id, lessonIndex); }}
                                        onDragOver={(e) => handleDragOver(e, theme.id, lesson.id)}
                                        className={`flex items-center gap-2 p-2 rounded-md transition-all ${draggedItem?.lessonId === lesson.id ? 'opacity-50' : ''} ${dragOverInfo?.lessonId === lesson.id ? 'bg-blue-100' : ''}`}
                                    >
                                        <span className="cursor-move p-1 text-gray-400 hover:text-gray-600">
                                            <GripVerticalIcon className="w-4 h-4"/>
                                        </span>
                                        <input 
                                            list={`lessons-list-${lesson.id}`}
                                            type="text" 
                                            placeholder={`Bài ${lessonIndex + 1}`}
                                            value={lesson.name}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const matchingTemplate = availableData.find(t => t.name === theme.name)?.lessons.find(l => l.name === val);
                                                if (matchingTemplate) {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        subjectThemes: prev.subjectThemes.map(st => st.id === theme.id ? {
                                                            ...st,
                                                            lessons: st.lessons.map(l => l.id === lesson.id ? {
                                                                ...l,
                                                                name: val,
                                                                startPage: matchingTemplate.startPage,
                                                                endPage: matchingTemplate.endPage
                                                            } : l)
                                                        } : st)
                                                    }));
                                                } else {
                                                    handleLessonChange(theme.id, lesson.id, 'name', val);
                                                }
                                            }}
                                            className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            aria-label="Tên bài học"
                                        />
                                        <datalist id={`lessons-list-${lesson.id}`}>
                                            {availableData.find(t => t.name === theme.name)?.lessons.map(l => <option key={l.id} value={l.name} />)}
                                        </datalist>
                                        <div className="flex items-center gap-1">
                                            <input 
                                                type="number"
                                                value={lesson.startPage}
                                                onChange={(e) => handleLessonChange(theme.id, lesson.id, 'startPage', parseInt(e.target.value, 10) || 1)}
                                                className="w-20 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                aria-label="Trang bắt đầu"
                                                min="1"
                                            />
                                            <span>-</span>
                                            <input 
                                                type="number"
                                                value={lesson.endPage}
                                                onChange={(e) => handleLessonChange(theme.id, lesson.id, 'endPage', parseInt(e.target.value, 10) || 1)}
                                                className="w-20 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                aria-label="Trang kết thúc"
                                                min={lesson.startPage}
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveLesson(theme.id, lesson.id)} 
                                            disabled={theme.lessons.length <= 1}
                                            className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed rounded-full hover:bg-red-100 transition-colors"
                                            aria-label="Xóa bài học"
                                        >
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                ))}
                                 <div className="flex flex-col gap-2 mt-2">
                                    {availableData.find(t => t.name === theme.name) && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            <p className="w-full text-[10px] text-gray-500 font-medium ml-1 mb-1">Gợi ý từ SGK:</p>
                                            {availableData.find(t => t.name === theme.name)?.lessons
                                                .filter(tl => !theme.lessons.some(l => l.name === tl.name))
                                                .map(templateLesson => (
                                                    <button
                                                        key={templateLesson.id}
                                                        type="button"
                                                        onClick={() => handleAddLessonFromTextbook(theme.id, templateLesson)}
                                                        className="inline-flex items-center px-2 py-1 text-[10px] font-medium text-orange-600 bg-white border border-orange-200 rounded hover:bg-orange-50 transition-colors"
                                                    >
                                                        + {templateLesson.name}
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    )}
                                    <button type="button" onClick={() => handleAddLesson(theme.id)} className="flex items-center text-xs font-medium text-blue-600 hover:text-blue-800">
                                        <PlusCircleIcon className="w-4 h-4 mr-1"/>
                                        Thêm bài học mới
                                    </button>
                                 </div>
                              </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
      
      <div className="mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button type="button" onClick={onGenerateMatrix} disabled={isMatrixLoading || isTestLoading || !isReadyToGenerate} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
            {isMatrixLoading ? <LoadingSpinner /> : <><MatrixIcon className="w-5 h-5 mr-2" /> Tạo Ma Trận Đề</>}
            </button>
            <button type="button" onClick={onGenerateTest} disabled={isTestLoading || !hasMatrix || !isReadyToGenerate} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
            {isTestLoading ? <LoadingSpinner /> : <><BrainCircuitIcon className="w-5 h-5 mr-2" /> Tạo Đề Kiểm Tra</>}
            </button>
        </div>
        {!isKeyConfigured && <p className="text-xs text-center text-gray-500 mt-2">Vui lòng cấu hình API Key hợp lệ để tiếp tục.</p>}
        {isKeyConfigured && !isFormValid && <p className="text-xs text-center text-gray-500 mt-2">Vui lòng điền đầy đủ các trường bắt buộc.</p>}
        {isKeyConfigured && isFormValid && !hasMatrix && <p className="text-xs text-center text-blue-600 mt-2">Bước 1: Hãy tạo ma trận đề trước.</p>}
        {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
      </div>
    </form>
  );
};

export default FormSection;