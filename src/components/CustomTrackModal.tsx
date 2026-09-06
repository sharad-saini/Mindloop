import React, { useState } from "react";
import { Sparkles, Bot, Plus, X, BookOpen, Layers } from "lucide-react";
import type { LearningTrack, Concept } from "../types";

interface CustomTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackCreated: (newTrack: LearningTrack) => void;
  authorId: string;
  authorName: string;
}

export const CustomTrackModal: React.FC<CustomTrackModalProps> = ({
  isOpen,
  onClose,
  onTrackCreated,
  authorId,
  authorName,
}) => {
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"frontend" | "systems" | "algorithms" | "cognition" | "custom">("custom");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAiGenerate = async () => {
    if (!topic.trim()) {
      setAiError("Please enter a topic name first.");
      return;
    }
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const res = await fetch("/api/ai/generate-drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, difficulty }),
      });
      if (!res.ok) throw new Error("AI generation failed.");
      const data = await res.json();

      const newConcepts: Concept[] = (data.questions || []).map((q: any, idx: number) => ({
        id: `custom-c-${Date.now()}-${idx}`,
        trackId: `custom-track-${Date.now()}`,
        title: q.text ? q.text.slice(0, 50) + "..." : `${topic} Principle ${idx + 1}`,
        category: topic,
        difficulty: difficulty as any,
        estimatedMinutes: 4,
        summary: data.summary || `Core principles of ${topic}`,
        mentalModelAnchor: q.misconceptionHint || "Master the core operational invariant.",
        commonPitfalls: [q.misconceptionHint || "Assuming linear or default behavior."],
        questions: [
          {
            id: `custom-q-${Date.now()}-${idx}`,
            prompt: q.text || "What is the key takeaway?",
            options: q.options || ["Correct principle", "Common trap", "Subtle misconception", "Syntax error"],
            correctIndex: q.correctIndex ?? 0,
            misconceptionDiagnosis: q.misconceptionHint || "Overlooking internal execution order.",
            counterExample: "Notice the difference in state evaluation.",
            mentalModelRule: q.explanation || "Always verify invariants.",
            explanation: q.explanation || "This is the optimal approach.",
          }
        ]
      }));

      const track: LearningTrack = {
        id: `custom-track-${Date.now()}`,
        title: data.title || topic,
        tagline: `AI-Synthesized active recall drills on ${topic}.`,
        description: description || data.summary || `Specialized track covering key concepts and cognitive pitfalls in ${topic}.`,
        category,
        iconName: "BrainCircuit",
        color: "indigo",
        concepts: newConcepts,
        authorId,
        authorName,
      };

      onTrackCreated(track);
      onClose();
    } catch (err: any) {
      console.error(err);
      setAiError("Could not generate AI curriculum. Creating standard track template instead.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleManualCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    const track: LearningTrack = {
      id: `custom-track-${Date.now()}`,
      title: topic,
      tagline: `Custom micro-learning track on ${topic}.`,
      description: description || `Specialized concepts curated for ${topic}.`,
      category,
      iconName: "BookOpen",
      color: "indigo",
      authorId,
      authorName,
      concepts: [
        {
          id: `concept-${Date.now()}-1`,
          trackId: `custom-track-${Date.now()}`,
          title: `Foundations of ${topic}`,
          category: topic,
          difficulty: "intermediate",
          estimatedMinutes: 4,
          summary: `Key mental model and common cognitive traps when reasoning about ${topic}.`,
          mentalModelAnchor: "Always trace boundaries and state transitions.",
          commonPitfalls: ["Confusing syntax with runtime semantics"],
          questions: [
            {
              id: `q-${Date.now()}-1`,
              prompt: `What is the most crucial invariant when designing for ${topic}?`,
              options: [
                "Maintaining isolated state boundaries and deterministic updates",
                "Assuming network requests never fail",
                "Allowing direct reference mutations",
                "Skipping automated testing"
              ],
              correctIndex: 0,
              misconceptionDiagnosis: "Assuming isolated boundaries don't matter in small systems.",
              counterExample: "Shared global mutable state makes debugging exponentially harder.",
              mentalModelRule: "Boundaries prevent cascading failures.",
              explanation: "Clear state boundaries keep components modular and predictable."
            }
          ]
        }
      ]
    };

    onTrackCreated(track);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Create Learning Track</h3>
            <p className="text-xs text-slate-400">Curate custom concepts or let Gemini AI generate them.</p>
          </div>
        </div>

        {aiError && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
            {aiError}
          </div>
        )}

        <form onSubmit={handleManualCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Topic or Skill Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rust Memory Model, GraphQL Federation, SQL Indexing"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of what this curriculum focuses on..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Domain Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="custom">General</option>
                <option value="frontend">Frontend</option>
                <option value="systems">Systems</option>
                <option value="algorithms">Algorithms</option>
                <option value="cognition">Cognition</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              id="btn-ai-generate-track"
              onClick={handleAiGenerate}
              disabled={isGeneratingAi || !topic.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 transition-colors disabled:opacity-50"
            >
              <Bot className={`w-4 h-4 ${isGeneratingAi ? "animate-spin" : "text-indigo-400"}`} />
              <span>{isGeneratingAi ? "Synthesizing with Gemini..." : "Generate with Gemini AI"}</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Create Track
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
