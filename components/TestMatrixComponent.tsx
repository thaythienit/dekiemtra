

import React from 'react';
import type { TestMatrix, FormData, MatrixRow } from '../types.ts';
import { DownloadIcon } from './IconComponents.tsx';
import { exportMatrixToDocx } from '../services/docxService.ts';

interface TestMatrixProps {
  matrixData: TestMatrix;
  formData: FormData;
}

const TestMatrixComponent: React.FC<TestMatrixProps> = ({ matrixData, formData }) => {
  const { matrix, specTable } = matrixData;

  if (!matrix || matrix.length === 0) {
    return null;
  }

  const { subject, className, testName, schoolYear, mcqRatio, writtenRatio } = formData;
  
  const totalScore = 10;
  const mcqTotalScore = (mcqRatio / 100) * totalScore;
  const writtenTotalScore = (writtenRatio / 100) * totalScore;

  // Question numbering logic
  let mcqCounter = 1;
  const mcqNumbers: Record<string, { recognition: number[]; comprehension: number[]; application: number[] }> = {};
  
  // Logic: Go through level 1, then level 2, then level 3 for all MCQ questions?
  // Looking at sample: Lesson 5 has Câu 1 (L1), Câu 2 (L2). Lesson 7 has Câu 4, 5 (L1), Câu 6 (L2).
  // It seems they follow the order in columns or order of appearance.
  // Let's go row by row: Level 1 TN, Level 2 TN, Level 3 TN.
  
  matrix.forEach(row => {
    const key = `${row.themeName}-${row.lessonName}`;
    mcqNumbers[key] = { recognition: [], comprehension: [], application: [] };
    
    for (let i = 0; i < row.mcq.recognition; i++) mcqNumbers[key].recognition.push(mcqCounter++);
    for (let i = 0; i < row.mcq.comprehension; i++) mcqNumbers[key].comprehension.push(mcqCounter++);
    for (let i = 0; i < row.mcq.application; i++) mcqNumbers[key].application.push(mcqCounter++);
  });

  let writtenCounter = mcqCounter;
  const writtenNumbers: Record<string, { recognition: number[]; comprehension: number[]; application: number[] }> = {};
  matrix.forEach(row => {
    const key = `${row.themeName}-${row.lessonName}`;
    writtenNumbers[key] = { recognition: [], comprehension: [], application: [] };
    
    for (let i = 0; i < row.written.recognition; i++) writtenNumbers[key].recognition.push(writtenCounter++);
    for (let i = 0; i < row.written.comprehension; i++) writtenNumbers[key].comprehension.push(writtenCounter++);
    for (let i = 0; i < row.written.application; i++) writtenNumbers[key].application.push(writtenCounter++);
  });

  const totals = {
    mcq: { recognition: 0, comprehension: 0, application: 0, total: 0 },
    written: { recognition: 0, comprehension: 0, application: 0, total: 0 },
  };
  
  matrix.forEach(row => {
    totals.mcq.recognition += row.mcq.recognition;
    totals.mcq.comprehension += row.mcq.comprehension;
    totals.mcq.application += row.mcq.application;
    totals.written.recognition += row.written.recognition;
    totals.written.comprehension += row.written.comprehension;
    totals.written.application += row.written.application;
  });

  totals.mcq.total = totals.mcq.recognition + totals.mcq.comprehension + totals.mcq.application;
  totals.written.total = totals.written.recognition + totals.written.comprehension + totals.written.application;
  
  const pointsPerMcq = totals.mcq.total > 0 ? mcqTotalScore / totals.mcq.total : 0;
  const pointsPerWritten = totals.written.total > 0 ? writtenTotalScore / totals.written.total : 0;

  const level1Points = (totals.mcq.recognition * pointsPerMcq) + (totals.written.recognition * pointsPerWritten);
  const level2Points = (totals.mcq.comprehension * pointsPerMcq) + (totals.written.comprehension * pointsPerWritten);
  const level3Points = (totals.mcq.application * pointsPerMcq) + (totals.written.application * pointsPerWritten);
  
  const formatPoints = (points: number) => {
    if (points === 0) return '';
    const formatted = parseFloat(points.toFixed(2)).toString();
    return formatted.includes('.') ? formatted.replace('.', ',') : formatted;
  }
  
  const handleExportMatrix = () => {
    exportMatrixToDocx({ matrix: matrixData.matrix, formData });
  };

  const getThemeGroups = () => {
    const groups: Record<string, MatrixRow[]> = {};
    matrix.forEach(row => {
      if (!groups[row.themeName]) groups[row.themeName] = [];
      groups[row.themeName].push(row);
    });
    return groups;
  };

  const themeGroups = getThemeGroups();
  const writtenShortLabel = formData.writtenType === 'practice' ? 'TH' : formData.writtenType === 'both' ? 'TL/TH' : 'TL';

  return (
    <div className="mt-8 space-y-12">
      {/* MATRIX TABLE */}
      <div className="p-4 sm:p-6 lg:p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className="text-center mb-8">
          <h2 className="text-lg font-bold uppercase">Ma trận {testName}</h2>
          <p className="font-bold uppercase">Năm học {schoolYear}</p>
          <p className="font-bold uppercase">Môn {subject} - Lớp {className || '...'}</p>
        </div>

        <div className="flex justify-end mb-4">
            <button 
                onClick={handleExportMatrix}
                className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Xuất Ma Trận ra Word
            </button>
        </div>

        <div className="overflow-x-auto border border-black">
          <table className="min-w-full border-collapse text-[11px] sm:text-xs">
            <thead>
              <tr className="border-b border-black">
                <th rowSpan={2} colSpan={2} className="border-r border-black p-2 font-bold bg-gray-50 text-center w-64">Mạch kiến thức, kĩ năng</th>
                <th rowSpan={2} className="border-r border-black p-2 font-bold bg-gray-50 text-center w-24">Số câu và số điểm</th>
                <th colSpan={2} className="border-r border-black p-1 font-bold bg-gray-50 text-center">Mức 1</th>
                <th colSpan={2} className="border-r border-black p-1 font-bold bg-gray-50 text-center">Mức 2</th>
                <th colSpan={2} className="border-r border-black p-1 font-bold bg-gray-50 text-center">Mức 3</th>
                <th colSpan={2} className="border-r border-black p-1 font-bold bg-gray-50 text-center">Tổng</th>
                <th rowSpan={2} className="p-2 font-bold bg-gray-50 text-center w-16">Tỉ lệ</th>
              </tr>
              <tr className="border-b border-black">
                <th className="border-r border-black p-1 font-bold bg-gray-50 text-center">TN</th>
                <th className="border-r border-black p-1 font-bold bg-gray-50 text-center">{writtenShortLabel}</th>
                <th className="border-r border-black p-1 font-bold bg-gray-50 text-center">TN</th>
                <th className="border-r border-black p-1 font-bold bg-gray-50 text-center">{writtenShortLabel}</th>
                <th className="border-r border-black p-1 font-bold bg-gray-50 text-center">TN</th>
                <th className="border-r border-black p-1 font-bold bg-gray-50 text-center">{writtenShortLabel}</th>
                <th className="border-r border-black p-1 font-bold bg-gray-50 text-center">TN</th>
                <th className="border-r border-black p-1 font-bold bg-gray-50 text-center">{writtenShortLabel}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(themeGroups).map(([themeName, rows]) => (
                <React.Fragment key={themeName}>
                  {rows.map((row, idx) => {
                    const key = `${row.themeName}-${row.lessonName}`;
                    const rowMcqTotal = row.mcq.recognition + row.mcq.comprehension + row.mcq.application;
                    const rowWrittenTotal = row.written.recognition + row.written.comprehension + row.written.application;
                    const rowPointsTotal = (rowMcqTotal * pointsPerMcq) + (rowWrittenTotal * pointsPerWritten);
                    const rowPercentage = Math.round(rowPointsTotal / totalScore * 100);
                    
                    return (
                      <React.Fragment key={row.lessonName}>
                        {/* Row: Số câu */}
                        <tr className="border-b border-black">
                          {idx === 0 && (
                            <td rowSpan={rows.length * 3} className="border-r border-black p-2 align-middle font-medium">
                              {themeName}
                            </td>
                          )}
                          <td rowSpan={3} className="border-r border-black p-2 align-middle font-medium">
                            {row.lessonName}
                          </td>
                          <td className="border-r border-black p-1 text-center font-bold">Số câu</td>
                          <td className="border-r border-black p-1 text-center">{row.mcq.recognition || ''}</td>
                          <td className="border-r border-black p-1 text-center">{row.written.recognition || ''}</td>
                          <td className="border-r border-black p-1 text-center">{row.mcq.comprehension || ''}</td>
                          <td className="border-r border-black p-1 text-center">{row.written.comprehension || ''}</td>
                          <td className="border-r border-black p-1 text-center">{row.mcq.application || ''}</td>
                          <td className="border-r border-black p-1 text-center">{row.written.application || ''}</td>
                          <td className="border-r border-black p-1 text-center font-bold">{rowMcqTotal || ''}</td>
                          <td className="border-r border-black p-1 text-center font-bold">{rowWrittenTotal || ''}</td>
                          <td rowSpan={3} className="p-2 text-center align-middle font-bold text-red-600">
                             {rowPercentage > 0 ? `${rowPercentage} %` : ''}
                          </td>
                        </tr>
                        {/* Row: Câu số */}
                        <tr className="border-b border-black">
                          <td className="border-r border-black p-1 text-center font-bold">Câu số</td>
                          <td className="border-r border-black p-1 text-center">{mcqNumbers[key].recognition.join(', ') || ''}</td>
                          <td className="border-r border-black p-1 text-center">{writtenNumbers[key].recognition.join(', ') || ''}</td>
                          <td className="border-r border-black p-1 text-center">{mcqNumbers[key].comprehension.join(', ') || ''}</td>
                          <td className="border-r border-black p-1 text-center">{writtenNumbers[key].comprehension.join(', ') || ''}</td>
                          <td className="border-r border-black p-1 text-center">{mcqNumbers[key].application.join(', ') || ''}</td>
                          <td className="border-r border-black p-1 text-center">{writtenNumbers[key].application.join(', ') || ''}</td>
                          <td className="border-r border-black p-1 text-center font-bold">{[...mcqNumbers[key].recognition, ...mcqNumbers[key].comprehension, ...mcqNumbers[key].application].join(', ') || ''}</td>
                          <td className="border-r border-black p-1 text-center font-bold">{[...writtenNumbers[key].recognition, ...writtenNumbers[key].comprehension, ...writtenNumbers[key].application].join(', ') || ''}</td>
                        </tr>
                        {/* Row: Số điểm */}
                        <tr className="border-b border-black">
                          <td className="border-r border-black p-1 text-center font-bold">Số điểm</td>
                          <td className="border-r border-black p-1 text-center text-red-600 font-bold">{formatPoints(row.mcq.recognition * pointsPerMcq)}</td>
                          <td className="border-r border-black p-1 text-center text-red-600 font-bold">{formatPoints(row.written.recognition * pointsPerWritten)}</td>
                          <td className="border-r border-black p-1 text-center text-red-600 font-bold">{formatPoints(row.mcq.comprehension * pointsPerMcq)}</td>
                          <td className="border-r border-black p-1 text-center text-red-600 font-bold">{formatPoints(row.written.comprehension * pointsPerWritten)}</td>
                          <td className="border-r border-black p-1 text-center text-red-600 font-bold">{formatPoints(row.mcq.application * pointsPerMcq)}</td>
                          <td className="border-r border-black p-1 text-center text-red-600 font-bold">{formatPoints(row.written.application * pointsPerWritten)}</td>
                          <td className="border-r border-black p-1 text-center text-red-600 font-bold">{formatPoints(rowMcqTotal * pointsPerMcq)}</td>
                          <td className="border-r border-black p-1 text-center text-red-600 font-bold">{formatPoints(rowWrittenTotal * pointsPerWritten)}</td>
                        </tr>
                      </React.Fragment>
                    )
                  })}
                </React.Fragment>
              ))}

              {/* FOOTER TOTALS */}
              <tr className="border-b border-black bg-gray-50">
                <td colSpan={2} rowSpan={4} className="border-r border-black p-2 text-center align-middle font-bold uppercase">Tổng</td>
                <td className="border-r border-black p-1 text-center font-bold">Số câu</td>
                <td className="border-r border-black p-1 text-center font-bold">{totals.mcq.recognition}</td>
                <td className="border-r border-black p-1 text-center font-bold">{totals.written.recognition}</td>
                <td className="border-r border-black p-1 text-center font-bold">{totals.mcq.comprehension}</td>
                <td className="border-r border-black p-1 text-center font-bold">{totals.written.comprehension}</td>
                <td className="border-r border-black p-1 text-center font-bold">{totals.mcq.application}</td>
                <td className="border-r border-black p-1 text-center font-bold">{totals.written.application}</td>
                <td className="border-r border-black p-1 text-center font-bold">{totals.mcq.total}</td>
                <td className="border-r border-black p-1 text-center font-bold">{totals.written.total}</td>
                <td rowSpan={4} className="text-center align-middle font-bold p-1 text-red-600">100%</td>
              </tr>
              <tr className="border-b border-black bg-gray-50">
                <td className="border-r border-black p-1 text-center font-bold">Câu số</td>
                <td className="border-r border-black p-1 text-center font-bold">{matrix.flatMap(r => mcqNumbers[`${r.themeName}-${r.lessonName}`].recognition).join(', ')}</td>
                <td className="border-r border-black p-1 text-center font-bold">{matrix.flatMap(r => writtenNumbers[`${r.themeName}-${r.lessonName}`].recognition).join(', ')}</td>
                <td className="border-r border-black p-1 text-center font-bold">{matrix.flatMap(r => mcqNumbers[`${r.themeName}-${r.lessonName}`].comprehension).join(', ')}</td>
                <td className="border-r border-black p-1 text-center font-bold">{matrix.flatMap(r => writtenNumbers[`${r.themeName}-${r.lessonName}`].comprehension).join(', ')}</td>
                <td className="border-r border-black p-1 text-center font-bold">{matrix.flatMap(r => mcqNumbers[`${r.themeName}-${r.lessonName}`].application).join(', ')}</td>
                <td className="border-r border-black p-1 text-center font-bold">{matrix.flatMap(r => writtenNumbers[`${r.themeName}-${r.lessonName}`].application).join(', ')}</td>
                <td className="border-r border-black p-1 text-center font-bold">{matrix.flatMap(r => {
                  const key = `${r.themeName}-${r.lessonName}`;
                  return [...mcqNumbers[key].recognition, ...mcqNumbers[key].comprehension, ...mcqNumbers[key].application];
                }).sort((a,b) => a-b).join(', ')}</td>
                <td className="border-r border-black p-1 text-center font-bold">{matrix.flatMap(r => {
                  const key = `${r.themeName}-${r.lessonName}`;
                  return [...writtenNumbers[key].recognition, ...writtenNumbers[key].comprehension, ...writtenNumbers[key].application];
                }).sort((a,b) => a-b).join(', ')}</td>
              </tr>
              <tr className="border-b border-black bg-gray-50">
                <td className="border-r border-black p-1 text-center font-bold text-red-600">Số điểm</td>
                <td colSpan={2} className="border-r border-black p-1 text-center font-bold text-red-600">{formatPoints(level1Points)}</td>
                <td colSpan={2} className="border-r border-black p-1 text-center font-bold text-red-600">{formatPoints(level2Points)}</td>
                <td colSpan={2} className="border-r border-black p-1 text-center font-bold text-red-600">{formatPoints(level3Points)}</td>
                <td className="border-r border-black p-1 text-center font-bold text-red-600 font-mono">{formatPoints(mcqTotalScore)}</td>
                <td className="border-r border-black p-1 text-center font-bold text-red-600 font-mono">{formatPoints(writtenTotalScore)}</td>
              </tr>
              <tr className="border-b border-black bg-gray-50">
                <td className="border-r border-black p-1 text-center font-bold uppercase">Tổng tỉ lệ</td>
                <td colSpan={2} className="border-r border-black p-1 text-center font-bold">{Math.round(level1Points / totalScore * 100)}%</td>
                <td colSpan={2} className="border-r border-black p-1 text-center font-bold">{Math.round(level2Points / totalScore * 100)}%</td>
                <td colSpan={2} className="border-r border-black p-1 text-center font-bold">{Math.round(level3Points / totalScore * 100)}%</td>
                <td className="border-r border-black p-1 text-center font-bold">{Math.round(mcqTotalScore / totalScore * 100)}%</td>
                <td className="border-r border-black p-1 text-center font-bold">{Math.round(writtenTotalScore / totalScore * 100)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SPECIFICATION TABLE */}
      <div className="p-4 sm:p-6 lg:p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold uppercase">Bảng đặc tả nhận thức đề kiểm tra cuối học kì i</h2>
          <p className="font-bold uppercase">Môn {subject} - Lớp {className || '...'}</p>
        </div>

        <div className="overflow-x-auto border border-black">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-gray-50 ">
              <tr className="border-b border-black">
                <th rowSpan={2} className="border-r border-black p-2 font-bold w-1/6">Chương/Chủ đề</th>
                <th rowSpan={2} className="border-r border-black p-2 font-bold w-1/6">Nội dung/Đơn vị kiến thức</th>
                <th rowSpan={2} className="border-r border-black p-2 font-bold w-1/3">Mức độ đánh giá</th>
                <th colSpan={6} className="p-2 font-bold">Số câu hỏi theo mức độ nhận thức</th>
              </tr>
              <tr className="border-b border-black">
                <th className="border-r border-black p-1 font-bold">Nhận biết (TN/{writtenShortLabel})</th>
                <th className="border-r border-black p-1 font-bold">Thông hiểu (TN/{writtenShortLabel})</th>
                <th className="p-1 font-bold">Vận dụng (TN/{writtenShortLabel})</th>
              </tr>
            </thead>
            <tbody>
              {specTable.map((spec, index) => {
                const matrixMatch = matrix.find(m => m.lessonName === spec.lessonName);
                
                // Grouping by themeName for rowSpan
                const themeRows = specTable.filter(s => s.themeName === spec.themeName);
                const isFirstOfTheme = specTable.findIndex(s => s.themeName === spec.themeName) === index;

                return (
                  <tr key={index} className="border-b border-black">
                    {isFirstOfTheme && (
                      <td rowSpan={themeRows.length} className="border-r border-black p-2 align-middle font-medium">
                        {spec.themeName}
                      </td>
                    )}
                    <td className="border-r border-black p-2 font-medium">{spec.lessonName}</td>
                    <td className="border-r border-black p-2">
                        <div className="space-y-2">
                            <div>
                                <span className="font-bold">Nhận biết:</span>
                                <p className="ml-2 whitespace-pre-wrap">{spec.description.recognition}</p>
                            </div>
                            <div>
                                <span className="font-bold">Thông hiểu:</span>
                                <p className="ml-2 whitespace-pre-wrap">{spec.description.comprehension}</p>
                            </div>
                            <div>
                                <span className="font-bold">Vận dụng:</span>
                                <p className="ml-2 whitespace-pre-wrap">{spec.description.application}</p>
                            </div>
                        </div>
                    </td>
                    <td className="border-r border-black p-2 text-center align-middle">
                      {matrixMatch ? `${matrixMatch.mcq.recognition} / ${matrixMatch.written.recognition}` : '-'}
                    </td>
                    <td className="border-r border-black p-2 text-center align-middle">
                      {matrixMatch ? `${matrixMatch.mcq.comprehension} / ${matrixMatch.written.comprehension}` : '-'}
                    </td>
                    <td className="p-2 text-center align-middle">
                      {matrixMatch ? `${matrixMatch.mcq.application} / ${matrixMatch.written.application}` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TestMatrixComponent;
