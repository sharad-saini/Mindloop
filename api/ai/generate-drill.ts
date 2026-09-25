import { getGeminiClient, sendJson } from "../_lib/gemini";

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  const { topic, difficulty } = req.body || {};
  const fallback = fallbackDrill(topic, difficulty);

  try {
    const ai = await getGeminiClient();
    if (!ai) return sendJson(res, 200, fallback);

    const prompt = `You are MindLoop's Curriculum Architect. Generate a high-yield micro-learning drill on "${topic}" at "${difficulty || "Intermediate"}" difficulty. Return valid JSON with title, summary, and questions. Include 3 questions, each with id, text, options (4 strings), correctIndex, misconceptionHint, and explanation.`;

    let responseText = "";

    // SDK Compatibility Check
    if (ai.getGenerativeModel) {
      const model = ai.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    } else if (ai.models?.generateContent) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      responseText = response.text || "";
    }

    return sendJson(res, 200, parseJson(responseText, fallback));
  } catch (error) {
    console.error("AI Drill generator error:", error);
    return sendJson(res, 200, fallback);
  }
}

function fallbackDrill(topic: string | undefined, difficulty: string | undefined) {
  return {
    title: topic || "Custom Concept",
    summary: `Essential principles and active recall drills for ${topic || "the selected subject"}.`,
    questions: [{
      id: "q-sample-1",
      text: `What is the primary architectural benefit of isolating state in ${topic || "this system"}?`,
      options: [
        "Minimizing unintended side-effects and ensuring predictable updates",
        "Maximizing global variable sharing across all modules",
        "Eliminating the need for unit testing",
        "Bypassing network bandwidth constraints",
      ],
      correctIndex: 0,
      misconceptionHint: "Think about how mutable global state introduces hidden coupling between components.",
      explanation: "Isolated state boundaries make state mutations deterministic and easily testable.",
      difficulty: difficulty || "intermediate",
    }],
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