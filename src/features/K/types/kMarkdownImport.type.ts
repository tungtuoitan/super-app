export interface KMdQuestion {
    question: string;
    answer: string;
}

export interface KMdQuiz {
    name: string;
    questions: KMdQuestion[];
}

export interface KMdParsed {
    keyword: string | null;
    tests: KMdQuiz[];
    orphanQuestions: KMdQuestion[];
}

export interface KExistingQuizAddition {
    testId: number;
    questions: KMdQuestion[];
}

export interface KImportQuizMarkdownRequest {
    parentNodeId: number;
    tests: KMdQuiz[];
    orphanQuestions: KMdQuestion[];
    existingTestAdditions: KExistingQuizAddition[];
}
