
import React from 'react';
import type { GeneratedTest, TestSolution } from '../types.ts';
import { KeyIcon } from './IconComponents.tsx';

interface SolutionComponentProps {
  testData: GeneratedTest;
  solutionData: TestSolution;
  mcqRatio: number;
  writtenRatio: number;
  writtenType: 'essay' | 'practice' | 'both';
}

const SolutionComponent: React.FC<SolutionComponentProps> = ({ testData, solutionData, mcqRatio, writtenRatio, writtenType }) => {
  const formatScore = (score: number) => score.toFixed(1).replace(/\.0$/, '');
  
  const totalScore = 10;
  const mcqScore = (mcqRatio / 100) * totalScore;
  const writtenScore = (writtenRatio / 100) * totalScore;
  
  let questionCounter = 0;

  return (
    <div className="mt-8 p-4 sm:p-6 lg:p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
      <div className="flex items-center mb-6">
        <KeyIcon className="w-8 h-8 mr-3 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-800">Đáp án và Hướng dẫn chấm</h2>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-xl font-semibold border-b-2 border-blue-500 pb-2 mb-4 text-blue-700">
            I. PHẦN TRẮC NGHIỆM ({formatScore(mcqScore)} điểm)
          </h3>
          <div className="space-y-2 text-sm">
            {(testData.trueFalseQuestions || []).map((q, index) => {
              questionCounter++;
              return <p key={`tf-ans-${index}`}><b>Câu {questionCounter}:</b> {q.correctAnswer ? 'Đúng' : 'Sai'}</p>;
            })}
            {(testData.matchingQuestions || []).map((q, index) => {
              questionCounter++;
              const answers = q.pairs.map(p => `${p.itemA} - ${p.itemB}`).join('; ');
              return <p key={`match-ans-${index}`}><b>Câu {questionCounter}:</b> {answers}</p>;
            })}
            {(testData.fillBlankQuestions || []).map((q, index) => {
              questionCounter++;
              return <p key={`fb-ans-${index}`}><b>Câu {questionCounter}:</b> {q.correctAnswer}</p>;
            })}
            {(testData.multipleChoiceQuestions || []).map((q, index) => {
              questionCounter++;
              const correctOpt = String.fromCharCode(65 + q.options.indexOf(q.correctAnswer));
              return <p key={`mcq-ans-${index}`}><b>Câu {questionCounter}:</b> {correctOpt}</p>;
            })}
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold border-b-2 border-red-500 pb-2 mb-4 text-red-700">
            II. PHẦN {writtenType === 'practice' ? 'THỰC HÀNH' : writtenType === 'both' ? 'TỰ LUẬN VÀ THỰC HÀNH' : 'TỰ LUẬN'} ({formatScore(writtenScore)} điểm) - HƯỚNG DẪN CHẤM
          </h3>
          <div className="space-y-6">
            {(solutionData.writtenGradingGuides || []).map((guide, index) => (
              <div key={`guide-${index}`} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <p className="font-semibold mb-2">Câu {questionCounter + index + 1}: {guide.questionText}</p>
                <div className="mt-3 p-3 bg-yellow-100 border-l-4 border-yellow-400 rounded prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: guide.detailedGuide.replace(/\n/g, '<br />') }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolutionComponent;