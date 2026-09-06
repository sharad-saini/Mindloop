import React, { useState } from "react";
import { 
  BookOpen, 
  Code2, 
  Network, 
  Binary, 
  BrainCircuit, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Plus, 
  Search,
  Bot,
  Layers
} from "lucide-react";
import type { LearningTrack, Concept, SpacedRepetitionProgress } from "../types";
import { ConceptState } from "../types";
import { computeConceptLearningState } from "../lib/learningService";
import { KnowledgeMap } from "./KnowledgeMap";

interface TracksViewProps {
  tracks: LearningTrack[];
  progressMap: Record<string, SpacedRepetitionProgress>;
  onStartConceptPractice: (concept: Concept, track: LearningTrack) => void;
  onOpenConceptRepair: (concept: Concept, track: LearningTrack) => void;
  onCreateCustomTrack: () => void;
  onAskAiExplain: (concept: Concept, track: LearningTrack) => void;
  onRepair?: (concept: Concept, track: LearningTrack) => void;
}

export const TracksView: React.FC<TracksViewProps> = ({
  tracks,
  progressMap,
  onStartConceptPractice,
  onOpenConceptRepair,
  onCreateCustomTrack,
  onAskAiExplain,
  onRepair,
}) => {
  const [viewMode, setViewMode] = useState<"modules" | "map">("modules");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(tracks[0]?.id || null);

  const handleRepair = onRepair || onOpenConceptRepair;

  const categories = [
    { id: "all", label: "All Tracks" },
    { id: "frontend", label: "Frontend & React" },
    { id: "systems", label: "Distributed Systems" },
    { id: "algorithms", label: "Algorithms" },
    { id: "cognition", label: "Mental Models" },
  ];

  const filteredTracks = tracks.filter(t => {
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.concepts.some(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getTrackMastery = (track: LearningTrack) => {
    if (track.concepts.length === 0) return 0;
    let totalScore = 0;
    track.concepts.forEach(c => {
      const p = progressMap[c.id];
      if (p) {
        totalScore += (p.masteryLevel / 5) * 100;
      }
    });
    return Math.round(totalScore / track.concepts.length);
  };

  const getTrackIcon = (iconName: string) => {
    switch (iconName) {
      case "Code2": return <Code2 className="w-5 h-5 text-blue-400" />;
      case "Network": return <Network className="w-5 h-5 text-emerald-400" />;
      case "Binary": return <Binary className="w-5 h-5 text-purple-400" />;
      case "BrainCircuit": return <BrainCircuit className="w-5 h-5 text-amber-400" />;
      default: return <BookOpen className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Curriculum & Knowledge Map
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Targeted micro-learning modules and interactive concept topology.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode("modules")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === "modules"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Modules</span>
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === "map"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Knowledge Map</span>
            </button>
          </div>

          <button
            id="btn-create-track-action"
            onClick={onCreateCustomTrack}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Track</span>
          </button>
        </div>
      </div>

      {viewMode === "map" ? (
        <KnowledgeMap
          tracks={tracks}
          progressMap={progressMap}
          onRepair={handleRepair}
          onStartPractice={onStartConceptPractice}
          onAskAiExplain={onAskAiExplain}
        />
      ) : (
        <>
          {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search concepts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tracks Grid & Details */}
      <div className="space-y-4">
        {filteredTracks.map(track => {
          const mastery = getTrackMastery(track);
          const isExpanded = expandedTrackId === track.id;

          return (
            <div
              key={track.id}
              className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden transition-all shadow-md hover:border-slate-700/80"
            >
              {/* Track Header Card */}
              <div
                onClick={() => setExpandedTrackId(isExpanded ? null : track.id)}
                className="p-5 sm:p-6 cursor-pointer hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    {getTrackIcon(track.iconName)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {track.title}
                      </h2>
                      {track.authorName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          by {track.authorName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                      {track.description}
                    </p>
                  </div>
                </div>

                {/* Progress Ring & Concepts count */}
                <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">
                      {track.concepts.length} concepts
                    </div>
                    <div className="text-sm font-bold text-indigo-400">
                      {mastery}% Mastered
                    </div>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono text-slate-300">
                    {mastery}%
                  </div>

                  <ChevronRight 
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`} 
                  />
                </div>
              </div>

              {/* Concepts Accordion Content */}
              {isExpanded && (
                <div className="border-t border-slate-800/80 bg-slate-950/40 p-4 sm:p-6 space-y-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Micro-Concepts in this Track
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {track.concepts.map(concept => {
                      const progress = progressMap[concept.id];
                      const conceptState = computeConceptLearningState(progress);
                      const isMastered = conceptState === ConceptState.MASTERED;
                      const isStable = conceptState === ConceptState.STABLE;
                      const isImproving = conceptState === ConceptState.IMPROVING;
                      const needsRepair = conceptState === ConceptState.WEAK || conceptState === ConceptState.REPAIRING;
                      const isLearning = conceptState === ConceptState.LEARNING;

                      return (
                        <div
                          key={concept.id}
                          className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-slate-700 transition-colors"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                                {concept.category}
                              </span>

                              {needsRepair ? (
                                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold animate-pulse">
                                  <AlertCircle className="w-3 h-3" /> Needs Repair
                                </span>
                              ) : isMastered ? (
                                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                                  <CheckCircle className="w-3 h-3" /> Mastered
                                </span>
                              ) : isStable ? (
                                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold">
                                  <CheckCircle className="w-3 h-3" /> Stable (Lv {progress?.masteryLevel})
                                </span>
                              ) : isImproving ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium">
                                  Improving
                                </span>
                              ) : isLearning ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-medium">
                                  Learning (Lv {progress?.masteryLevel})
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                  Ready to Learn
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-white leading-snug">
                              {concept.title}
                            </h4>

                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {concept.summary}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                            <button
                              onClick={() => onAskAiExplain(concept, track)}
                              className="flex items-center gap-1 text-slate-400 hover:text-indigo-300 transition-colors"
                              title="Ask Gemini AI for mental models & pitfalls"
                            >
                              <Bot className="w-3.5 h-3.5" />
                              <span>AI Deep-Dive</span>
                            </button>

                            <div className="flex items-center gap-2">
                              {needsRepair && (
                                <button
                                  onClick={() => onOpenConceptRepair(concept, track)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-medium text-xs transition-colors"
                                >
                                  Repair
                                </button>
                              )}

                              <button
                                onClick={() => onStartConceptPractice(concept, track)}
                                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm"
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
                </div>
              )}
            </div>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
};
