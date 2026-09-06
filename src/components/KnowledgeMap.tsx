import React, { useState } from "react";
import { 
  Network, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  Play, 
  Bot, 
  Search, 
  Sparkles, 
  ArrowRight,
  BrainCircuit,
  Filter,
  TrendingUp
} from "lucide-react";
import type { Concept, LearningTrack, SpacedRepetitionProgress } from "../types";
import { ConceptState } from "../types";
import { computeConceptLearningState } from "../lib/learningService";

export interface KnowledgeMapProps {
  tracks: LearningTrack[];
  progressMap: Record<string, SpacedRepetitionProgress>;
  onRepair: (concept: Concept, track: LearningTrack) => void;
  onStartPractice: (concept: Concept, track: LearningTrack) => void;
  onAskAiExplain: (concept: Concept, track: LearningTrack) => void;
}

export const KnowledgeMap: React.FC<KnowledgeMapProps> = ({
  tracks,
  progressMap,
  onRepair,
  onStartPractice,
  onAskAiExplain,
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Flatten concepts with track reference
  const allConceptItems: { concept: Concept; track: LearningTrack; progress?: SpacedRepetitionProgress }[] = [];
  tracks.forEach(track => {
    track.concepts.forEach(concept => {
      allConceptItems.push({
        concept,
        track,
        progress: progressMap[concept.id],
      });
    });
  });

  const categories = Array.from(new Set(allConceptItems.map(item => item.concept.category)));

  // Filtered concepts
  const filteredConcepts = allConceptItems.filter(item => {
    const matchesTrack = selectedTrackId === "all" || item.track.id === selectedTrackId;
    const matchesCategory = selectedCategory === "all" || item.concept.category === selectedCategory;
    const matchesSearch = searchQuery.trim() === "" ||
      item.concept.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.concept.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.concept.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTrack && matchesCategory && matchesSearch;
  });

  // Aggregates
  const totalConcepts = allConceptItems.length;
  const masteredConcepts = allConceptItems.filter(i => (i.progress?.masteryLevel ?? 0) >= 4).length;
  const repairConcepts = allConceptItems.filter(i => i.progress?.needsRepair).length;
  const inProgressConcepts = allConceptItems.filter(i => i.progress && (i.progress.masteryLevel ?? 0) > 0 && (i.progress.masteryLevel ?? 0) < 4).length;

  return (
    <div id="knowledge-map" className="space-y-6">
      {/* Top Banner & Metrics */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Network className="w-4 h-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Knowledge Dependency Map
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Interactive topological view of algorithmic intuition, data structures, and mental models.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{masteredConcepts} Mastered</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>{inProgressConcepts} Learning</span>
            </div>
            {repairConcepts > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-1.5 font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>{repairConcepts} Needs Repair</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedTrackId("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                selectedTrackId === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              All Courses ({tracks.length})
            </button>
            {tracks.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTrackId(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedTrackId === t.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search concepts or mental models..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Concept Node Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredConcepts.map(({ concept, track, progress }) => {
          const conceptState = computeConceptLearningState(progress);
          const isMastered = conceptState === ConceptState.MASTERED;
          const isStable = conceptState === ConceptState.STABLE;
          const isImproving = conceptState === ConceptState.IMPROVING;
          const needsRepair = conceptState === ConceptState.WEAK || conceptState === ConceptState.REPAIRING;
          const isLearning = conceptState === ConceptState.LEARNING;
          const attempts = progress?.totalAttempts ?? 0;
          const correct = progress?.correctAttempts ?? 0;
          const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : null;

          return (
            <div
              key={concept.id}
              id={`concept-node-${concept.id}`}
              className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all duration-200 border ${
                needsRepair
                  ? "bg-rose-950/20 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/30"
                  : isMastered
                  ? "bg-slate-900/70 border-emerald-500/40 shadow-sm hover:border-emerald-500/60"
                  : isStable
                  ? "bg-slate-900/70 border-teal-500/40 shadow-sm hover:border-teal-500/60"
                  : isImproving
                  ? "bg-slate-900/70 border-amber-500/40 shadow-sm hover:border-amber-500/60"
                  : isLearning
                  ? "bg-slate-900/60 border-indigo-500/40 hover:border-indigo-500/70"
                  : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="space-y-2">
                {/* Node Header */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {concept.category}
                  </span>

                  {needsRepair ? (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse">
                      <AlertTriangle className="w-3 h-3" /> Needs Repair
                    </span>
                  ) : isMastered ? (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Mastered
                    </span>
                  ) : isStable ? (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Stable (Lv {progress?.masteryLevel})
                    </span>
                  ) : isImproving ? (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                      <TrendingUp className="w-3 h-3" /> Improving
                    </span>
                  ) : isLearning ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-medium">
                      Lv {progress?.masteryLevel} Learning
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      Untested
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white leading-snug">
                  {concept.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {concept.summary}
                </p>

                {/* Progress bar */}
                <div className="pt-2 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Intuition Level: {progress?.masteryLevel ?? 0}/5</span>
                    {accuracy !== null && (
                      <span className={needsRepair ? "text-rose-400 font-bold" : "text-slate-300"}>
                        {accuracy}% Accuracy ({correct}/{attempts})
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        needsRepair
                          ? "bg-rose-500"
                          : isMastered
                          ? "bg-emerald-500"
                          : isLearning
                          ? "bg-indigo-500"
                          : "bg-slate-700"
                      }`}
                      style={{ width: `${Math.min(100, ((progress?.masteryLevel ?? 0) / 5) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Node Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onAskAiExplain(concept, track)}
                  className="flex items-center gap-1 text-slate-400 hover:text-indigo-300 transition-colors"
                  title="Ask Gemini for mental model explanation"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">AI Deep Dive</span>
                  <span className="sm:hidden">Explain</span>
                </button>

                <div className="flex items-center gap-2">
                  {needsRepair && (
                    <button
                      type="button"
                      id={`repair-btn-${concept.id}`}
                      onClick={() => onRepair(concept, track)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-sm shadow-rose-600/30"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Repair</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onStartPractice(concept, track)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm shadow-indigo-600/20"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Practice</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredConcepts.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <p className="text-sm text-slate-300">No concepts found matching your filter.</p>
          <p className="text-xs text-slate-500">Try adjusting your search query or track selection.</p>
        </div>
      )}
    </div>
  );
};
