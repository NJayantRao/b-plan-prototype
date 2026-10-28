import type { AiAssessmentCore, AiInput, AiProvider } from "./ai-types.js";

export const DEMO_MODEL = "demo-deterministic-v1";

interface Topic {
  test: RegExp;
  explanations: AiAssessmentCore["possibleExplanations"];
  missing: string[];
  specialty: string;
}

const TOPICS: Topic[] = [
  {
    test: /cough|sore throat|runny nose|congestion|sneez|cold|flu/,
    explanations: [
      { name: "Viral upper respiratory infection", likelihood: "more_likely", reasoning: "Cough, throat or nasal symptoms are commonly caused by viral infections." },
      { name: "Allergic rhinitis", likelihood: "possible", reasoning: "Nasal and throat irritation can follow allergen exposure." },
      { name: "Influenza-like illness", likelihood: "possible", reasoning: "Fever with body aches and cough can fit a flu-like illness." },
    ],
    missing: ["Any recent contact with someone who is unwell", "Whether there is a fever, and how high", "Any chest tightness or breathlessness"],
    specialty: "General Medicine",
  },
  {
    test: /nausea|vomit|diarrh|stomach|abdom|belly|indigestion|acid/,
    explanations: [
      { name: "Viral gastroenteritis", likelihood: "more_likely", reasoning: "Stomach upset with nausea or loose stools often follows a stomach bug." },
      { name: "Food-related illness", likelihood: "possible", reasoning: "Symptoms soon after a meal can point to something eaten." },
      { name: "Indigestion", likelihood: "less_likely", reasoning: "Upper abdominal discomfort can be related to diet or acidity." },
    ],
    missing: ["What was eaten in the last 24 to 48 hours", "Whether fluids can be kept down", "Any blood in vomit or stool"],
    specialty: "Gastroenterology",
  },
  {
    test: /headache|migraine|head pain/,
    explanations: [
      { name: "Tension-type headache", likelihood: "more_likely", reasoning: "A dull, band-like headache is commonly related to stress or posture." },
      { name: "Migraine", likelihood: "possible", reasoning: "Throbbing headache with light sensitivity can fit a migraine pattern." },
      { name: "Dehydration or poor sleep", likelihood: "possible", reasoning: "Headaches are often linked to fluids, sleep and screen time." },
    ],
    missing: ["How suddenly the headache started", "Any vision changes, weakness or confusion", "Previous similar headaches"],
    specialty: "Neurology",
  },
  {
    test: /rash|itch|hives|skin/,
    explanations: [
      { name: "Allergic skin reaction", likelihood: "more_likely", reasoning: "Itchy rashes commonly follow contact with an allergen or irritant." },
      { name: "Contact dermatitis", likelihood: "possible", reasoning: "Skin that touched soaps, plants or metals can become inflamed." },
      { name: "Viral rash", likelihood: "less_likely", reasoning: "Some viral illnesses cause a widespread rash." },
    ],
    missing: ["Any new foods, soaps, plants or medicines", "Whether the rash is spreading", "Any swelling of the lips or face"],
    specialty: "Dermatology",
  },
  {
    test: /back|joint|muscle|knee|shoulder|sprain|neck/,
    explanations: [
      { name: "Muscle strain", likelihood: "more_likely", reasoning: "Muscle or back pain often follows lifting, exercise or a long period in one position." },
      { name: "Joint overuse", likelihood: "possible", reasoning: "Repeated movement can irritate joints and tendons." },
      { name: "Mechanical back or neck pain", likelihood: "possible", reasoning: "Posture and movement patterns commonly cause this kind of pain." },
    ],
    missing: ["Any injury or fall", "Any numbness, tingling or leg weakness", "What movements make it better or worse"],
    specialty: "Orthopaedics",
  },
];

const GENERIC: Topic = {
  test: /./,
  explanations: [
    { name: "Non-specific symptoms that need clinical evaluation", likelihood: "possible", reasoning: "The information provided is not enough to point to a specific cause." },
  ],
  missing: ["When the symptoms started and how they have changed", "Anything that makes them better or worse", "Other symptoms not yet mentioned"],
  specialty: "General Medicine",
};

/**
 * Deterministic, offline provider for demos and tests. It is NOT AI: the same
 * input always produces the same output, and results are labelled mode "demo"
 * everywhere they are stored or shown.
 */
export class DemoProvider implements AiProvider {
  readonly mode = "demo" as const;
  readonly model = DEMO_MODEL;

  generate(input: AiInput): Promise<unknown> {
    const text = [...input.symptoms.map((s) => s.name), input.description ?? ""]
      .join(" ")
      .toLowerCase();
    const topic = TOPICS.find((t) => t.test.test(text)) ?? GENERIC;
    const anySevere = input.symptoms.some((s) => s.severity === "severe");
    const names = input.symptoms.map((s) => s.name).join(", ");

    const result: AiAssessmentCore = {
      summary: `Demo summary: you reported ${names}. These symptoms have several possible explanations, and a doctor should review them.`,
      possibleExplanations: topic.explanations,
      uncertainty:
        "This is a simulated demo output built from keywords, not a real analysis. Many causes look similar from a text description alone.",
      missingInformation: topic.missing,
      suggestedNextSteps: [
        {
          action: anySevere
            ? "Arrange to be seen by a doctor soon, since at least one symptom is severe."
            : "Have a doctor review these symptoms.",
          timeframe: anySevere ? "within_24_hours" : "within_few_days",
        },
        { action: "Rest, drink fluids and keep track of how the symptoms change.", timeframe: "routine" },
      ],
      whenToSeekUrgentCare: [
        "Trouble breathing or chest pain",
        "Confusion, fainting or severe weakness",
        "Symptoms that quickly get worse",
      ],
      suggestedSpecialty: topic.specialty,
      aiRiskEstimate: anySevere ? "medium" : "low",
    };
    return Promise.resolve(result);
  }
}
