import { getGeminiClient, sendJson } from "../_lib/gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  const {
    conceptTitle,
    questionText,
    userAnswer,
    correctAnswer,
    context,
    difficulty,
    recentAccuracy,
    attemptsCount,
    repeatedMistakes,
    lastAttemptedTime,
  } = req.body || {};
  const fallback = fallbackRepair({ conceptTitle, userAnswer, correctAnswer, difficulty });

  try {
    const ai = await getGeminiClient();
    if (!ai) return sendJson(res, 200, fallback);

    const prompt = `You are MindLoop's Concept Repair Engine. Diagnose a student's mistake and return valid JSON with these fields: diagnosis, rootMisconception, mentalModelMetaphor, counterExample, quickCheckQuestion, options (4 strings), correctIndex (number), explanation, difficulty, stepByStepGuide (3 strings), secondaryQuestion.
Concept: ${conceptTitle || "Core Concept"}
Context: ${context || "Technical Concept"}
Question: ${questionText}
Student answer: ${userAnswer}
Correct answer: ${correctAnswer}
Difficulty: ${difficulty || "medium"}
Recent accuracy: ${recentAccuracy ?? "Unrecorded"}
Attempts: ${attemptsCount || 1}
Repeated mistakes: ${repeatedMistakes ? "Yes" : "No"}
Last attempted: ${lastAttemptedTime || "Just now"}`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return sendJson(res, 200, parseJson(response.text, fallback));
  } catch (error) {
    console.error("AI Repair error:", error);
    return sendJson(res, 200, fallback);
  }
}

function fallbackRepair(input: { conceptTitle?: string; userAnswer?: string; correctAnswer?: string; difficulty?: string }) {
  return {
    diagnosis: `You chose "${input.userAnswer || "an incorrect answer"}", whereas the correct principle is "${input.correctAnswer || "the stated rule"}".`,
    rootMisconception: `A common mental trap in "${input.conceptTitle || "this concept"}" is relying on intuitive behavior instead of tracing the underlying state or execution mechanics.`,
    mentalModelMetaphor: "A render is like a photograph: a function keeps the values captured in that frame until a new render creates a new photograph.",
    counterExample: "If a callback reads state from an older render, repeated calls can use the same stale value instead of the latest update.",
    quickCheckQuestion: "Which approach avoids this trap?",
    options: ["Relying on the captured snapshot", "Using a functional updater or current ref", "Executing code in render", "Clearing the browser cache"],
    correctIndex: 1,
    explanation: "Functional updaters receive the latest committed state rather than closing over a stale snapshot.",
    difficulty: input.difficulty || "medium",
  };
}

function parseJson(text: string | undefined, fallback: object) {
  try {
    const normalized = (text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return normalized ? JSON.parse(normalized) : fallback;
  } catch {
    return fallback;
  }
}
