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

  try {
    const ai = await getGeminiClient();
    if (!ai) {
      return sendJson(res, 200, {
        diagnosis: `You chose "${userAnswer}", whereas the correct principle is "${correctAnswer}".`,
        rootMisconception: `A common mental trap in "${conceptTitle}" is assuming intuitive linear behavior rather than the underlying state or execution mechanics.`,
        mentalModelMetaphor: "Think of this like a snapshot in photography: what you captured at shutter click stays in that frame even if the subject moves afterwards.",
        counterExample: "If we update state immediately after reading it in the same closure, the current execution frame still references the stale value.",
        quickCheckQuestion: "Which approach avoids this trap?",
        options: [
          "Relying on the captured snapshot from the initial render",
          "Using a functional state updater or ref that reads the current live value",
          "Executing code synchronously in the render body",
          "Clearing the browser cache",
        ],
        correctIndex: 1,
        explanation: "Functional updaters pass the latest committed state rather than closing over a stale snapshot.",
        difficulty: difficulty || "medium",
      });
    }

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
    return sendJson(res, 200, JSON.parse(response.text?.trim() || "{}"));
  } catch (error) {
    console.error("AI Repair error:", error);
    return sendJson(res, 500, { error: "Failed to generate AI concept repair." });
  }
}
