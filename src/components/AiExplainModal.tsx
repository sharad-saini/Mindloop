import React, { useState, useEffect } from "react";
import { Bot, Lightbulb, AlertTriangle, BookmarkCheck, Code, X, Sparkles } from "lucide-react";
import type { Concept, LearningTrack, AIExplainResponse } from "../types";

interface AiExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  concept: Concept | null;
  track: LearningTrack | null;
}

export const AiExplainModal: React.FC<AiExplainModalProps> = ({
  isOpen,
  onClose,
  concept,
  track,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [aiData, setAiData] = useState<AIExplainResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && concept) {
      fetchExplanation();
    }
  }, [isOpen, concept]);

  const fetchExplanation = async () => {
    if (!concept) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptTitle: concept.title,
          trackTitle: track?.title || "Engineering",
          userQuestion: "Explain this concept intuitively with common pitfalls and a practical rule of thumb."
        }),
      });

      if (!res.ok) throw new Error("AI request failed");
      const data = await res.json();
      setAiData(data);
    } catch (e: any) {
      console.error(e);
      // Fallback if network or key
      setAiData({
        overview: concept.summary,
        commonPitfall: concept.commonPitfalls[0] || "Confusing shallow references with deep values.",
        coreRule: concept.mentalModelAnchor,
        practicalExample: "Ensure all dependent state values are explicitly tracked in the appropriate boundaries."
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !concept) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                Gemini AI Deep-Dive
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                {track?.title}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {concept.title}
            </h3>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">
              Gemini AI is analyzing cognitive boundaries & mental models...
            </p>
          </div>
        ) : aiData ? (
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                Intuitive Mechanism
              </div>
              <p className="text-slate-200 leading-relaxed">
                {aiData.overview}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/30 space-y-1.5">
              <div className="text-xs font-semibold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                The Subtle Trap / Failure Mode
              </div>
              <p className="text-slate-300 leading-relaxed text-xs sm:text-sm">
                {aiData.commonPitfall}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30 space-y-1.5">
              <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                Permanent Rule of Thumb
              </div>
              <p className="text-slate-200 font-medium leading-relaxed">
                "{aiData.coreRule}"
              </p>
            </div>

            {aiData.practicalExample && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-xs text-slate-300">
                <div className="text-[10px] text-slate-500 uppercase font-sans mb-1">
                  Practical Scenario
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed">
                  {aiData.practicalExample}
                </pre>
              </div>
            )}
          </div>
        ) : null}

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
