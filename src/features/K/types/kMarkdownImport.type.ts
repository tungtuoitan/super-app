export interface KMdQuestion {
    question: string;
    answer: string;
}

export interface KMdTest {
    name: string;
    questions: KMdQuestion[];
}

export interface KMdParsed {
    keyword: string | null;
    tests: KMdTest[];
    orphanQuestions: KMdQuestion[];
}

export interface KExistingTestAddition {
    testId: number;
    questions: KMdQuestion[];
}

export interface KImportTestMarkdownRequest {
    parentNodeId: number;
    tests: KMdTest[];
    orphanQuestions: KMdQuestion[];
    existingTestAdditions: KExistingTestAddition[];
}
