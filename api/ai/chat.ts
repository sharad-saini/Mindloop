export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const message = String(body.message || "");
    const context = body.learningContext || {};
    const weakConcepts = Array.isArray(context.weakConcepts) ? context.weakConcepts : [];
    const lower = message.toLowerCase();
    let reply = "Hello! I am your MindLoop AI Learning Tutor. I track your active recall intervals, cognitive bottlenecks, and concept mastery.";
    let suggestedAction: any;

    if (lower.includes("why") || lower.includes("wrong") || lower.includes("mistake")) {
      reply = "Review your latest attempt by separating the rule from the intuition that led you astray. Compare your answer with the correct principle, identify the assumption that failed, and test the concept with one simpler example.";
    } else if (lower.includes("weak")) {
      if (weakConcepts.length > 0) {
        const weakList = weakConcepts.map((concept: any) => `${concept.title} (${concept.accuracy}% accuracy)`).join(", ");
        reply = `Based on your recent attempts, your identified weak areas are: ${weakList}. Would you like to launch a Concept Repair session on your most critical bottleneck?`;
        suggestedAction = {
          label: `Repair ${weakConcepts[0].title}`,
          actionType: "repair",
          conceptId: weakConcepts[0].id,
        };
      } else {
        reply = "Great news! You currently have no identified weak concepts with low accuracy. Keep reviewing your daily queue to maintain peak retention!";
      }
    } else if (lower.includes("quiz") || lower.includes("test me")) {
      reply = `Here is an active recall check on ${context.currentTopic || "Core Mental Models"}: If two pointers start at opposite ends of a sorted array and their sum is greater than target, which pointer must move and why?`;
    } else {
      reply = `I am tracking your learning journey across "${context.currentCourse || "Computer Science & Systems"}". Current Overall Mastery is ${context.overallMastery ?? 0}%. What would you like to explore or clarify next?`;
    }

    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: message,
          config: {
            systemInstruction: `You are MindLoop's Socratic learning tutor. Use this learner context: ${JSON.stringify(context)}. Give a concise, rigorous answer.`,
          },
        });
        reply = response.text || reply;
      } catch (error) {
        console.warn("Gemini tutor fallback:", error);
      }
    }

    return res.status(200).json({ reply, suggestedAction });
  } catch (error) {
    console.error("AI Chat error:", error);
    return res.status(200).json({
      reply: "I am tracking your learning journey. Keep reviewing your daily queue and ask me about the current topic whenever you are ready.",
    });
  }
}
