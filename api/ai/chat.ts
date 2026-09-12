import { getGeminiClient, sendJson } from "../_lib/gemini";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  try {
    const { message, learningContext, chatHistory } = req.body || {};
    const ai = await getGeminiClient();
    const weakConcepts = Array.isArray(learningContext?.weakConcepts) ? learningContext.weakConcepts : [];
    const weakList = weakConcepts.length > 0
      ? weakConcepts.map((concept: any) => `${concept.title} (${concept.accuracy}% accuracy)`).join(", ")
      : "None detected yet (steady performance)";
    const recentAttempts = Array.isArray(learningContext?.recentAttempts) ? learningContext.recentAttempts : [];
    const recentMistakes = recentAttempts.length > 0
      ? recentAttempts.filter((attempt: any) => !attempt.isCorrect).slice(-3).map((attempt: any) =>
        `Question: "${attempt.question}", Student answered: "${attempt.selectedAnswer}", Correct: "${attempt.correctAnswer}"`
      ).join("\n")
      : "No recent incorrect answers recorded";

    if (!ai) {
      const lower = String(message || "").toLowerCase();
      let reply = "Hello! I am your MindLoop AI Learning Tutor. I track your active recall intervals, cognitive bottlenecks, and concept mastery.";
      let suggestedAction: any;

      if (lower.includes("weak") || lower.includes("mistake")) {
        reply = weakConcepts.length
          ? `Based on your recent attempts, your identified weak areas are: ${weakList}. Would you like to launch a Concept Repair session on your most critical bottleneck?`
          : "Great news! You currently have no identified weak concepts with low accuracy. Keep reviewing your daily queue to maintain peak retention!";
        if (weakConcepts.length) {
          suggestedAction = {
            label: `Repair ${weakConcepts[0].title}`,
            actionType: "repair",
            conceptId: weakConcepts[0].id,
          };
        }
      } else if (lower.includes("why") || lower.includes("wrong")) {
        reply = `Reviewing your recent attempts:\n${recentMistakes}\n\nThe core reason this happens is typically a confusion between the declared interface and the runtime lifecycle. Would you like me to walk through a guided example?`;
      } else if (lower.includes("quiz") || lower.includes("test me")) {
        reply = `Here is an active recall check on ${learningContext?.currentTopic || "Core Mental Models"}:\n\nIf two pointers start at opposite ends of a sorted array and their sum is greater than target, which pointer must move and why?\n\nTake your time and reply with your reasoning!`;
      } else {
        reply = `I am tracking your learning journey across "${learningContext?.currentCourse || "Computer Science & Systems"}". Current Overall Mastery is ${learningContext?.overallMastery ?? 0}%. What would you like to explore or clarify next?`;
      }
      return sendJson(res, 200, { reply, suggestedAction });
    }

    const systemInstruction = `You are MindLoop's AI Learning Tutor and Cognitive Guide.
You practice the Socratic Method:
- Guide the learner to understanding with clear explanations, intuitive mental models, and thought-provoking guided questions.
- NEVER invent or hallucinate fake user statistics! Use the exact context provided.
- If user asks "What am I weak at?", accurately reflect their weak concepts: ${weakList}.
- If user asks "Why did I get this wrong?", refer to these recent mistakes:\n${recentMistakes}
- Keep responses concise, rigorous, and engineering-focused.

Current Learner Context:
- Course: ${learningContext?.currentCourse || "Computer Science"}
- Topic: ${learningContext?.currentTopic || "General"}
- Overall Mastery: ${learningContext?.overallMastery ?? 0}%
- Current Streak: ${learningContext?.currentStreak ?? 1} days
- Weak Concepts: ${weakList}`;
    const formattedHistory = Array.isArray(chatHistory)
      ? chatHistory.map((msg: any) => `${msg.role === "user" ? "Learner" : "Tutor"}: ${msg.text}`).join("\n")
      : "";
    const userPrompt = `${formattedHistory ? `Previous Conversation:\n${formattedHistory}\n\n` : ""}Learner asks: ${message}`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: { systemInstruction },
    });

    return sendJson(res, 200, {
      reply: response.text || "I am here to guide your active learning. What concept would you like to explore?",
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return sendJson(res, 500, { reply: "I am temporarily experiencing a connection hiccup with the AI model." });
  }
}
