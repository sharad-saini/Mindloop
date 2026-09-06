import React, { useState, useEffect } from "react";
import { 
  BrainCircuit, 
  AlertTriangle, 
  BookmarkCheck, 
  Sparkles, 
  Bot, 
  ArrowRight, 
  BookOpen, 
  RefreshCw, 
  Lightbulb, 
  Search 
} from "lucide-react";
import type { Concept, LearningTrack, ConceptRepairRecord, SpacedRepetitionProgress } from "../types";
import { AdaptiveConceptRepairLoop } from "./AdaptiveConceptRepairLoop";

interface ConceptRepairLabViewProps {
  repairRecords: ConceptRepairRecord[];
  allTracks: LearningTrack[];
  progressMap: Record<string, SpacedRepetitionProgress>;
  targetedConcept?: { concept: Concept; track: LearningTrack } | null;
  onClearTargetedConcept?: () => void;
  onRepairCompleted: (
    conceptId: string, 
    trackId: string, 
    conceptTitle: string, 
    misconception: string, 
    keyInsight: string, 
    score: number
  ) => void;
  onNavigateToTracks: () => void;
}

export const ConceptRepairLabView: React.FC<ConceptRepairLabViewProps> = ({
  repairRecords,
  allTracks,
  progressMap,
  targetedConcept,
  onClearTargetedConcept,
  onRepairCompleted,
  onNavigateToTracks,
}) => {
  const [activeRepairConcept, setActiveRepairConcept] = useState<{ concept: Concept; track: LearningTrack } | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  // Automatically activate the repair loop if user selected targeted repair from the Knowledge Map
  useEffect(() => {
    if (targetedConcept) {
      setActiveRepairConcept(targetedConcept);
    }
  }, [targetedConcept]);

  // Gather concepts that currently have needsRepair = true or targeted
  const conceptsNeedingRepair: { concept: Concept; track: LearningTrack; progress: SpacedRepetitionProgress }[] = [];
  allTracks.forEach(track => {
    track.concepts.forEach(concept => {
      const p = progressMap[concept.id];
      if (p && p.needsRepair) {
        conceptsNeedingRepair.push({ concept, track, progress: p });
      }
    });
  });

  const filteredRecords = repairRecords.filter(r => 
    r.conceptTitle.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.misconception.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.keyInsight.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4 space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Concept Repair Lab
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold">
              Mental Model Vault
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Transform cognitive blind spots into permanent engineering intuition.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="text-rose-400 font-bold">{conceptsNeedingRepair.length}</span> needing repair
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="text-emerald-400 font-bold">{repairRecords.length}</span> models vaulted
          </div>
        </div>
      </div>

      {/* Active Repair Session Modal/Drawer if open */}
      {activeRepairConcept && (
        <div className="space-y-3 bg-slate-950/80 p-4 sm:p-6 rounded-2xl border border-rose-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2">
            <span className="font-semibold text-rose-300">Active Repair in Progress</span>
            <button
              onClick={() => {
                setActiveRepairConcept(null);
                if (onClearTargetedConcept) onClearTargetedConcept();
              }}
              className="hover:text-white transition-colors"
            >
              ✕ Close
            </button>
          </div>
          <AdaptiveConceptRepairLoop
            concept={activeRepairConcept.concept}
            question={activeRepairConcept.concept.questions[0]}
            userAnswer={progressMap[activeRepairConcept.concept.id]?.lastMisconception || "Subtle misconception"}
            correctAnswer={activeRepairConcept.concept.questions[0].options[activeRepairConcept.concept.questions[0].correctIndex]}
            onRepairResolved={(insight, score) => {
              onRepairCompleted(
                activeRepairConcept.concept.id,
                activeRepairConcept.track.id,
                activeRepairConcept.concept.title,
                activeRepairConcept.concept.questions[0].misconceptionDiagnosis,
                insight,
                score
              );
              setActiveRepairConcept(null);
              if (onClearTargetedConcept) onClearTargetedConcept();
            }}
          />
        </div>
      )}

      {/* Flagged Concepts Section (Needs Attention) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Concepts Flagged for Repair
          </h2>
          {conceptsNeedingRepair.length === 0 && (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <BookmarkCheck className="w-3.5 h-3.5" /> All mental models healthy!
            </span>
          )}
        </div>

        {conceptsNeedingRepair.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {conceptsNeedingRepair.map(({ concept, track }) => (
              <div
                key={concept.id}
                className="bg-slate-900/50 border border-rose-500/30 rounded-3xl p-5 flex flex-col justify-between gap-3 hover:border-rose-500/60 transition-colors shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>{track.title}</span>
                    <span className="text-rose-400 font-bold uppercase tracking-wider text-[10px]">
                      Glitched
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {concept.title}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {concept.summary}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Takes ~3 mins to repair
                  </span>
                  <button
                    onClick={() => setActiveRepairConcept({ concept, track })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-sm shadow-rose-600/20"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Launch Repair Loop</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center space-y-2">
            <p className="text-sm text-slate-300">
              No broken concepts currently detected in your active queue.
            </p>
            <p className="text-xs text-slate-500">
              When an active recall challenge highlights an incorrect intuition, MindLoop automatically routes the concept here for calibration.
            </p>
          </div>
        )}
      </div>

      {/* Mental Model Vault Section (Repaired History) */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-emerald-400" />
              Vaulted Mental Models ({repairRecords.length})
            </h2>
            <p className="text-xs text-slate-400">
              Your personal library of repaired cognitive traps and durable engineering heuristics.
            </p>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vaulted models..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {filteredRecords.length > 0 ? (
          <div className="space-y-3">
            {filteredRecords.map(record => (
              <div
                key={record.id}
                className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-3 transition-colors hover:border-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <h4 className="text-sm font-bold text-white">
                      {record.conceptTitle}
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(record.repairedAt).toLocaleDateString(undefined, { 
                      month: "short", 
                      day: "numeric", 
                      year: "numeric" 
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-rose-950/20 p-3 rounded-lg border border-rose-900/30">
                    <div className="font-semibold text-rose-400 uppercase tracking-wider text-[10px] mb-1">
                      Initial False Assumption
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {record.misconception}
                    </p>
                  </div>

                  <div className="bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/30">
                    <div className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px] mb-1">
                      Vaulted Key Insight
                    </div>
                    <p className="text-slate-200 leading-relaxed font-medium">
                      "{record.keyInsight}"
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
              <Lightbulb className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-white">
              Vault is waiting for your first repair
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Whenever you work through a concept repair session, your rewired mental model is permanently stamped into this vault.
            </p>
            <button
              onClick={onNavigateToTracks}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <span>Explore Tracks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
