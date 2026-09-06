import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini API client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// AI Concept Repair Endpoint: Diagnoses why a learner made a mistake and creates a custom repair drill
app.post("/api/ai/repair", async (req, res) => {
  try {
    const { conceptTitle, questionText, userAnswer, correctAnswer, context } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      // Fallback deterministic diagnosis if API key is not configured
      return res.json({
        diagnosis: `You chose "${userAnswer}", whereas the correct principle is "${correctAnswer}".`,
        rootMisconception: `A common mental trap in "${conceptTitle}" is assuming intuitive linear behavior rather than the underlying state or execution mechanics.`,
        mentalModelMetaphor: "Think of this like a snapshot in photography: what you captured at shutter click stays in that frame even if the subject moves afterwards.",
        counterExample: `If we update state immediately after reading it in the same closure, the current execution frame still references the stale value.`,
        quickCheckQuestion: `To ensure you have repaired this model: which approach avoids this trap?`,
        options: [
          "Relying on the captured snapshot from the initial render",
          "Using a functional state updater or ref that reads the current live value",
          "Executing code synchronously in the render body",
          "Clearing the browser cache"
        ],
        correctIndex: 1,
        explanation: "Functional updaters pass the latest committed state rather than closing over a stale snapshot."
      });
    }

    const prompt = `You are MindLoop's Concept Repair Engine.
A student just got a question wrong. Your job is NOT just to say "correct answer is X", but to perform cognitive diagnosis and construct an active Concept Repair micro-lesson.

Concept: ${conceptTitle || "Core Concept"}
Context/Topic: ${context || "Technical Concept"}
Question: ${questionText}
Student's Chosen Wrong Answer: ${userAnswer}
Correct Answer: ${correctAnswer}

Return a valid JSON object strictly matching this schema:
{
  "diagnosis": "1-2 sentences pinpointing the cognitive reasoning flaw that led to selecting the wrong answer",
  "rootMisconception": "Clear statement of the underlying false assumption or mental model glitch",
  "mentalModelMetaphor": "A vivid, relatable real-world metaphor or mental model that makes the correct mechanism click instantly",
  "counterExample": "A short, concrete counter-example showing why the misconception breaks down in practice",
  "quickCheckQuestion": "A new targeted micro-question testing whether the misconception was repaired",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "Clear explanation of why the correct option in this check is true"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text?.trim() || "{}";
    const parsed = JSON.parse(responseText);
    return res.json(parsed);
  } catch (error) {
    console.error("AI Repair error:", error);
    return res.status(500).json({
      error: "Failed to generate AI concept repair.",
      fallback: {
        diagnosis: "The chosen answer overlooked the strict execution boundary.",
        rootMisconception: "Confusing declared syntax with runtime evaluation order.",
        mentalModelMetaphor: "A recipe specifies ingredients, but cooking only happens when heat is applied.",
        counterExample: "Defining a callback does not execute it until invoked.",
        quickCheckQuestion: "When does evaluation take place?",
        options: ["At parse time", "When the function is called", "Never", "During bundle compilation"],
        correctIndex: 1,
        explanation: "Functions execute when invoked, accessing the scope available to them."
      }
    });
  }
});

// AI Explain endpoint: Generates deep intuitive explanation with real-world failure cases
app.post("/api/ai/explain", async (req, res) => {
  try {
    const { conceptTitle, trackTitle, userQuestion } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        overview: `In ${conceptTitle}, understanding the core boundary conditions prevents subtle production regressions.`,
        commonPitfall: "Developers often assume default synchronous evaluation or shallow equality checks.",
        coreRule: "Always trace ownership of state and references through the call stack.",
        practicalExample: "Ensure dependencies are explicitly declared and immutable updates create fresh references."
      });
    }

    const prompt = `You are MindLoop's senior technical mentor.
Provide an intuitive, crystalline explanation of "${conceptTitle}" within the domain "${trackTitle || 'Software Engineering'}".
User's specific inquiry: "${userQuestion || 'Explain this concept intuitively with common pitfalls and a practical rule of thumb.'}"

Return JSON matching:
{
  "overview": "Crisp 2-sentence intuitive definition that avoids jargon",
  "commonPitfall": "The single most common subtle bug or misconception developers experience here",
  "coreRule": "A memorable 1-sentence mental heuristic/rule of thumb to remember forever",
  "practicalExample": "A concrete 3-4 line code or scenario demonstration"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return res.json(parsed);
  } catch (error) {
    console.error("AI Explain error:", error);
    return res.status(500).json({ error: "Failed to generate AI explanation." });
  }
});

// AI Drill Generator: Generates an interactive drill on any custom user topic
app.post("/api/ai/generate-drill", async (req, res) => {
  try {
    const { topic, difficulty } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        title: topic || "Custom Concept",
        summary: `Essential principles and active recall drills for ${topic || 'the selected subject'}.`,
        questions: [
          {
            id: "q-sample-1",
            text: `What is the primary architectural benefit of isolating state in ${topic || 'this system'}?`,
            options: [
              "Minimizing unintended side-effects and ensuring predictable updates",
              "Maximizing global variable sharing across all modules",
              "Eliminating the need for unit testing",
              "Bypassing network bandwidth constraints"
            ],
            correctIndex: 0,
            misconceptionHint: "Think about how mutable global state introduces hidden coupling between components.",
            explanation: "Isolated state boundaries make state mutations deterministic and easily testable."
          }
        ]
      });
    }

    const prompt = `You are MindLoop's Curriculum Architect.
Generate a high-yield micro-learning drill on the topic: "${topic}".
Difficulty level: "${difficulty || 'Intermediate'}".

Create 3 distinct active recall questions designed to test conceptual understanding (not mere trivia).
Each question must target a specific potential misconception.

Return valid JSON:
{
  "title": "Clean concise title for this micro-concept",
  "summary": "2-sentence conceptual summary",
  "questions": [
    {
      "id": "q1",
      "text": "Question statement",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "misconceptionHint": "What false intuition usually leads someone to miss this?",
      "explanation": "Why the correct answer holds true"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return res.json(parsed);
  } catch (error) {
    console.error("AI Drill generator error:", error);
    return res.status(500).json({ error: "Failed to generate drill." });
  }
});

// Vite Middleware integration for dev / static for prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MindLoop server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
