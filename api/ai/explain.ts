import { getGeminiClient, sendJson } from "../_lib/gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  const { conceptTitle, trackTitle, userQuestion } = req.body || {};
  const fallback = {
    overview: `In ${conceptTitle || "this concept"}, understanding the core boundary conditions prevents subtle production regressions.`,
    commonPitfall: "Developers often assume default synchronous evaluation or shallow equality checks.",
    coreRule: "Always trace ownership of state and references through the call stack.",
    practicalExample: "Ensure dependencies are explicitly declared and immutable updates create fresh references.",
  };

  try {
    const ai = await getGeminiClient();
    if (!ai) return sendJson(res, 200, fallback);

    const prompt = `You are MindLoop's senior technical mentor. Explain "${conceptTitle}" within "${trackTitle || "Software Engineering"}" for this question: "${userQuestion || "Explain this concept intuitively with common pitfalls and a practical rule of thumb."}".
Return valid JSON with exactly these string fields: overview, commonPitfall, coreRule, practicalExample.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    return sendJson(res, 200, parseJson(response.text, fallback));
  } catch (error) {
    console.error("AI Explain error:", error);
    return sendJson(res, 200, fallback);
  }
}

function parseJson(text: string | undefined, fallback: object) {
  try {
    const normalized = (text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return normalized ? JSON.parse(normalized) : fallback;
  } catch {
    return fallback;
  }
}
