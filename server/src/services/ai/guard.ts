import type { AiAssessmentCore } from "./ai-types.js";

/**
 * Last line of defence on the model's output. Even schema-valid output is
 * rejected if it prescribes, doses, or falsely reassures. A rejected response
 * is treated as "AI unavailable" so the case falls back to a clinician.
 */
const DISALLOWED: { id: string; pattern: RegExp }[] = [
  { id: "dosage", pattern: /\b\d+(\.\d+)?\s?(mg|mcg|µg|ug|ml|iu)\b/i },
  { id: "prescribe", pattern: /\bprescri(be|bed|ption)\b/i },
  { id: "take_pills", pattern: /\btake\s+(\d+|one|two|three)\s+(tablet|pill|capsule)s?\b/i },
  { id: "diagnosis_claim", pattern: /\b(you (definitely|certainly) have|i diagnose|you are diagnosed with|diagnosis is)\b/i },
  { id: "rules_out_emergency", pattern: /\b(this|it) (is|'s) not (an )?(emergency|serious|urgent)\b|\bno (need|reason) to (see|seek|worry)\b|\brule[sd]? out (an )?emergenc|\bnothing to worry about\b/i },
];

const collectText = (a: AiAssessmentCore): string[] => [
  a.summary,
  a.uncertainty,
  ...a.possibleExplanations.flatMap((e) => [e.name, e.reasoning]),
  ...a.missingInformation,
  ...a.suggestedNextSteps.map((s) => s.action),
  ...a.whenToSeekUrgentCare,
  ...(a.suggestedSpecialty ? [a.suggestedSpecialty] : []),
];

/** Returns the id of the first violated rule, or null if the output is acceptable. */
export const findDisallowedContent = (assessment: AiAssessmentCore): string | null => {
  for (const text of collectText(assessment)) {
    for (const rule of DISALLOWED) {
      if (rule.pattern.test(text)) return rule.id;
    }
  }
  return null;
};
