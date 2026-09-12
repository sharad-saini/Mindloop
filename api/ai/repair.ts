function fallbackRepair(input: any) {
  const conceptTitle = input.conceptTitle || "Core Concept";
  return {
    diagnosis: `You chose "${input.userAnswer || "an incorrect answer"}", while the correct principle is "${input.correctAnswer || "the stated rule"}".`,
    rootMisconception: `A common mental trap in "${conceptTitle}" is relying on intuitive behavior instead of tracing the underlying state or execution mechanics.`,
    mentalModelMetaphor: "A render is like a photograph: the function keeps the values captured in that frame until a new render creates a new photograph.",
    counterExample: "If a callback reads state from an older render, repeated calls can use the same stale value instead of the latest update.",
    quickCheckQuestion: "Which approach avoids this trap?",
    options: ["Relying on the captured snapshot from the initial render", "Using a functional state updater or ref that reads the current live value", "Executing code synchronously in the render body", "Clearing the browser cache"],
    correctIndex: 1,
    explanation: "Functional updaters receive the latest committed state rather than closing over a stale snapshot.",
    difficulty: input.difficulty || "medium",
    stepByStepGuide: ["Identify the value captured when the callback was created.", "Trace whether the update depends on the latest committed state.", "Use a functional update or explicit mutable bridge when it does."],
  };
}

function parseJson(text: string | undefined, fallback: any) {
  try {
    const normalized = (text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return normalized ? JSON.parse(normalized) : fallback;
  } catch {
    return fallback;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    let input: any = {};
    try {
      input = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    } catch {
      input = {};
    }
    const fallback = fallbackRepair(input);
    if (!process.env.GEMINI_API_KEY) return res.status(200).json(fallback);

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Diagnose this learning mistake and return JSON with diagnosis, rootMisconception, mentalModelMetaphor, counterExample, quickCheckQuestion, options (4 strings), correctIndex, explanation, difficulty, and stepByStepGuide (3 strings). Concept: ${input.conceptTitle || "Core Concept"}. Question: ${input.questionText || "Not provided"}. Student answer: ${input.userAnswer || "Not provided"}. Correct answer: ${input.correctAnswer || "Not provided"}.`,
        config: { responseMimeType: "application/json" },
      });
      return res.status(200).json(parseJson(response.text, fallback));
    } catch (error) {
      console.warn("Gemini repair fallback:", error);
      return res.status(200).json(fallback);
    }
  } catch (error) {
    console.error("AI Repair error:", error);
    return res.status(200).json(fallbackRepair({}));
  }
}
