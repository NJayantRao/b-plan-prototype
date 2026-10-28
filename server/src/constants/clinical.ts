export const SEVERITIES = ["mild", "moderate", "severe"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const DURATION_UNITS = ["hours", "days", "weeks", "months"] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

export const ASSESSMENT_STATUSES = [
  "awaiting_review",
  "in_review",
  "reviewed",
  "second_opinion",
  "completed",
] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const PRIORITIES = ["routine", "urgent", "emergency"] as const;
export type Priority = (typeof PRIORITIES)[number];
/** Lower sorts first in the doctor queue. */
export const PRIORITY_RANK: Record<Priority, number> = {
  emergency: 0,
  urgent: 1,
  routine: 2,
};

export const RED_FLAG_LEVELS = ["none", "urgent", "emergency"] as const;
export type RedFlagLevel = (typeof RED_FLAG_LEVELS)[number];

export const AI_STATUSES = [
  "pending",
  "completed",
  "unavailable",
  "not_requested",
] as const;
export type AiStatus = (typeof AI_STATUSES)[number];
export const AI_MODES = ["gemini", "demo"] as const;
export type AiMode = (typeof AI_MODES)[number];

export const REVIEW_KINDS = ["primary", "second_opinion"] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];
export const REVIEW_URGENCIES = ["routine", "soon", "urgent", "emergency"] as const;
export const AI_AGREEMENTS = [
  "agree",
  "partially_agree",
  "disagree",
  "not_assessed",
] as const;
export type AiAgreement = (typeof AI_AGREEMENTS)[number];

export const SECOND_OPINION_STATUSES = ["requested", "assigned", "completed"] as const;
export type SecondOpinionStatus = (typeof SECOND_OPINION_STATUSES)[number];
export const SECOND_OPINION_OUTCOMES = [
  "confirms_primary",
  "differs_from_primary",
  "inconclusive",
] as const;
export type SecondOpinionOutcome = (typeof SECOND_OPINION_OUTCOMES)[number];

export const TASK_TYPES = [
  "medication",
  "test",
  "referral",
  "lifestyle",
  "follow_up",
  "other",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export const TASK_STATUSES = ["pending", "in_progress", "completed", "skipped"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const PLAN_STATUSES = ["active", "completed", "cancelled"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];
