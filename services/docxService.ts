import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, VerticalMergeType, BorderStyle, VerticalAlign, ShadingType } from 'docx';
import type { GeneratedTest, TestSolution, MatrixRow, FormData, CognitiveLevel, TechnicalDesign } from '../types.ts';

const formatScore = (score: number) => {
    return score.toFixed(1).replace(/\.0$/, '');
};

const sanitizeOption = (opt: string) => {
    const trimmed = opt.trim();
    const regex = /^[A-D](\.|\:|\s|\-)+\s*/i;
    return trimmed.replace(regex, '');
};

export const exportMatrixToDocx = (data: {
    matrix: MatrixRow[];
    formData: FormData;
}): void => {
    const { matrix, formData } = data;
    const { subject, className, subjectThemes, mcqRatio, writtenRatio, testName, schoolYear } = formData;
    const totalScore = 10;
    const mcqTotalScore = (mcqRatio / 100) * totalScore;
    const writtenTotalScore = (writtenRatio / 100) * totalScore;

    // --- Calculations ---
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

    const getMcqPoints = (type: 'multipleChoice' | 'trueFalse' | 'matching' | 'fillBlank') => {
        if (formData.customPoints && formData.customPoints[type] > 0) {
            return formData.customPoints[type];
        }
        return pointsPerMcq;
    };

    const getWrittenPoints = (index: number) => {
        if (formData.customPoints && formData.customPoints.written && formData.customPoints.written[index] > 0) {
            return formData.customPoints.written[index];
        }
        return pointsPerWritten;
    };

    const level1Points = (totals.mcq.recognition * pointsPerMcq) + (totals.written.recognition * pointsPerWritten);
    const level2Points = (totals.mcq.comprehension * pointsPerMcq) + (totals.written.comprehension * pointsPerWritten);
    const level3Points = (totals.mcq.application * pointsPerMcq) + (totals.written.application * pointsPerWritten);
    
    const formatPoints = (points: number) => {
        if (points === 0) return '';
        return parseFloat(points.toFixed(2)).toString().replace('.', ',');
    }

    // --- Styling ---
    const cellStyles = {
        verticalAlign: VerticalAlign.CENTER,
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "BFBFBF" },
        },
    };
    const headerCell = (text: string, shadingColor?: string, colSpan?: number, rowSpan?: number) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20 })], alignment: AlignmentType.CENTER })],
        ...cellStyles,
        columnSpan: colSpan,
        verticalMerge: rowSpan ? VerticalMergeType.RESTART : undefined,
        shading: shadingColor ? { fill: shadingColor, type: ShadingType.CLEAR } : undefined,
    });
    const bodyCell = (text: string | number, isBold = false, color?: string, colSpan?: number, vMerge?: any) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: text.toString(), bold: isBold, size: 22, color })], alignment: AlignmentType.CENTER })],
        ...cellStyles,
        columnSpan: colSpan,
        verticalMerge: vMerge,
    });
    const leftAlignBodyCell = (text: string, isBold = false, colSpan?: number, vMerge?: any) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: isBold, size: 22 })], alignment: AlignmentType.LEFT })],
        ...cellStyles,
        columnSpan: colSpan,
        verticalMerge: vMerge,
    });


    // --- Header Rows ---
    const headerRow1 = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mạch kiến thức, kĩ năng", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], columnSpan: 2, verticalMerge: VerticalMergeType.RESTART, ...cellStyles }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Số câu và số điểm", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], verticalMerge: VerticalMergeType.RESTART, ...cellStyles }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mức 1", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], columnSpan: 2, ...cellStyles }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mức 2", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], columnSpan: 2, ...cellStyles }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Mức 3", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], columnSpan: 2, ...cellStyles }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tổng", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], columnSpan: 2, ...cellStyles }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tỉ lệ", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], verticalMerge: VerticalMergeType.RESTART, ...cellStyles }),
        ],
        tableHeader: true,
    });
    const headerRow2 = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph('')], columnSpan: 2, verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
            new TableCell({ children: [new Paragraph('')], verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
            headerCell("TN"), headerCell("TL"),
            headerCell("TN"), headerCell("TL"),
            headerCell("TN"), headerCell("TL"),
            headerCell("TN"), headerCell("TL"),
            new TableCell({ children: [new Paragraph('')], verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
        ],
        tableHeader: true,
    });

    // --- Body Rows ---
    const themeRows: Record<string, MatrixRow[]> = {};
    matrix.forEach(row => {
        if (!themeRows[row.themeName]) themeRows[row.themeName] = [];
        themeRows[row.themeName].push(row);
    });

    // Question numbering logic consistent with UI
    let mcqCounter = 1;
    const mcqNums: Record<string, { recognition: number[]; comprehension: number[]; application: number[] }> = {};
    matrix.forEach(row => {
        const key = `${row.themeName}-${row.lessonName}`;
        mcqNums[key] = { recognition: [], comprehension: [], application: [] };
        for (let i = 0; i < row.mcq.recognition; i++) mcqNums[key].recognition.push(mcqCounter++);
        for (let i = 0; i < row.mcq.comprehension; i++) mcqNums[key].comprehension.push(mcqCounter++);
        for (let i = 0; i < row.mcq.application; i++) mcqNums[key].application.push(mcqCounter++);
    });

    let writtenCounter = mcqCounter;
    const writtenNums: Record<string, { recognition: number[]; comprehension: number[]; application: number[] }> = {};
    matrix.forEach(row => {
        const key = `${row.themeName}-${row.lessonName}`;
        writtenNums[key] = { recognition: [], comprehension: [], application: [] };
        for (let i = 0; i < row.written.recognition; i++) writtenNums[key].recognition.push(writtenCounter++);
        for (let i = 0; i < row.written.comprehension; i++) writtenNums[key].comprehension.push(writtenCounter++);
        for (let i = 0; i < row.written.application; i++) writtenNums[key].application.push(writtenCounter++);
    });

    const bodyRows = Object.entries(themeRows).flatMap(([themeName, rows]) => {
        return rows.flatMap((row, lessonIndex) => {
            const key = `${themeName}-${row.lessonName}`;
            const rowMcqTotal = row.mcq.recognition + row.mcq.comprehension + row.mcq.application;
            const rowWrittenTotal = row.written.recognition + row.written.comprehension + row.written.application;
            const rowPointsTotal = (rowMcqTotal * pointsPerMcq) + (rowWrittenTotal * pointsPerWritten);
            const rowPercentage = Math.round(rowPointsTotal / totalScore * 100);

            const soCauRow = new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: lessonIndex === 0 ? themeName : '', size: 22 })], alignment: AlignmentType.LEFT })],
                        ...cellStyles,
                        verticalMerge: lessonIndex === 0 ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE,
                    }),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: row.lessonName, size: 22 })], alignment: AlignmentType.LEFT })],
                        ...cellStyles,
                        verticalMerge: VerticalMergeType.RESTART,
                    }),
                    leftAlignBodyCell("Số câu", true),
                    bodyCell(row.mcq.recognition || ''), bodyCell(row.written.recognition || ''),
                    bodyCell(row.mcq.comprehension || ''), bodyCell(row.written.comprehension || ''),
                    bodyCell(row.mcq.application || ''), bodyCell(row.written.application || ''),
                    bodyCell(rowMcqTotal || '', true, "0000FF"), bodyCell(rowWrittenTotal || '', true, "FF0000"),
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: rowPercentage > 0 ? `${rowPercentage} %` : '', size: 22, color: "C00000", bold: true })], alignment: AlignmentType.CENTER })],
                        ...cellStyles,
                        verticalMerge: VerticalMergeType.RESTART,
                    }),
                ]
            });

            const cauSoRow = new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph('')], verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
                    new TableCell({ children: [new Paragraph('')], verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
                    leftAlignBodyCell("Câu số", true),
                    bodyCell(mcqNums[key].recognition.join(', ') || ''), bodyCell(writtenNums[key].recognition.join(', ') || ''),
                    bodyCell(mcqNums[key].comprehension.join(', ') || ''), bodyCell(writtenNums[key].comprehension.join(', ') || ''),
                    bodyCell(mcqNums[key].application.join(', ') || ''), bodyCell(writtenNums[key].application.join(', ') || ''),
                    bodyCell([...mcqNums[key].recognition, ...mcqNums[key].comprehension, ...mcqNums[key].application].join(', ') || '', true),
                    bodyCell([...writtenNums[key].recognition, ...writtenNums[key].comprehension, ...writtenNums[key].application].join(', ') || '', true),
                    new TableCell({ children: [new Paragraph('')], verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
                ]
            });
            
            const soDiemRow = new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph('')], verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
                    new TableCell({ children: [new Paragraph('')], verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
                    leftAlignBodyCell("Số điểm", true),
                    bodyCell(formatPoints(row.mcq.recognition * pointsPerMcq), false, "C00000"),
                    bodyCell(formatPoints(row.written.recognition * pointsPerWritten), false, "C00000"),
                    bodyCell(formatPoints(row.mcq.comprehension * pointsPerMcq), false, "C00000"),
                    bodyCell(formatPoints(row.written.comprehension * pointsPerWritten), false, "C00000"),
                    bodyCell(formatPoints(row.mcq.application * pointsPerMcq), false, "C00000"),
                    bodyCell(formatPoints(row.written.application * pointsPerWritten), false, "C00000"),
                    bodyCell(formatPoints(rowMcqTotal * pointsPerMcq), true, "C00000"),
                    bodyCell(formatPoints(rowWrittenTotal * pointsPerWritten), true, "C00000"),
                    new TableCell({ children: [new Paragraph('')], verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
                ]
            });
            return [soCauRow, cauSoRow, soDiemRow];
        });
    });

    // --- Footer (Total) Rows ---
    const totalSoCauRow = new TableRow({
        children: [
            new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Tổng", bold: true, size: 22 })], alignment: AlignmentType.CENTER })],
                ...cellStyles,
                columnSpan: 2,
                verticalMerge: VerticalMergeType.RESTART,
            }),
            leftAlignBodyCell("Số câu", true),
            bodyCell(totals.mcq.recognition, true), bodyCell(totals.written.recognition, true),
            bodyCell(totals.mcq.comprehension, true), bodyCell(totals.written.comprehension, true),
            bodyCell(totals.mcq.application, true), bodyCell(totals.written.application, true),
            bodyCell(totals.mcq.total, true, "0000FF"), bodyCell(totals.written.total, true, "FF0000"),
            new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "100%", bold: true, size: 22, color: "C00000" })], alignment: AlignmentType.CENTER })],
                ...cellStyles,
                verticalMerge: VerticalMergeType.RESTART,
            }),
        ]
    });

    const totalCauSoRow = new TableRow({
        children: [
             new TableCell({ children: [new Paragraph('')], columnSpan: 2, verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
             leftAlignBodyCell("Câu số", true),
             bodyCell(matrix.flatMap(r => mcqNums[`${r.themeName}-${r.lessonName}`].recognition).join(', '), true),
             bodyCell(matrix.flatMap(r => writtenNums[`${r.themeName}-${r.lessonName}`].recognition).join(', '), true),
             bodyCell(matrix.flatMap(r => mcqNums[`${r.themeName}-${r.lessonName}`].comprehension).join(', '), true),
             bodyCell(matrix.flatMap(r => writtenNums[`${r.themeName}-${r.lessonName}`].comprehension).join(', '), true),
             bodyCell(matrix.flatMap(r => mcqNums[`${r.themeName}-${r.lessonName}`].application).join(', '), true),
             bodyCell(matrix.flatMap(r => writtenNums[`${r.themeName}-${r.lessonName}`].application).join(', '), true),
             bodyCell(matrix.flatMap(r => {
                 const key = `${r.themeName}-${r.lessonName}`;
                 return [...mcqNums[key].recognition, ...mcqNums[key].comprehension, ...mcqNums[key].application];
             }).sort((a,b) => a-b).join(', '), true),
             bodyCell(matrix.flatMap(r => {
                 const key = `${r.themeName}-${r.lessonName}`;
                 return [...writtenNums[key].recognition, ...writtenNums[key].comprehension, ...writtenNums[key].application];
             }).sort((a,b) => a-b).join(', '), true),
             new TableCell({ children: [new Paragraph('')], verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
        ]
    });

    const totalSoDiemRow = new TableRow({
        children: [
             new TableCell({ children: [new Paragraph('')], columnSpan: 2, verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
             leftAlignBodyCell("Số điểm", true),
             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatPoints(level1Points), bold: true, size: 22, color: "C00000" })], alignment: AlignmentType.CENTER })], columnSpan: 2, ...cellStyles }),
             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatPoints(level2Points), bold: true, size: 22, color: "C00000" })], alignment: AlignmentType.CENTER })], columnSpan: 2, ...cellStyles }),
             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatPoints(level3Points), bold: true, size: 22, color: "C00000" })], alignment: AlignmentType.CENTER })], columnSpan: 2, ...cellStyles }),
             bodyCell(formatPoints(mcqTotalScore), true, "C00000"),
             bodyCell(formatPoints(writtenTotalScore), true, "C00000"),
             new TableCell({ children: [new Paragraph('')], verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
        ]
    });

    const totalTiLeRow = new TableRow({
        children: [
             new TableCell({ children: [new Paragraph('')], columnSpan: 2, verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
             leftAlignBodyCell("Tổng tỉ lệ", true),
             bodyCell(`${Math.round(level1Points / totalScore * 100)}%`, true, "000000", 2),
             bodyCell(`${Math.round(level2Points / totalScore * 100)}%`, true, "000000", 2),
             bodyCell(`${Math.round(level3Points / totalScore * 100)}%`, true, "000000", 2),
             bodyCell(`${Math.round(mcqTotalScore / totalScore * 100)}%`, true),
             bodyCell(`${Math.round(writtenTotalScore / totalScore * 100)}%`, true),
             new TableCell({ children: [new Paragraph('')], verticalMerge: VerticalMergeType.CONTINUE, ...cellStyles }),
        ]
    });
    

    const table = new Table({
        rows: [headerRow1, headerRow2, ...bodyRows, totalSoCauRow, totalCauSoRow, totalSoDiemRow, totalTiLeRow],
        width: { size: 100, type: WidthType.PERCENTAGE },
    });
    
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: `MA TRẬN ${testName.toUpperCase()}`,
                            bold: true,
                            size: 28,
                        }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: `NĂM HỌC: ${schoolYear.toUpperCase()}`,
                            bold: true,
                            size: 24,
                        }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: `MÔN: ${subject.toUpperCase()} - LỚP ${className}`,
                            bold: true,
                            size: 24,
                        }),
                    ],
                }),
                new Paragraph({ text: "" }),
                table,
            ],
        }],
    });

    Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ma-tran-de-${subject.toLowerCase().replace(/\s+/g, '-')}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
};

export const exportTestToDocx = (
    testData: GeneratedTest, 
    formData: FormData
): void => {
  const { schoolName, subject, timeLimit, className, mcqRatio, writtenRatio, testName, schoolYear } = formData;
  
  const totalScore = 10;
  const mcqScore = (mcqRatio / 100) * totalScore;
  const writtenScore = (writtenRatio / 100) * totalScore;
  
  const totalMcqCount = (testData.multipleChoiceQuestions?.length || 0) + 
                        (testData.trueFalseQuestions?.length || 0) + 
                        (testData.matchingQuestions?.length || 0) + 
                        (testData.fillBlankQuestions?.length || 0);
  
  const totalWrittenCount = testData.writtenQuestions?.length || 0;

  const pointsPerMcq = totalMcqCount > 0 ? mcqScore / totalMcqCount : 0;
  const pointsPerWritten = totalWrittenCount > 0 ? writtenScore / totalWrittenCount : 0;

  const getMcqPoints = (type: 'multipleChoice' | 'trueFalse' | 'matching' | 'fillBlank') => {
    if (formData.customPoints && formData.customPoints[type] > 0) {
        return formData.customPoints[type];
    }
    return pointsPerMcq;
  };

  const getWrittenPoints = (index: number) => {
    if (formData.customPoints && formData.customPoints.written && formData.customPoints.written[index] > 0) {
        return formData.customPoints.written[index];
    }
    return pointsPerWritten;
  };

  const formatScore = (score: number) => {
    return score.toFixed(1).replace(/\.0$/, '');
  };

  const formatPoints = (points: number) => {
    if (points === 0) return '0';
    return parseFloat(points.toFixed(2)).toString();
  }

  let questionCounter = 0;

  const children: (Paragraph | Table)[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [ new TextRun({ text: schoolName ? schoolName.toUpperCase() : "TRƯỜNG TIỂU HỌC ..........", bold: true, size: 24, }), ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [ new TextRun({ text: testName.toUpperCase(), bold: true, size: 28, }), ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [ new TextRun({ text: `NĂM HỌC: ${schoolYear.toUpperCase()}`, bold: true, size: 24, }), ],
      }),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [ new TextRun({ text: `Môn: ${subject}`, bold: true, size: 24, }), ], }),
      new Paragraph({ children: [ new TextRun({ text: `Thời gian làm bài: ${timeLimit} phút`, size: 24, }), ], }),
      new Paragraph({ children: [ new TextRun({ text: `Họ và tên: ........................................................`, size: 24, }), ], }),
      new Paragraph({ children: [ new TextRun({ text: `Lớp: ${className || '........................................................'}`, size: 24, }), ], }),
      new Paragraph({ text: "" }), // Spacer
      new Paragraph({
        children: [ new TextRun({ text: `I. PHẦN TRẮC NGHIỆM (${formatScore(mcqScore)} điểm)`, bold: true, size: 26, }), ],
        heading: HeadingLevel.HEADING_1,
      }),
  ];

  // True/False Questions
  (testData.trueFalseQuestions || []).forEach(q => {
      questionCounter++;
      children.push(new Paragraph({
          children: [
              new TextRun({ text: `Câu ${questionCounter} (${formatPoints(getMcqPoints('trueFalse'))} điểm): `, bold: true, size: 24 }),
              new TextRun({ text: q.questionText, size: 24 }),
          ],
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: `  A. Đúng`, size: 24 })] }));
      children.push(new Paragraph({ children: [new TextRun({ text: `  B. Sai`, size: 24 })] }));
      children.push(new Paragraph({ text: "" }));
  });

  // Matching Questions
  (testData.matchingQuestions || []).forEach(q => {
      questionCounter++;
      children.push(new Paragraph({
          children: [
              new TextRun({ text: `Câu ${questionCounter} (${formatPoints(getMcqPoints('matching'))} điểm): `, bold: true, size: 24 }),
              new TextRun({ text: q.prompt, size: 24 }),
          ],
      }));
      
      const rows: TableRow[] = [];
      q.pairs.forEach((pair, index) => {
          rows.push(new TableRow({
              children: [
                  new TableCell({ children: [new Paragraph({ text: `${index + 1}. ${pair.itemA}` })], width: { size: 45, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ text: `${String.fromCharCode(65 + index)}. ${pair.itemB}` })], width: { size: 45, type: WidthType.PERCENTAGE } }),
              ]
          }));
      });
      const table = new Table({ rows, width: { size: 90, type: WidthType.PERCENTAGE } });
      children.push(table);
      children.push(new Paragraph({ text: "" }));
  });

  // Fill in the Blank Questions
  (testData.fillBlankQuestions || []).forEach(q => {
      questionCounter++;
      children.push(new Paragraph({
          children: [
              new TextRun({ text: `Câu ${questionCounter} (${formatPoints(getMcqPoints('fillBlank'))} điểm): `, bold: true, size: 24 }),
              new TextRun({ text: q.questionText, size: 24 }),
          ],
      }));
      children.push(new Paragraph({ text: "" }));
  });

  // Multiple Choice Questions
  (testData.multipleChoiceQuestions || []).forEach(q => {
      questionCounter++;
      children.push(new Paragraph({
          children: [
              new TextRun({ text: `Câu ${questionCounter} (${formatPoints(getMcqPoints('multipleChoice'))} điểm): `, bold: true, size: 24 }),
              new TextRun({ text: q.questionText, size: 24 }),
          ],
      }));
      q.options.forEach((option, optIndex) => {
          children.push(new Paragraph({ children: [new TextRun({ text: `  ${String.fromCharCode(65 + optIndex)}. ${sanitizeOption(option)}`, size: 24 })] }));
      });
      children.push(new Paragraph({ text: "" }));
  });

  // Written Section
  const writtenLabel = formData.writtenType === 'practice' ? 'THỰC HÀNH' : formData.writtenType === 'both' ? 'TỰ LUẬN VÀ THỰC HÀNH' : 'TỰ LUẬN';
  children.push(new Paragraph({
    children: [ new TextRun({ text: `II. PHẦN ${writtenLabel} (${formatScore(writtenScore)} điểm)`, bold: true, size: 26, }), ],
    heading: HeadingLevel.HEADING_1,
  }));
  (testData.writtenQuestions || []).forEach((q, index) => {
      children.push(new Paragraph({
          children: [
              new TextRun({ text: `Câu ${questionCounter + index + 1} (${formatPoints(getWrittenPoints(index))} điểm): `, bold: true, size: 24 }),
              new TextRun({ text: q.questionText, size: 24 }),
          ],
      }));
      children.push(new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" }));
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  Packer.toBlob(doc).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `de-kiem-tra-${subject.toLowerCase().replace(/\s+/g, '-')}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
};

export const exportFullBundleToDocx = (data: {
    matrixData: TechnicalDesign;
    testData: GeneratedTest;
    solutionData: TestSolution | null;
    formData: FormData;
}): void => {
    const { matrixData, testData, solutionData, formData } = data;
    const { subject, className, schoolName, timeLimit, mcqRatio, writtenRatio, testName, schoolYear } = formData;
    const totalScore = 10;
    const mcqTotalScore = (mcqRatio / 100) * totalScore;
    const writtenTotalScore = (writtenRatio / 100) * totalScore;

    const cellStyles = {
        verticalAlign: VerticalAlign.CENTER,
        borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
        },
    };

    const headerCell = (text: string, shadingColor?: string, colSpan?: number, rowSpan?: number) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20 })], alignment: AlignmentType.CENTER })],
        ...cellStyles,
        columnSpan: colSpan,
        verticalMerge: rowSpan ? VerticalMergeType.RESTART : undefined,
        shading: shadingColor ? { fill: shadingColor, type: ShadingType.CLEAR } : undefined,
    });

    const bodyCell = (text: string | number, isBold = false, color?: string, colSpan?: number, rowSpan?: boolean, vMerge?: any) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: text.toString(), bold: isBold, size: 20, color })], alignment: AlignmentType.CENTER })],
        ...cellStyles,
        columnSpan: colSpan,
        verticalMerge: vMerge,
    });

    const leftAlignBodyCell = (text: string, isBold = false, colSpan?: number, vMerge?: any) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: isBold, size: 20 })], alignment: AlignmentType.LEFT })],
        ...cellStyles,
        columnSpan: colSpan,
        verticalMerge: vMerge,
    });

    const formatPoints = (points: number) => {
        if (points === 0) return '';
        return parseFloat(points.toFixed(2)).toString().replace('.', ',');
    };

    const totals = {
        mcq: { recognition: 0, comprehension: 0, application: 0, total: 0 },
        written: { recognition: 0, comprehension: 0, application: 0, total: 0 },
    };
    matrixData.matrix.forEach(row => {
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

    const getMcqPoints = (type: 'multipleChoice' | 'trueFalse' | 'matching' | 'fillBlank') => {
        if (formData.customPoints && formData.customPoints[type] > 0) {
            return formData.customPoints[type];
        }
        return pointsPerMcq;
    };

    const getWrittenPoints = (index: number) => {
        if (formData.customPoints && formData.customPoints.written && formData.customPoints.written[index] > 0) {
            return formData.customPoints.written[index];
        }
        return pointsPerWritten;
    };

    const level1Points = (totals.mcq.recognition * pointsPerMcq) + (totals.written.recognition * pointsPerWritten);
    const level2Points = (totals.mcq.comprehension * pointsPerMcq) + (totals.written.comprehension * pointsPerWritten);
    const level3Points = (totals.mcq.application * pointsPerMcq) + (totals.written.application * pointsPerWritten);

    // Question numbering logic consistent with UI
    let mcqCounter = 1;
    const mcqNums: Record<string, { recognition: number[]; comprehension: number[]; application: number[] }> = {};
    matrixData.matrix.forEach(row => {
        const key = `${row.themeName}-${row.lessonName}`;
        mcqNums[key] = { recognition: [], comprehension: [], application: [] };
        for (let i = 0; i < row.mcq.recognition; i++) mcqNums[key].recognition.push(mcqCounter++);
        for (let i = 0; i < row.mcq.comprehension; i++) mcqNums[key].comprehension.push(mcqCounter++);
        for (let i = 0; i < row.mcq.application; i++) mcqNums[key].application.push(mcqCounter++);
    });

    let writtenCounter = mcqCounter;
    const writtenNums: Record<string, { recognition: number[]; comprehension: number[]; application: number[] }> = {};
    matrixData.matrix.forEach(row => {
        const key = `${row.themeName}-${row.lessonName}`;
        writtenNums[key] = { recognition: [], comprehension: [], application: [] };
        for (let i = 0; i < row.written.recognition; i++) writtenNums[key].recognition.push(writtenCounter++);
        for (let i = 0; i < row.written.comprehension; i++) writtenNums[key].comprehension.push(writtenCounter++);
        for (let i = 0; i < row.written.application; i++) writtenNums[key].application.push(writtenCounter++);
    });

    const matrixHeader1 = new TableRow({
        children: [
            headerCell("Mạch kiến thức, kĩ năng", undefined, 2, 1),
            headerCell("Số câu và số điểm", undefined, 1, 1),
            headerCell("Mức 1", undefined, 2),
            headerCell("Mức 2", undefined, 2),
            headerCell("Mức 3", undefined, 2),
            headerCell("Tổng", undefined, 2),
            headerCell("Tỉ lệ", undefined, 1, 1),
        ],
    });

    const matrixHeader2 = new TableRow({
        children: [
            new TableCell({ children: [], ...cellStyles, columnSpan: 2, verticalMerge: VerticalMergeType.CONTINUE }),
            new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
            headerCell("TN"), headerCell("TL"),
            headerCell("TN"), headerCell("TL"),
            headerCell("TN"), headerCell("TL"),
            headerCell("TN"), headerCell("TL"),
            new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
        ],
    });

    const themeRows: Record<string, MatrixRow[]> = {};
    matrixData.matrix.forEach(row => {
        if (!themeRows[row.themeName]) themeRows[row.themeName] = [];
        themeRows[row.themeName].push(row);
    });

    const matrixBody = Object.entries(themeRows).flatMap(([themeName, rows]) => {
        return rows.flatMap((row, lessonIndex) => {
            const key = `${themeName}-${row.lessonName}`;
            const mcqRowTotal = row.mcq.recognition + row.mcq.comprehension + row.mcq.application;
            const writtenRowTotal = row.written.recognition + row.written.comprehension + row.written.application;
            const rowPointsTotal = (mcqRowTotal * pointsPerMcq) + (writtenRowTotal * pointsPerWritten);
            const rowPercentage = Math.round(rowPointsTotal / totalScore * 100);

            const r1 = new TableRow({
                children: [
                    leftAlignBodyCell(lessonIndex === 0 ? themeName : '', false, 1, lessonIndex === 0 ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE),
                    leftAlignBodyCell(row.lessonName, false, 1, VerticalMergeType.RESTART),
                    leftAlignBodyCell("Số câu", true),
                    bodyCell(row.mcq.recognition || ''), bodyCell(row.written.recognition || ''),
                    bodyCell(row.mcq.comprehension || ''), bodyCell(row.written.comprehension || ''),
                    bodyCell(row.mcq.application || ''), bodyCell(row.written.application || ''),
                    bodyCell(mcqRowTotal || '', true, "0000FF"), bodyCell(writtenRowTotal || '', true, "FF0000"),
                    bodyCell(rowPercentage > 0 ? `${rowPercentage}%` : '', true, "C00000", 1, true, VerticalMergeType.RESTART),
                ]
            });
            const r2 = new TableRow({
                children: [
                    new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
                    new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
                    leftAlignBodyCell("Câu số", true),
                    bodyCell(mcqNums[key].recognition.join(', ') || ''), bodyCell(writtenNums[key].recognition.join(', ') || ''),
                    bodyCell(mcqNums[key].comprehension.join(', ') || ''), bodyCell(writtenNums[key].comprehension.join(', ') || ''),
                    bodyCell(mcqNums[key].application.join(', ') || ''), bodyCell(writtenNums[key].application.join(', ') || ''),
                    bodyCell([...mcqNums[key].recognition, ...mcqNums[key].comprehension, ...mcqNums[key].application].join(', ') || '', true),
                    bodyCell([...writtenNums[key].recognition, ...writtenNums[key].comprehension, ...writtenNums[key].application].join(', ') || '', true),
                    new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
                ]
            });
            const r3 = new TableRow({
                children: [
                    new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
                    new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
                    leftAlignBodyCell("Số điểm", true),
                    bodyCell(formatPoints(row.mcq.recognition * pointsPerMcq), false, "C00000"),
                    bodyCell(formatPoints(row.written.recognition * pointsPerWritten), false, "C00000"),
                    bodyCell(formatPoints(row.mcq.comprehension * pointsPerMcq), false, "C00000"),
                    bodyCell(formatPoints(row.written.comprehension * pointsPerWritten), false, "C00000"),
                    bodyCell(formatPoints(row.mcq.application * pointsPerMcq), false, "C00000"),
                    bodyCell(formatPoints(row.written.application * pointsPerWritten), false, "C00000"),
                    bodyCell(formatPoints(mcqRowTotal * pointsPerMcq), true, "C00000"),
                    bodyCell(formatPoints(writtenRowTotal * pointsPerWritten), true, "C00000"),
                    new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
                ]
            });
            return [r1, r2, r3];
        });
    });

    const matrixFooter1 = new TableRow({
        children: [
            headerCell("Tổng", undefined, 2, 1),
            leftAlignBodyCell("Số câu", true),
            bodyCell(totals.mcq.recognition, true), bodyCell(totals.written.recognition, true),
            bodyCell(totals.mcq.comprehension, true), bodyCell(totals.written.comprehension, true),
            bodyCell(totals.mcq.application, true), bodyCell(totals.written.application, true),
            bodyCell(totals.mcq.total, true, "0000FF"), bodyCell(totals.written.total, true, "FF0000"),
            bodyCell("100%", true, "C00000", 1, true, VerticalMergeType.RESTART),
        ]
    });
    
    const matrixFooter2 = new TableRow({
        children: [
             new TableCell({ children: [], ...cellStyles, columnSpan: 2, verticalMerge: VerticalMergeType.CONTINUE }),
             leftAlignBodyCell("Câu số", true),
             bodyCell(matrixData.matrix.flatMap(r => mcqNums[`${r.themeName}-${r.lessonName}`].recognition).join(', '), true),
             bodyCell(matrixData.matrix.flatMap(r => writtenNums[`${r.themeName}-${r.lessonName}`].recognition).join(', '), true),
             bodyCell(matrixData.matrix.flatMap(r => mcqNums[`${r.themeName}-${r.lessonName}`].comprehension).join(', '), true),
             bodyCell(matrixData.matrix.flatMap(r => writtenNums[`${r.themeName}-${r.lessonName}`].comprehension).join(', '), true),
             bodyCell(matrixData.matrix.flatMap(r => mcqNums[`${r.themeName}-${r.lessonName}`].application).join(', '), true),
             bodyCell(matrixData.matrix.flatMap(r => writtenNums[`${r.themeName}-${r.lessonName}`].application).join(', '), true),
             bodyCell(matrixData.matrix.flatMap(r => {
                 const key = `${r.themeName}-${r.lessonName}`;
                 return [...mcqNums[key].recognition, ...mcqNums[key].comprehension, ...mcqNums[key].application];
             }).sort((a,b) => a-b).join(', '), true),
             bodyCell(matrixData.matrix.flatMap(r => {
                 const key = `${r.themeName}-${r.lessonName}`;
                 return [...writtenNums[key].recognition, ...writtenNums[key].comprehension, ...writtenNums[key].application];
             }).sort((a,b) => a-b).join(', '), true),
             new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
        ]
    });

    const matrixFooter3 = new TableRow({
        children: [
             new TableCell({ children: [], ...cellStyles, columnSpan: 2, verticalMerge: VerticalMergeType.CONTINUE }),
             leftAlignBodyCell("Số điểm", true),
             bodyCell(formatPoints(level1Points), true, "C00000", 2),
             bodyCell(formatPoints(level2Points), true, "C00000", 2),
             bodyCell(formatPoints(level3Points), true, "C00000", 2),
             bodyCell(formatPoints(mcqTotalScore), true, "C00000"),
             bodyCell(formatPoints(writtenTotalScore), true, "C00000"),
             new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
        ]
    });

    const matrixFooter4 = new TableRow({
        children: [
             new TableCell({ children: [], ...cellStyles, columnSpan: 2, verticalMerge: VerticalMergeType.CONTINUE }),
             leftAlignBodyCell("Tổng tỉ lệ", true),
             bodyCell(`${Math.round(level1Points / totalScore * 100)}%`, true, "000000", 2),
             bodyCell(`${Math.round(level2Points / totalScore * 100)}%`, true, "000000", 2),
             bodyCell(`${Math.round(level3Points / totalScore * 100)}%`, true, "000000", 2),
             bodyCell(`${Math.round(mcqTotalScore / totalScore * 100)}%`, true),
             bodyCell(`${Math.round(writtenTotalScore / totalScore * 100)}%`, true),
             new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
        ]
    });

    const matrixTable = new Table({
        rows: [matrixHeader1, matrixHeader2, ...matrixBody, matrixFooter1, matrixFooter2, matrixFooter3, matrixFooter4],
        width: { size: 100, type: WidthType.PERCENTAGE },
    });

    // --- Spec Table ---
    const specHeader = new TableRow({
        children: [
            headerCell("Chủ đề", undefined, 1, 1),
            headerCell("Nội dung/Đơn vị kiến thức", undefined, 1, 1),
            headerCell("Mức độ đánh giá", undefined, 1, 1),
            headerCell("Số câu hỏi", undefined, 3),
        ],
    });
    const specHeader2 = new TableRow({
        children: [
            new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
            new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
            new TableCell({ children: [], ...cellStyles, verticalMerge: VerticalMergeType.CONTINUE }),
            headerCell("Nhận biết"), headerCell("Thông hiểu"), headerCell("Vận dụng"),
        ],
    });

    const specBody = matrixData.specTable.map((spec, index) => {
        const matrixMatch = matrixData.matrix.find(m => m.lessonName === spec.lessonName);
        return new TableRow({
            children: [
                leftAlignBodyCell(spec.themeName),
                leftAlignBodyCell(spec.lessonName),
                new TableCell({
                    children: [
                        new Paragraph({ children: [new TextRun({ text: "Nhận biết: ", bold: true, size: 18 }), new TextRun({ text: spec.description.recognition, size: 18 })] }),
                        new Paragraph({ children: [new TextRun({ text: "Thông hiểu: ", bold: true, size: 18 }), new TextRun({ text: spec.description.comprehension, size: 18 })] }),
                        new Paragraph({ children: [new TextRun({ text: "Vận dụng: ", bold: true, size: 18 }), new TextRun({ text: spec.description.application, size: 18 })] }),
                    ],
                    ...cellStyles
                }),
                bodyCell(matrixMatch ? `${matrixMatch.mcq.recognition}/${matrixMatch.written.recognition}` : '-'),
                bodyCell(matrixMatch ? `${matrixMatch.mcq.comprehension}/${matrixMatch.written.comprehension}` : '-'),
                bodyCell(matrixMatch ? `${matrixMatch.mcq.application}/${matrixMatch.written.application}` : '-'),
            ]
        });
    });

    const specTable = new Table({
        rows: [specHeader, specHeader2, ...specBody],
        width: { size: 100, type: WidthType.PERCENTAGE },
    });

    // --- Test Section ---
    let questionCounter = 0;
    const testChildren: (Paragraph | Table)[] = [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: schoolName?.toUpperCase() || "TRƯỜNG TIỂU HỌC ..........", bold: true, size: 24 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: testName.toUpperCase(), bold: true, size: 28 })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NĂM HỌC: ${schoolYear.toUpperCase()}`, bold: true, size: 24 })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: `Môn: ${subject}`, bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: `Thời gian: ${timeLimit} phút`, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "Lớp: " + (className || "......."), size: 24 })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: `I. PHẦN TRẮC NGHIỆM (${formatPoints(mcqTotalScore).replace(',', '.')} điểm)`, bold: true, size: 26 })] }),
    ];

    const getQuestionType = (q: any) => {
        if (q.options) return 'multipleChoice';
        if (q.pairs) return 'matching';
        if (q.correctAnswer !== undefined && typeof q.correctAnswer === 'boolean') return 'trueFalse';
        return 'fillBlank';
    };

    const addQuestion = (q: any) => {
        questionCounter++;
        const type = getQuestionType(q);
        testChildren.push(new Paragraph({
            children: [
                new TextRun({ text: `Câu ${questionCounter} (${formatPoints(getMcqPoints(type)).replace(',', '.')} điểm): `, bold: true, size: 22 }),
                new TextRun({ text: q.questionText || q.prompt || "", size: 22 }),
            ]
        }));
    };

    (testData.trueFalseQuestions || []).forEach(q => {
        addQuestion(q);
        testChildren.push(new Paragraph({ children: [new TextRun({ text: "  A. Đúng    B. Sai", size: 22 })] }));
        testChildren.push(new Paragraph({ text: "" }));
    });

    (testData.matchingQuestions || []).forEach(q => {
        addQuestion(q);
        const rows = q.pairs.map((p, i) => new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${p.itemA}`, size: 20 })] })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${String.fromCharCode(65 + i)}. ${p.itemB}`, size: 20 })] })], width: { size: 50, type: WidthType.PERCENTAGE } }),
            ]
        }));
        testChildren.push(new Table({ rows, width: { size: 90, type: WidthType.PERCENTAGE } }));
        testChildren.push(new Paragraph({ text: "" }));
    });

    (testData.fillBlankQuestions || []).forEach(q => {
        addQuestion(q);
        testChildren.push(new Paragraph({ text: "" }));
    });

    (testData.multipleChoiceQuestions || []).forEach(q => {
        addQuestion(q);
        q.options.forEach((opt, i) => {
            testChildren.push(new Paragraph({ children: [new TextRun({ text: `  ${String.fromCharCode(65 + i)}. ${sanitizeOption(opt)}`, size: 22 })] }));
        });
        testChildren.push(new Paragraph({ text: "" }));
    });

    const writtenLabelFull = formData.writtenType === 'practice' ? 'THỰC HÀNH' : formData.writtenType === 'both' ? 'TỰ LUẬN VÀ THỰC HÀNH' : 'TỰ LUẬN';
    testChildren.push(new Paragraph({ children: [new TextRun({ text: `II. PHẦN ${writtenLabelFull} (${formatPoints(writtenTotalScore).replace(',', '.')} điểm)`, bold: true, size: 26 })] }));
    (testData.writtenQuestions || []).forEach((q, i) => {
        testChildren.push(new Paragraph({
            children: [
                new TextRun({ text: `Câu ${questionCounter + i + 1} (${formatPoints(getWrittenPoints(i)).replace(',', '.')} điểm): `, bold: true, size: 22 }),
                new TextRun({ text: q.questionText, size: 22 }),
            ]
        }));
        testChildren.push(new Paragraph({ text: "" }), new Paragraph({ text: "" }));
    });

    // --- Solution Section ---
    const solutionChildren: (Paragraph | Table)[] = [
        new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM", bold: true, size: 28 })] }),
        new Paragraph({ text: "" }),
        new Paragraph({ children: [new TextRun({ text: "I. PHẦN TRẮC NGHIỆM", bold: true, size: 26 })] }),
    ];
    let ansIdx = 0;
    (testData.trueFalseQuestions || []).forEach(q => { ansIdx++; solutionChildren.push(new Paragraph({ children: [new TextRun({ text: `Câu ${ansIdx}: ${q.correctAnswer ? "Đúng" : "Sai"}`, size: 22 })] })); });
    (testData.matchingQuestions || []).forEach(q => { ansIdx++; solutionChildren.push(new Paragraph({ children: [new TextRun({ text: `Câu ${ansIdx}: ${q.pairs.map(p => `${p.itemA}-${p.itemB}`).join('; ')}`, size: 22 })] })); });
    (testData.fillBlankQuestions || []).forEach(q => { ansIdx++; solutionChildren.push(new Paragraph({ children: [new TextRun({ text: `Câu ${ansIdx}: ${q.correctAnswer}`, size: 22 })] })); });
    (testData.multipleChoiceQuestions || []).forEach(q => { ansIdx++; solutionChildren.push(new Paragraph({ children: [new TextRun({ text: `Câu ${ansIdx}: ${String.fromCharCode(65 + q.options.indexOf(q.correctAnswer))}`, size: 22 })] })); });

    if (solutionData) {
        solutionChildren.push(new Paragraph({ text: "" }));
        solutionChildren.push(new Paragraph({ children: [new TextRun({ text: "II. PHẦN TỰ LUẬN - HƯỚNG DẪN CHẤM", bold: true, size: 26 })] }));
        solutionData.writtenGradingGuides.forEach((guide, i) => {
            solutionChildren.push(new Paragraph({ children: [new TextRun({ text: `Câu ${ansIdx + i + 1}: `, bold: true, size: 22 }), new TextRun({ text: guide.questionText, italics: true, size: 22 })] }));
            guide.detailedGuide.split('\n').forEach(line => solutionChildren.push(new Paragraph({ children: [new TextRun({ text: line, size: 20 })], indent: { left: 400 } })));
        });
    }

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `MA TRẬN ${testName.toUpperCase()}`, bold: true, size: 32 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NĂM HỌC: ${schoolYear.toUpperCase()}`, bold: true, size: 24 })] }),
                new Paragraph({ text: "" }),
                matrixTable,
                new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `BẢN ĐẶC TẢ ${testName.toUpperCase()}`, bold: true, size: 32 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NĂM HỌC: ${schoolYear.toUpperCase()}`, bold: true, size: 24 })] }),
                new Paragraph({ text: "" }),
                specTable,
                new Paragraph({ pageBreakBefore: true }),
                ...testChildren,
                ...solutionChildren
            ],
        }],
    });

    Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bo-de-kiem-tra-day-du-${subject.toLowerCase().replace(/\s+/g, '-')}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
};

export const exportTestWithSolutionToDocx = (
    testData: GeneratedTest,
    solutionData: TestSolution,
    formData: FormData,
): void => {
  const { schoolName, subject, timeLimit, className, mcqRatio, writtenRatio, testName, schoolYear } = formData;
  
  const totalScore = 10;
  const mcqScore = (mcqRatio / 100) * totalScore;
  const writtenScore = (writtenRatio / 100) * totalScore;
  
  const totalMcqCount = (testData.multipleChoiceQuestions?.length || 0) + 
                        (testData.trueFalseQuestions?.length || 0) + 
                        (testData.matchingQuestions?.length || 0) + 
                        (testData.fillBlankQuestions?.length || 0);
  
  const totalWrittenCount = testData.writtenQuestions?.length || 0;

  const pointsPerMcq = totalMcqCount > 0 ? mcqScore / totalMcqCount : 0;
  const pointsPerWritten = totalWrittenCount > 0 ? writtenScore / totalWrittenCount : 0;

  const getMcqPoints = (type: 'multipleChoice' | 'trueFalse' | 'matching' | 'fillBlank') => {
    if (formData.customPoints && formData.customPoints[type] > 0) {
        return formData.customPoints[type];
    }
    return pointsPerMcq;
  };

  const getWrittenPoints = (index: number) => {
    if (formData.customPoints && formData.customPoints.written && formData.customPoints.written[index] > 0) {
        return formData.customPoints.written[index];
    }
    return pointsPerWritten;
  };

  const formatScore = (score: number) => score.toFixed(1).replace(/\.0$/, '');
  const formatPoints = (points: number) => parseFloat(points.toFixed(2)).toString();

  let questionCounter = 0;

  // --- Start of Test Content Generation ---
  const children: (Paragraph | Table)[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [ new TextRun({ text: schoolName ? schoolName.toUpperCase() : "TRƯỜNG TIỂU HỌC ..........", bold: true, size: 24, })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [ new TextRun({ text: testName.toUpperCase(), bold: true, size: 28, }), ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [ new TextRun({ text: `NĂM HỌC: ${schoolYear.toUpperCase()}`, bold: true, size: 24, }), ],
      }),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [ new TextRun({ text: `Môn: ${subject}`, bold: true, size: 24 })]}),
      new Paragraph({ children: [ new TextRun({ text: `Thời gian làm bài: ${timeLimit} phút`, size: 24 })]}),
      new Paragraph({ children: [ new TextRun({ text: `Lớp: ${className || '..............................'}`, size: 24 })]}),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [ new TextRun({ text: `I. PHẦN TRẮC NGHIỆM (${formatScore(mcqScore)} điểm)`, bold: true, size: 26, })], heading: HeadingLevel.HEADING_1}),
  ];
  (testData.trueFalseQuestions || []).forEach(q => { questionCounter++; children.push(new Paragraph({children: [new TextRun({ text: `Câu ${questionCounter} (${formatPoints(getMcqPoints('trueFalse'))} điểm): `, bold: true, size: 24 }), new TextRun({ text: q.questionText, size: 24 })]})); children.push(new Paragraph({ children: [new TextRun({ text: `  A. Đúng`, size: 24 })]})); children.push(new Paragraph({ children: [new TextRun({ text: `  B. Sai`, size: 24 })]})); children.push(new Paragraph({ text: "" })); });
  (testData.matchingQuestions || []).forEach(q => { questionCounter++; children.push(new Paragraph({children: [new TextRun({ text: `Câu ${questionCounter} (${formatPoints(getMcqPoints('matching'))} điểm): `, bold: true, size: 24 }), new TextRun({ text: q.prompt, size: 24 })]})); const rows: TableRow[] = []; q.pairs.forEach((pair, index) => { rows.push(new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: `${index + 1}. ${pair.itemA}` })], width: { size: 45, type: WidthType.PERCENTAGE } }), new TableCell({ children: [new Paragraph({ text: `${String.fromCharCode(65 + index)}. ${pair.itemB}` })], width: { size: 45, type: WidthType.PERCENTAGE } }), ]})); }); children.push(new Table({ rows, width: { size: 90, type: WidthType.PERCENTAGE } })); children.push(new Paragraph({ text: "" })); });
  (testData.fillBlankQuestions || []).forEach(q => { questionCounter++; children.push(new Paragraph({children: [new TextRun({ text: `Câu ${questionCounter} (${formatPoints(getMcqPoints('fillBlank'))} điểm): `, bold: true, size: 24 }), new TextRun({ text: q.questionText, size: 24 })]})); children.push(new Paragraph({ text: "" })); });
  (testData.multipleChoiceQuestions || []).forEach(q => { questionCounter++; children.push(new Paragraph({children: [new TextRun({ text: `Câu ${questionCounter} (${formatPoints(getMcqPoints('multipleChoice'))} điểm): `, bold: true, size: 24 }), new TextRun({ text: q.questionText, size: 24 })]})); q.options.forEach((option, optIndex) => { children.push(new Paragraph({ children: [new TextRun({ text: `  ${String.fromCharCode(65 + optIndex)}. ${sanitizeOption(option)}`, size: 24 })]})); }); children.push(new Paragraph({ text: "" })); });
  const writtenLabelSol = formData.writtenType === 'practice' ? 'THỰC HÀNH' : formData.writtenType === 'both' ? 'TỰ LUẬN VÀ THỰC HÀNH' : 'TỰ LUẬN';
  children.push(new Paragraph({ children: [ new TextRun({ text: `II. PHẦN ${writtenLabelSol} (${formatScore(writtenScore)} điểm)`, bold: true, size: 26, })], heading: HeadingLevel.HEADING_1}));
  (testData.writtenQuestions || []).forEach((q, index) => { children.push(new Paragraph({children: [new TextRun({ text: `Câu ${questionCounter + index + 1} (${formatPoints(getWrittenPoints(index))} điểm): `, bold: true, size: 24 }), new TextRun({ text: q.questionText, size: 24 })]})); children.push(new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" })); });
  // --- End of Test Content Generation ---

  // --- Start of Solution Content Generation ---
  children.push(new Paragraph({ pageBreakBefore: true }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: "ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM", bold: true, size: 28, })]}));
  children.push(new Paragraph({ text: "" }));
  children.push(new Paragraph({ children: [ new TextRun({ text: `I. PHẦN TRẮC NGHIỆM`, bold: true, size: 26, })], heading: HeadingLevel.HEADING_1}));
  
  let answerCounter = 0;
  (testData.trueFalseQuestions || []).forEach(q => { answerCounter++; children.push(new Paragraph({ children: [new TextRun({ text: `Câu ${answerCounter}: ${q.correctAnswer ? 'Đúng' : 'Sai'}`, size: 24 })]})); });
  (testData.matchingQuestions || []).forEach(q => { answerCounter++; const answers = q.pairs.map(p => `${p.itemA} - ${p.itemB}`).join('; '); children.push(new Paragraph({ children: [new TextRun({ text: `Câu ${answerCounter}: ${answers}`, size: 24 })]})); });
  (testData.fillBlankQuestions || []).forEach(q => { answerCounter++; children.push(new Paragraph({ children: [new TextRun({ text: `Câu ${answerCounter}: ${q.correctAnswer}`, size: 24 })]})); });
  (testData.multipleChoiceQuestions || []).forEach(q => { answerCounter++; const correctOpt = String.fromCharCode(65 + q.options.indexOf(q.correctAnswer)); children.push(new Paragraph({ children: [new TextRun({ text: `Câu ${answerCounter}: ${correctOpt}`, size: 24 })]})); });

  children.push(new Paragraph({ text: "" }));
  children.push(new Paragraph({ children: [ new TextRun({ text: `II. PHẦN ${writtenLabelSol} - HƯỚNG DẪN CHẤM`, bold: true, size: 26, })], heading: HeadingLevel.HEADING_1}));
  
  (solutionData.writtenGradingGuides || []).forEach((guide, index) => {
      children.push(new Paragraph({ children: [ new TextRun({ text: `Câu ${answerCounter + index + 1}: `, bold: true, size: 24 }), new TextRun({ text: guide.questionText, size: 24, bold: true, italics: true })]}));
      guide.detailedGuide.split('\n').forEach(line => {
           children.push(new Paragraph({ children: [new TextRun({ text: line, size: 24 })], indent: { left: 400 } }));
      });
      children.push(new Paragraph({ text: "" }));
  });
  // --- End of Solution Content Generation ---

  const doc = new Document({ sections: [{ properties: {}, children }], });

  Packer.toBlob(doc).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dap-an-de-kiem-tra-${subject.toLowerCase().replace(/\s+/g, '-')}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
};