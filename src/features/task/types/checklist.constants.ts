/**
 * Checklist Constants
 * Environment configuration for testcase checklists.
 */

export const TESTCASE_ENVIRONMENTS = ["LOCAL", "DEV", "UAT", "PROD"] as const;

export type TestcaseEnvironment = (typeof TESTCASE_ENVIRONMENTS)[number];

/** Environments always shown in testcase checklist */
export const REQUIRED_ENVIRONMENTS: TestcaseEnvironment[] = ["LOCAL", "DEV"];

/** Environments the user can toggle on/off */
export const OPTIONAL_ENVIRONMENTS: TestcaseEnvironment[] = ["UAT", "PROD"];

export const DEFAULT_ENV: TestcaseEnvironment = "LOCAL";
