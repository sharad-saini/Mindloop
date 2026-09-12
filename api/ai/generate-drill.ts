function fallbackDrill(topic: string, difficulty: string) {
  return {
    title: topic || "Custom Concept",
    summary: `Essential principles and active recall drills for ${topic || "the selected subject"}.`,
    questions: [{
      id: "q-sample-1",
      text: `What is the primary architectural benefit of isolating state in ${topic || "this system"}?`,
      options: ["Minimizing unintended side-effects and ensuring predictable updates", "Maximizing global variable sharing across all modules", "Eliminating the need for unit testing", "Bypassing network bandwidth constraints"],
      correctIndex: 0,
      misconceptionHint: "Mutable global state introduces hidden coupling between components.",
      explanation: "Isolated state boundaries make state mutations deterministic and testable.",
      difficulty: difficulty || "intermediate",
    }],
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
  const input = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const topic = String(input.topic || "");
  const difficulty = String(input.difficulty || "Intermediate");
  const fallback = fallbackDrill(topic, difficulty);

  try {
    if (!process.env.GEMINI_API_KEY) return res.status(200).json(fallback);

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate 3 active recall questions about ${topic || "the selected subject"} at ${difficulty} difficulty. Return JSON with title, summary, and questions. Each question needs id, text, options (4 strings), correctIndex, misconceptionHint, and explanation.`,
        config: { responseMimeType: "application/json" },
      });
      return res.status(200).json(parseJson(response.text, fallback));
    } catch (error) {
      console.warn("Gemini drill fallback:", error);
      return res.status(200).json(fallback);
    }
  } catch (error) {
    console.error("AI Drill generator error:", error);
    return res.status(200).json(fallback);
  }
}
