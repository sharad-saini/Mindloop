import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, ArrowRight, Sparkles, X, Layers } from "lucide-react";
import type { Concept, LearningTrack } from "../types";

interface NextModuleUnlockBannerProps {
  isVisible: boolean;
  completedConceptTitle?: string;
  nextConcept?: { concept: Concept; track: LearningTrack } | null;
  onContinue: (concept: Concept, track: LearningTrack) => void;
  onDismiss: () => void;
}

export const NextModuleUnlockBanner: React.FC<NextModuleUnlockBannerProps> = ({
  isVisible,
  completedConceptTitle,
  nextConcept,
  onContinue,
  onDismiss,
}) => {
  return (
    <AnimatePresence>
      {isVisible && nextConcept && (
        <motion.div
          id="next-module-unlock-banner"
          initial={{ y: 80, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xl"
        >
          {/* Ambient RGB lighting blur glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 rounded-3xl blur-md opacity-75 animate-pulse" />

          {/* Banner Container */}
          <div className="relative bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Module Conquered
                  </span>
                  {completedConceptTitle && (
                    <span className="text-xs text-slate-400 truncate hidden sm:inline">
                      {completedConceptTitle}
                    </span>
                  )}
                </div>

                <h4 className="text-sm sm:text-base font-bold text-white mt-0.5 truncate flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Next: {nextConcept.concept.title}</span>
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-next-module-continue"
                onClick={() => onContinue(nextConcept.concept, nextConcept.track)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onDismiss}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
