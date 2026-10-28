import type { DurationUnit, RedFlagLevel, Severity } from "../constants/clinical.js";

/**
 * Rule-based urgent-symptom ("red flag") pathway.
 *
 * It is deliberately independent of the AI: it runs first, always, and the AI
 * can never lower or override its result. It errs on the side of caution
 * (e.g. "no chest pain" still matches), because a missed emergency is far
 * worse than an unnecessary warning.
 *
 * !! The rule list is a prototype and has NOT been clinically reviewed. It
 * !! must be reviewed and signed off by qualified clinicians before any real
 * !! use. `clinicallyReviewed` stays false until that happens.
 */
export const RED_FLAG_RULES_VERSION = "2026-10-demo-v1";
export const RED_FLAGS_CLINICALLY_REVIEWED = false;

export interface SafetySymptom {
  name: string;
  severity: Severity;
  duration: { value: number; unit: DurationUnit };
}

export interface SafetyInput {
  symptoms: SafetySymptom[];
  description?: string | undefined;
  ageYears?: number | undefined;
}

export interface RedFlagMatch {
  id: string;
  label: string;
  level: Exclude<RedFlagLevel, "none">;
}

export interface RedFlagResult {
  level: RedFlagLevel;
  matches: RedFlagMatch[];
  advice: string;
  rulesVersion: string;
  clinicallyReviewed: boolean;
  evaluatedAt: Date;
}

interface TextRule {
  id: string;
  label: string;
  level: Exclude<RedFlagLevel, "none">;
  pattern: RegExp;
}

const TEXT_RULES: TextRule[] = [
  // ---- emergency -----------------------------------------------------------
  { id: "chest_pain", label: "Chest pain or pressure", level: "emergency",
    pattern: /chest (pain|pressure|tightness|discomfort|heaviness)|(pain|pressure|tightness|discomfort|heaviness|squeezing|burning) (in|on|across|around) (my |the )?chest|(tight|heavy|crushing) chest|chest (feels|is) (tight|heavy|crushed|squeezed)|heart attack/ },
  { id: "breathing", label: "Difficulty breathing", level: "emergency",
    pattern: /(can'?t|cannot|unable to|difficulty|trouble|struggling to|hard to|hard for me to) breath|catch (my|his|her|their) breath|shortness of breath|short of breath|breathless|gasping|choking|not getting enough air/ },
  { id: "stroke", label: "Possible stroke signs", level: "emergency",
    pattern: /face (is )?droop|drooping (of )?(the )?(face|mouth)|slurred speech|can'?t speak|sudden(ly)? (weak|numb)|weakness (on )?(one|the left|the right) side|sudden confusion|sudden (loss of vision|vision loss)|\bstroke\b/ },
  { id: "unconscious", label: "Loss of consciousness", level: "emergency",
    pattern: /unconscious|passed out|fainted|fainting|collapsed|unresponsive|not responding|blacked out/ },
  { id: "seizure", label: "Seizure", level: "emergency", pattern: /seizure|convuls/ },
  { id: "severe_bleeding", label: "Severe bleeding", level: "emergency",
    pattern: /severe bleeding|heavy bleeding|bleeding (that )?(won'?t|will not|doesn'?t|does not) stop|vomit(ing)? (up )?blood|coughing (up )?blood|blood in (my )?vomit/ },
  { id: "allergic_reaction", label: "Severe allergic reaction", level: "emergency",
    pattern: /(swelling|swollen) (of |in )?(the |my )?(face|lips|tongue|throat)|throat (is )?(closing|swelling)|anaphyla/ },
  { id: "self_harm", label: "Thoughts of self-harm", level: "emergency",
    pattern: /suicid|kill myself|end my life|ending my life|want to die|self[- ]harm|hurt myself|harm myself/ },
  { id: "worst_headache", label: "Sudden severe headache", level: "emergency",
    pattern: /worst headache|thunderclap|sudden(ly)? (severe|terrible|intense) headache/ },
  { id: "poisoning", label: "Possible poisoning or overdose", level: "emergency",
    pattern: /overdos|poison|swallowed (bleach|pesticide|chemical|cleaning)|ingested (bleach|pesticide|chemical)/ },

  // ---- urgent --------------------------------------------------------------
  { id: "blood_in_stool_urine", label: "Blood in stool or urine", level: "urgent",
    pattern: /blood in (my )?(stool|urine|poop)|black (and )?(tarry )?stools?|tarry stool|bloody (stool|urine)/ },
  { id: "dehydration", label: "Unable to keep fluids down", level: "urgent",
    pattern: /(can'?t|cannot|unable to) keep (any )?(food|fluids?|water|liquids?) down|not (passing|passed) (any )?urine|no urine/ },
];

const SEVERE_ABDOMINAL = /(abdom|stomach|belly)/;
const PAIN = /(pain|cramp|ache)/;
const FEVER = /(fever|temperature)/;

const normalise = (value: string): string =>
  value.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim();

const toDays = (value: number, unit: DurationUnit): number => {
  switch (unit) {
    case "hours": return value / 24;
    case "days": return value;
    case "weeks": return value * 7;
    case "months": return value * 30;
  }
};

const ADVICE: Record<RedFlagLevel, string> = {
  emergency:
    "Some of what you described can be a sign of a medical emergency. Call 112 (India's emergency number) or go to the nearest emergency department now. Do not wait for an online review.",
  urgent:
    "Some of what you described needs prompt medical attention. Arrange to see a doctor today, or go to urgent care if you get worse.",
  none:
    "No urgent warning signs were detected from what you entered. This is not a guarantee. Seek urgent care if you feel worse or develop new severe symptoms.",
};

const SELF_HARM_ADVICE =
  " If you are thinking about harming yourself, call 112 or the Tele-MANAS helpline (14416) right away.";

export const evaluateRedFlags = (input: SafetyInput): RedFlagResult => {
  const text = normalise(
    [...input.symptoms.map((s) => s.name), input.description ?? ""].join(" . "),
  );

  const matches: RedFlagMatch[] = [];
  const add = (match: RedFlagMatch) => {
    if (!matches.some((m) => m.id === match.id)) matches.push(match);
  };

  for (const rule of TEXT_RULES) {
    if (rule.pattern.test(text)) add({ id: rule.id, label: rule.label, level: rule.level });
  }

  for (const symptom of input.symptoms) {
    const name = normalise(symptom.name);
    if (symptom.severity === "severe" && SEVERE_ABDOMINAL.test(name) && PAIN.test(name)) {
      add({ id: "severe_abdominal_pain", label: "Severe abdominal pain", level: "urgent" });
    }
    if (FEVER.test(name)) {
      if (toDays(symptom.duration.value, symptom.duration.unit) >= 3) {
        add({ id: "persistent_fever", label: "Fever lasting 3 days or more", level: "urgent" });
      }
      if (input.ageYears !== undefined && input.ageYears < 1) {
        add({ id: "infant_fever", label: "Fever in an infant", level: "urgent" });
      }
    }
  }

  const level: RedFlagLevel = matches.some((m) => m.level === "emergency")
    ? "emergency"
    : matches.length > 0
      ? "urgent"
      : "none";

  let advice = ADVICE[level];
  if (matches.some((m) => m.id === "self_harm")) advice += SELF_HARM_ADVICE;

  return {
    level,
    matches,
    advice,
    rulesVersion: RED_FLAG_RULES_VERSION,
    clinicallyReviewed: RED_FLAGS_CLINICALLY_REVIEWED,
    evaluatedAt: new Date(),
  };
};
