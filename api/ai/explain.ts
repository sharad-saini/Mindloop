export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    let input: any = {};
    try {
      input = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    } catch {
      input = {};
    }
    const fallback = fallbackExplain(input.conceptTitle || "this concept");
    if (!process.env.GEMINI_API_KEY) return res.status(200).json(fallback);

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Explain ${input.conceptTitle || "this concept"} in ${input.trackTitle || "Software Engineering"}. Return JSON with overview, commonPitfall, coreRule, and practicalExample. User question: ${input.userQuestion || "Give an intuitive explanation."}`,
        config: { responseMimeType: "application/json" },
      });
      return res.status(200).json(parseJson(response.text, fallback));
    } catch (error) {
      console.warn("Gemini explanation fallback:", error);
      return res.status(200).json(fallback);
    }
  } catch (error) {
    console.error("AI Explain error:", error);
    return res.status(200).json(fallbackExplain("this concept"));
  }
}

function fallbackExplain(conceptTitle: string) {
  return {
    overview: `In ${conceptTitle || "this concept"}, understanding the core boundary conditions prevents subtle production regressions.`,
    commonPitfall: "Developers often assume default synchronous evaluation or shallow equality checks.",
    coreRule: "Always trace ownership of state and references through the call stack.",
    practicalExample: "Ensure dependencies are explicit and immutable updates create fresh references.",
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
