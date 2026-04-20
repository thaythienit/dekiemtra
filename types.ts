export enum CognitiveLevel {
  NHAN_BIET = 'Nhận biết',
  THONG_HIEU = 'Thông hiểu',
  VAN_DUNG = 'Vận dụng',
}

export interface MultipleChoiceQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;

  cognitiveLevel: CognitiveLevel;
}

export interface TrueFalseQuestion {
  questionText: string;
  correctAnswer: boolean;
  cognitiveLevel: CognitiveLevel;
}

export interface MatchingPair {
  itemA: string;
  itemB: string;
}

export interface MatchingQuestion {
  prompt: string;
  pairs: MatchingPair[];
  cognitiveLevel: CognitiveLevel;
}

export interface FillBlankQuestion {
  questionText: string;
  correctAnswer: string;
  cognitiveLevel: CognitiveLevel;
}

export interface WrittenQuestion {
  questionText: string;
  suggestedAnswer: string;
  cognitiveLevel: CognitiveLevel;
  type?: 'essay' | 'practice';
}

export interface GeneratedTest {
  multipleChoiceQuestions: MultipleChoiceQuestion[];
  trueFalseQuestions: TrueFalseQuestion[];
  matchingQuestions: MatchingQuestion[];
  fillBlankQuestions: FillBlankQuestion[];
  writtenQuestions: WrittenQuestion[];
}

export interface Lesson {
  id: string;
  name: string;
  startPage: number;
  endPage: number;
}

export interface SubjectTheme {
  id: string;
  name: string;
  lessons: Lesson[];
}


export interface FormData {
  schoolName: string;
  subject: string;
  className: string;
  testName: string;
  schoolYear: string;
  mcqRatio: number; // For score distribution
  writtenRatio: number; // For score distribution
  mcqCount: number;
  writtenCount: number;
  writtenType: 'essay' | 'practice' | 'both';
  totalQuestionCount: number;
  cognitiveLevelCounts: {
    mcq: {
      recognition: number;
      comprehension: number;
      application: number;
    };
    written: {
      recognition: number;
      comprehension: number;
      application: number;
    };
  };
  fileContent: string;
  fileImages: string[];
  subjectThemes: SubjectTheme[];
  timeLimit: number;
  mcqTypeCounts: {
    multipleChoice: number;
    trueFalse: number;
    matching: number;
    fillBlank: number;
  };
  additionalRequirements?: string;
  customPoints?: {
    multipleChoice: number;
    trueFalse: number;
    matching: number;
    fillBlank: number;
    written: number[];
  };
}

export interface MatrixRow {
  themeName: string;
  lessonName: string;
  mcq: {
    recognition: number;
    comprehension: number;
    application: number;
  };
  written: {
    recognition: number;
    comprehension: number;
    application: number;
  };
}

export interface SpecRow {
  themeName: string;
  lessonName: string;
  description: {
    recognition: string;
    comprehension: string;
    application: string;
  };
}

export interface TechnicalDesign {
  matrix: MatrixRow[];
  specTable: SpecRow[];
}

export type TestMatrix = TechnicalDesign;

export interface SavedTest {
  id: string;
  name: string;
  createdAt: string;
  testData: GeneratedTest;
  formData: FormData;
}

export interface WrittenGradingGuide {
  questionText: string;
  detailedGuide: string; // Detailed grading steps and points breakdown.
}

export interface TestSolution {
    writtenGradingGuides: WrittenGradingGuide[];
}