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

// AI Concept Repair Endpoint: Diagnoses why a learner made a mistake and creates a personalized multi-stage repair drill
app.post("/api/ai/repair", async (req, res) => {
  try {
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
      lastAttemptedTime
    } = req.body;

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
        explanation: "Functional updaters pass the latest committed state rather than closing over a stale snapshot.",
        difficulty: difficulty || "medium",
        stepByStepGuide: [
          "1. Identify where state or pointer position is first read.",
          "2. Check if a mutation occurs within the current frame.",
          "3. Use immutable or functional transitions to guarantee freshest state access."
        ],
        secondaryQuestion: {
          question: `In an iterative algorithm for ${conceptTitle}, what guard prevents infinite loops?`,
          options: [
            "Strict monotonicity of the pointer or counter progression",
            "Randomizing indices on every step",
            "Increasing recursion depth infinitely",
            "Skipping boundary condition checks"
          ],
          correctIndex: 0,
          difficulty: "hard",
          explanation: "Monotonically moving the pointer towards the opposite boundary guarantees guaranteed termination."
        }
      });
    }

    const prompt = `You are MindLoop's Concept Repair Engine.
A student just got a question wrong. Construct a highly personalized active Concept Repair remediation lesson based on their specific mistake and learning history.

Concept: ${conceptTitle || "Core Concept"}
Context / Topic: ${context || "Technical Concept"}
Question: ${questionText}
Student's Chosen Wrong Answer: ${userAnswer}
Correct Answer: ${correctAnswer}
Current Difficulty: ${difficulty || "Medium"}
Recent Concept Accuracy: ${recentAccuracy !== undefined ? recentAccuracy + "%" : "Unrecorded"}
Attempts Count: ${attemptsCount || 1}
Repeated Mistakes: ${repeatedMistakes ? "Yes, multiple misses on this topic" : "First recent miss"}
Last Attempted Time: ${lastAttemptedTime || "Just now"}

Your tasks:
1. Pinpoint the EXACT cognitive reasoning flaw that led to selecting "${userAnswer}".
2. Explain the root misconception clearly.
3. Provide a vivid, memorable mental model metaphor that makes the mechanism click instantly.
4. Provide a concrete counter-example showing why the misconception breaks down in practice.
5. Create a new targeted micro-check question (easy/medium) to test if the mental model was repaired.
6. Provide a step-by-step mental checklist (3 steps) for how to think about this in the future.
7. Provide a secondary follow-up question (medium/hard) for progressive mastery.

Return a valid JSON object strictly matching this schema:
{
  "diagnosis": "1-2 sentences pinpointing the exact reasoning flaw",
  "rootMisconception": "Underlying false assumption or mental model glitch",
  "mentalModelMetaphor": "Relatable metaphor that makes the correct mechanism click",
  "counterExample": "Concrete counter-example showing failure in practice",
  "quickCheckQuestion": "A new targeted micro-question testing the repaired concept",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "Clear explanation of why the correct option is true",
  "difficulty": "easy",
  "stepByStepGuide": ["Step 1", "Step 2", "Step 3"],
  "secondaryQuestion": {
    "question": "A slightly harder targeted question testing application",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctIndex": 0,
    "difficulty": "medium",
    "explanation": "Why this option solves the edge-case"
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
        explanation: "Functions execute when invoked, accessing the scope available to them.",
        difficulty: "medium",
        stepByStepGuide: [
          "1. Trace the point of invocation.",
          "2. Verify variable values inside the active scope.",
          "3. Test edge cases against null or zero length boundaries."
        ]
      }
    });
  }
});

// AI Learning Chatbot / Tutor Endpoint
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, learningContext, chatHistory } = req.body;
    const ai = getGeminiClient();

    const weakList = learningContext?.weakConcepts && learningContext.weakConcepts.length > 0
      ? learningContext.weakConcepts.map((w: any) => `${w.title} (${w.accuracy}% accuracy)`).join(", ")
      : "None detected yet (steady performance)";

    const recentMistakes = learningContext?.recentAttempts && learningContext.recentAttempts.length > 0
      ? learningContext.recentAttempts
          .filter((a: any) => !a.isCorrect)
          .slice(-3)
          .map((a: any) => `Question: "${a.question}", Student answered: "${a.selectedAnswer}", Correct: "${a.correctAnswer}"`)
          .join("\n")
      : "No recent incorrect answers recorded";

    if (!ai) {
      // Deterministic Socratic fallback
      const lower = (message || "").toLowerCase();
      let reply = "Hello! I am your MindLoop AI Learning Tutor. I track your active recall intervals, cognitive bottlenecks, and concept mastery.";
      let suggestedAction: any = undefined;

      if (lower.includes("weak") || lower.includes("mistake")) {
        reply = learningContext?.weakConcepts?.length
          ? `Based on your recent attempts, your identified weak areas are: ${weakList}. Would you like to launch a Concept Repair session on your most critical bottleneck?`
          : "Great news! You currently have no identified weak concepts with low accuracy. Keep reviewing your daily queue to maintain peak retention!";
        if (learningContext?.weakConcepts?.length) {
          suggestedAction = {
            label: `Repair ${learningContext.weakConcepts[0].title}`,
            actionType: "repair",
            conceptId: learningContext.weakConcepts[0].id
          };
        }
      } else if (lower.includes("why") || lower.includes("wrong")) {
        reply = `Reviewing your recent attempts:\n${recentMistakes}\n\nThe core reason this happens is typically a confusion between the declared interface and the runtime lifecycle. Would you like me to walk through a guided example?`;
      } else if (lower.includes("quiz") || lower.includes("test me")) {
        reply = `Here is an active recall check on ${learningContext?.currentTopic || 'Core Mental Models'}:\n\nIf two pointers start at opposite ends of a sorted array and their sum is greater than target, which pointer must move and why?\n\nTake your time and reply with your reasoning!`;
      } else {
        reply = `I am tracking your learning journey across "${learningContext?.currentCourse || 'Computer Science & Systems'}". Current Overall Mastery is ${learningContext?.overallMastery ?? 0}%. What would you like to explore or clarify next?`;
      }

      return res.json({ reply, suggestedAction });
    }

    const systemInstruction = `You are MindLoop's AI Learning Tutor and Cognitive Guide.
You practice the Socratic Method:
- Guide the learner to understanding with clear explanations, intuitive mental models, and thought-provoking guided questions.
- NEVER invent or hallucinate fake user statistics! Use the exact context provided.
- If user asks "What am I weak at?", accurately reflect their weak concepts: ${weakList}. If none, praise their consistency and recommend practicing unstarted topics.
- If user asks "Why did I get this wrong?", refer to their actual recent mistakes:
${recentMistakes}
- If user asks for an explanation, break it down intuitively, provide a concrete real-world metaphor, and conclude with a quick check question.
- Keep tone encouraging, rigorous, and engineering-focused.

Current Learner Context:
- Course: ${learningContext?.currentCourse || "Computer Science"}
- Module / Topic: ${learningContext?.currentTopic || "General"}
- Overall Mastery: ${learningContext?.overallMastery ?? 0}%
- Current Streak: ${learningContext?.currentStreak ?? 1} days
- Weak Concepts: ${weakList}
- Recent Mistakes: ${recentMistakes}

Format response in clean Markdown. At the end, if a specific action (like repairing a weak topic or starting practice) is relevant, suggest it naturally.`;

    const formattedHistory = Array.isArray(chatHistory)
      ? chatHistory.map((msg: any) => `${msg.role === 'user' ? 'Learner' : 'Tutor'}: ${msg.text}`).join("\n")
      : "";

    const userPrompt = `${formattedHistory ? "Previous Conversation:\n" + formattedHistory + "\n\n" : ""}Learner asks: ${message}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
      },
    });

    const reply = response.text || "I am here to guide your active learning. What concept would you like to explore?";
    
    // Check if a suggested action fits
    let suggestedAction: any = undefined;
    if (learningContext?.weakConcepts && learningContext.weakConcepts.length > 0) {
      suggestedAction = {
        label: `Repair ${learningContext.weakConcepts[0].title}`,
        actionType: "repair",
        conceptId: learningContext.weakConcepts[0].id
      };
    }

    return res.json({ reply, suggestedAction });
  } catch (error) {
    console.error("AI Chat error:", error);
    return res.status(500).json({
      reply: "I am temporarily experiencing a connection hiccup with the AI model. Let's focus on your active practice cards while the connection recovers!"
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
      model: "gemini-2.5-flash",
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
      model: "gemini-2.5-flash",
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
