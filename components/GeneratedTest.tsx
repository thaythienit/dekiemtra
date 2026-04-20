import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { GeneratedTest as GeneratedTestType, MultipleChoiceQuestion, WrittenQuestion, TrueFalseQuestion, MatchingQuestion, FillBlankQuestion, MatchingPair, FormData, CognitiveLevel } from '../types.ts';
import { 
    DownloadIcon, 
    EditIcon, 
    SaveIcon, 
    KeyIcon,
    MultipleChoiceIcon,
    TrueFalseIcon,
    MatchingIcon,
    FillBlankIcon 
} from './IconComponents.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';

interface GeneratedTestProps {
  testData: GeneratedTestType;
  onExport: (editedData: GeneratedTestType) => void;
  onSave: () => void;
  formData: FormData;
  onGenerateSolution: () => void;
  isSolutionLoading: boolean;
  hasSolution: boolean;
  onExportWithSolution: () => void;
  onExportFullBundle: (editedData: GeneratedTestType) => void;
}

const GeneratedTest: React.FC<GeneratedTestProps> = ({ 
    testData, 
    onExport, 
    onSave, 
    formData,
    onGenerateSolution,
    isSolutionLoading,
    hasSolution,
    onExportWithSolution,
    onExportFullBundle
}) => {
  const [editedData, setEditedData] = useState<GeneratedTestType>(testData);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const { schoolName, subject, timeLimit, className, mcqRatio, writtenRatio, testName, schoolYear } = formData;

  useEffect(() => {
    setEditedData(testData);
  }, [testData]);
  
  const handleWrittenChange = useCallback((index: number, field: keyof WrittenQuestion, value: string) => {
    setEditedData(prev => {
      const newWritten = [...(prev.writtenQuestions || [])];
      const question = { ...newWritten[index] };
      (question[field] as any) = value;
      newWritten[index] = question;
      return { ...prev, writtenQuestions: newWritten };
    });
  }, []);

  const handleMcqChange = useCallback((index: number, field: keyof MultipleChoiceQuestion, value: string | string[]) => {
    setEditedData(prev => {
      const newMcqs = [...(prev.multipleChoiceQuestions || [])];
      const question = { ...newMcqs[index] };
      (question[field] as any) = value;
      newMcqs[index] = question;
      return { ...prev, multipleChoiceQuestions: newMcqs };
    });
  }, []);

  const handleTrueFalseChange = useCallback((index: number, field: keyof TrueFalseQuestion, value: string | boolean) => {
    setEditedData(prev => {
      const newTfs = [...(prev.trueFalseQuestions || [])];
      const question = { ...newTfs[index] };
      (question[field] as any) = value;
      newTfs[index] = question;
      return { ...prev, trueFalseQuestions: newTfs };
    });
  }, []);

  const handleFillBlankChange = useCallback((index: number, field: keyof FillBlankQuestion, value: string) => {
    setEditedData(prev => {
      const newFbs = [...(prev.fillBlankQuestions || [])];
      const question = { ...newFbs[index] };
      (question[field] as any) = value;
      newFbs[index] = question;
      return { ...prev, fillBlankQuestions: newFbs };
    });
  }, []);
  
  const handleMatchingChange = useCallback((index: number, field: keyof MatchingQuestion, value: string | MatchingPair[]) => {
    setEditedData(prev => {
      const newMatching = [...(prev.matchingQuestions || [])];
      const question = { ...newMatching[index] };
      (question[field] as any) = value;
      newMatching[index] = question;
      return { ...prev, matchingQuestions: newMatching };
    });
  }, []);

  const formatScore = (score: number) => {
    return score.toFixed(1).replace(/\.0$/, '');
  };

  const formatPoints = (points: number) => {
    if (points === 0) return '0';
    const rounded = Math.round(points * 100) / 100;
    return rounded.toString();
  }

  const totalScore = 10;
  const mcqScore = (mcqRatio / 100) * totalScore;
  const writtenScore = (writtenRatio / 100) * totalScore;
  
  const totalMcqCount = (editedData.multipleChoiceQuestions?.length || 0) + 
                        (editedData.trueFalseQuestions?.length || 0) + 
                        (editedData.matchingQuestions?.length || 0) + 
                        (editedData.fillBlankQuestions?.length || 0);
  
  const totalWrittenCount = editedData.writtenQuestions?.length || 0;

  const pointsPerMcq = totalMcqCount > 0 ? mcqScore / totalMcqCount : 0;
  const pointsPerWritten = totalWrittenCount > 0 ? writtenScore / totalWrittenCount : 0;

  // For rendering matching questions with shuffled options
  const shuffledMatchingOptions = useMemo(() => {
    return (editedData.matchingQuestions || []).map(q => {
        const columnB = q.pairs.map(p => p.itemB);
        // Simple shuffle algorithm
        for (let i = columnB.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [columnB[i], columnB[j]] = [columnB[j], columnB[i]];
        }
        return columnB;
    });
  }, [editedData.matchingQuestions]);

  let questionCounter = 0;

  return (
    <div className="mt-8 p-4 sm:p-6 lg:p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Đề kiểm tra đã tạo</h2>
        <div className="flex flex-wrap gap-2">
            <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isEditing
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
                <EditIcon className="w-4 h-4 mr-2" />
                {isEditing ? 'Hoàn tất Sửa' : 'Chỉnh sửa'}
            </button>
            <button
                onClick={onSave}
                className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                <SaveIcon className="w-4 h-4 mr-2" />
                Lưu Đề
            </button>
            <button
                onClick={() => onExport(editedData)}
                className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Xuất DOCX
            </button>
            <button
                onClick={onGenerateSolution}
                disabled={isSolutionLoading || hasSolution}
                className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {isSolutionLoading ? <LoadingSpinner /> : <KeyIcon className="w-4 h-4 mr-2" />}
                {isSolutionLoading ? 'Đang tạo...' : hasSolution ? 'Đã tạo đáp án' : 'Tạo Đáp án & HD Chấm'}
            </button>
            <button
                onClick={() => onExportFullBundle(editedData)}
                className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-800 hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700"
            >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Xuất Trọn Bộ (DOCX)
            </button>
            <button
                onClick={() => onExportWithSolution()}
                disabled={!hasSolution}
                className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Xuất DOCX (Kèm Đáp án)
            </button>
        </div>
      </div>

      <div className="text-center mb-6">
        {schoolName && <p className="font-bold text-base uppercase">{schoolName}</p>}
        <h3 className="font-bold text-lg uppercase">{testName}</h3>
        <p className="font-bold">NĂM HỌC: {schoolYear}</p>
        <p className="font-semibold">Môn: {subject}</p>
        <p>Thời gian làm bài: {timeLimit} phút</p>
        <p>Họ và tên: .....................................................</p>
        <p>Lớp: {className}</p>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-semibold border-b-2 border-blue-500 pb-2 mb-4 text-blue-700">
            I. PHẦN TRẮC NGHIỆM ({formatScore(mcqScore)} điểm)
          </h3>
          <div className="space-y-6">
            {/* Render all question types sequentially */}
            {(editedData.trueFalseQuestions || []).map((q, index) => {
                questionCounter++;
                return (
                    <div key={`tf-${index}`} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="flex items-center font-semibold mb-2">
                            <TrueFalseIcon className="w-5 h-5 mr-2 text-gray-500"/>
                            <span>Câu {questionCounter} ({formatPoints(pointsPerMcq)} điểm): ({q.cognitiveLevel})</span>
                        </div>
                         {isEditing ? (
                            <textarea value={q.questionText} onChange={(e) => handleTrueFalseChange(index, 'questionText', e.target.value)} className="w-full p-1 border rounded" />
                        ) : (
                            <p>{q.questionText}</p>
                        )}
                        <div className="flex space-x-4 mt-2">
                           <span className={q.correctAnswer ? 'bg-green-100 p-2 rounded' : 'p-2'}>Đúng</span>
                           <span className={!q.correctAnswer ? 'bg-green-100 p-2 rounded' : 'p-2'}>Sai</span>
                        </div>
                    </div>
                );
            })}

            {(editedData.matchingQuestions || []).map((q, index) => {
                questionCounter++;
                return (
                    <div key={`match-${index}`} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="flex items-center font-semibold mb-2">
                            <MatchingIcon className="w-5 h-5 mr-2 text-gray-500"/>
                            <span>Câu {questionCounter} ({formatPoints(pointsPerMcq)} điểm): ({q.cognitiveLevel})</span>
                        </div>
                        {isEditing ? (
                             <textarea value={q.prompt} onChange={(e) => handleMatchingChange(index, 'prompt', e.target.value)} className="w-full p-1 border rounded" />
                        ) : (
                            <p>{q.prompt}</p>
                        )}
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div>
                                <h4 className="font-semibold">Cột A</h4>
                                {q.pairs.map((pair, pairIndex) => <p key={pairIndex} className="p-2">{`${pairIndex + 1}. ${pair.itemA}`}</p>)}
                            </div>
                            <div>
                                <h4 className="font-semibold">Cột B</h4>
                                {shuffledMatchingOptions[index].map((itemB, itemIndex) => <p key={itemIndex} className="p-2">{`${String.fromCharCode(65 + itemIndex)}. ${itemB}`}</p>)}
                            </div>
                        </div>
                    </div>
                );
            })}
            
            {(editedData.fillBlankQuestions || []).map((q, index) => {
                questionCounter++;
                return (
                    <div key={`fb-${index}`} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                         <div className="flex items-center font-semibold mb-2">
                            <FillBlankIcon className="w-5 h-5 mr-2 text-gray-500"/>
                            <span>Câu {questionCounter} ({formatPoints(pointsPerMcq)} điểm): ({q.cognitiveLevel})</span>
                        </div>
                        {isEditing ? (
                             <textarea value={q.questionText} onChange={(e) => handleFillBlankChange(index, 'questionText', e.target.value)} className="w-full p-1 border rounded" />
                        ) : (
                            <p dangerouslySetInnerHTML={{ __html: q.questionText.replace(/___/g, '<span class="font-bold">___</span>') }} />
                        )}
                        <div className="mt-2 p-2 bg-green-100 rounded">
                            <span className="font-semibold text-sm">Đáp án: </span> 
                             {isEditing ? (
                                <input type="text" value={q.correctAnswer} onChange={(e) => handleFillBlankChange(index, 'correctAnswer', e.target.value)} className="p-1 border rounded" />
                             ) : (
                                <span className="text-sm">{q.correctAnswer}</span>
                             )}
                        </div>
                    </div>
                );
            })}
            
            {(editedData.multipleChoiceQuestions || []).map((q, index) => {
              questionCounter++;
              return (
              <div key={`mcq-${index}`} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center font-semibold mb-2">
                    <MultipleChoiceIcon className="w-5 h-5 mr-2 text-gray-500"/>
                    <span>Câu {questionCounter} ({formatPoints(pointsPerMcq)} điểm): ({q.cognitiveLevel})</span>
                </div>
                {isEditing ? (
                  <textarea value={q.questionText} onChange={(e) => handleMcqChange(index, 'questionText', e.target.value)} className="w-full p-1 border rounded" />
                ) : (
                  <p>{q.questionText}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className={`flex items-start p-2 rounded ${opt === q.correctAnswer ? 'bg-green-100' : ''}`}>
                      <span className="font-semibold mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                      {isEditing ? (
                        <input type="text" value={opt} onChange={(e) => {
                          const newOptions = [...q.options];
                          newOptions[optIndex] = e.target.value;
                          handleMcqChange(index, 'options', newOptions);
                        }} className="w-full p-1 border rounded" />
                      ) : (
                        <span>{opt}</span>
                      )}
                    </div>
                  ))}
                </div>
                {isEditing && (
                    <div className="mt-2">
                        <label className="text-sm font-medium">Đáp án đúng: </label>
                        <input type="text" value={q.correctAnswer} onChange={(e) => handleMcqChange(index, 'correctAnswer', e.target.value)} className="p-1 border rounded" />
                    </div>
                )}
              </div>
            )})}
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold border-b-2 border-red-500 pb-2 mb-4 text-red-700">
            II. PHẦN TỰ LUẬN ({formatScore(writtenScore)} điểm)
          </h3>
          <div className="space-y-6">
            {(editedData.writtenQuestions || []).map((q, index) => (
              <details key={index} className="p-4 rounded-lg bg-gray-50 border border-gray-200 group" open={isEditing}>
                  <summary className="font-semibold cursor-pointer list-none">
                     <div className="flex justify-between items-center">
                        <span>Câu {totalMcqCount + index + 1} ({formatPoints(pointsPerWritten)} điểm): ({q.cognitiveLevel})</span>
                        <svg className={`w-5 h-5 transition-transform transform group-open:rotate-180 ${isEditing ? 'hidden' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                     </div>
                     {isEditing ? (
                        <textarea 
                           value={q.questionText} 
                           onChange={(e) => handleWrittenChange(index, 'questionText', e.target.value)} 
                           className="w-full mt-2 p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400" 
                           onInput={(e) => {
                             const target = e.target as HTMLTextAreaElement;
                             target.style.height = 'auto';
                             target.style.height = `${target.scrollHeight}px`;
                           }}
                        />
                     ) : (
                        <p className="mt-2 font-normal">{q.questionText}</p>
                     )}
                  </summary>
                  <div className="mt-3 p-3 bg-yellow-100 border-l-4 border-yellow-400 rounded">
                     <p className="font-semibold text-sm text-yellow-800">Gợi ý trả lời:</p>
                     {isEditing ? (
                        <textarea 
                           value={q.suggestedAnswer} 
                           onChange={(e) => handleWrittenChange(index, 'suggestedAnswer', e.target.value)} 
                           className="w-full mt-1 p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                           onInput={(e) => {
                             const target = e.target as HTMLTextAreaElement;
                             target.style.height = 'auto';
                             target.style.height = `${target.scrollHeight}px`;
                           }}
                        />
                     ) : (
                        <p className="text-sm text-gray-700 mt-1">{q.suggestedAnswer}</p>
                     )}
                  </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneratedTest;