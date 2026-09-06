import React, { useState } from "react";
import { 
  AlertTriangle, 
  Lightbulb, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RefreshCw, 
  BookmarkCheck, 
  BrainCircuit,
  Bot
} from "lucide-react";
import type { Concept, Question, AIRepairResponse } from "../types";

interface AdaptiveConceptRepairLoopProps {
  concept: Concept;
  question: Question;
  userAnswer: string;
  correctAnswer: string;
  onRepairResolved: (keyInsight: string, repairScore: number) => void;
  onSkip?: () => void;
  onOpenAiTutor?: (concept: Concept, question: Question, userWrongAnswer: string) => void;
}

export const AdaptiveConceptRepairLoop: React.FC<AdaptiveConceptRepairLoopProps> = ({
  concept,
  question,
  userAnswer,
  correctAnswer,
  onRepairResolved,
  onSkip,
  onOpenAiTutor,
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [selectedCalibrationIndex, setSelectedCalibrationIndex] = useState<number | null>(null);
  const [calibrationSubmitted, setCalibrationSubmitted] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiData, setAiData] = useState<AIRepairResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Request AI-powered diagnosis from server
  const handleRequestAiRepair = async () => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptTitle: concept.title,
          questionText: question.prompt,
          userAnswer,
          correctAnswer,
          context: concept.summary,
        }),
      });
      if (!res.ok) {
        throw new Error("Could not reach AI Repair service.");
      }
      const data = await res.json();
      setAiData(data);
    } catch (err: any) {
      console.error(err);
      setAiError("Unable to fetch AI diagnosis. Using built-in mental model repair.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCalibrationSubmit = () => {
    if (selectedCalibrationIndex === null) return;
    setCalibrationSubmitted(true);
  };

  const isCalibrationCorrect = aiData 
    ? selectedCalibrationIndex === aiData.correctIndex 
    : selectedCalibrationIndex === 0;

  const handleFinalizeRepair = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const insight = aiData?.mentalModelMetaphor || question.mentalModelRule;
    const score = isCalibrationCorrect ? 100 : 75;
    onRepairResolved(insight, score);
  };

  return (
    <div className="bg-slate-900 border-2 border-rose-500/40 rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Visual Accent Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Adaptive Concept Repair Loop
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Cognitive Rewiring
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {concept.title}
            </h3>
          </div>
        </div>

        {/* Multi-step indicator */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveStep(1)}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeStep === 1 
                ? "bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/40" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            1. Diagnosis
          </button>
          <span className="text-slate-600">→</span>
          <button
            onClick={() => setActiveStep(2)}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeStep === 2 
                ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            2. Mental Model
          </button>
          <span className="text-slate-600">→</span>
          <button
            onClick={() => setActiveStep(3)}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeStep === 3 
                ? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            3. Calibration
          </button>
        </div>
      </div>

      {/* Step 1: Cognitive Diagnosis */}
      {activeStep === 1 && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              The Cognitive Trap
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 text-slate-300">
                <span className="text-rose-400 font-bold shrink-0">Your intuition:</span>
                <span className="bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40 text-rose-200">
                  {userAnswer}
                </span>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <span className="text-emerald-400 font-bold shrink-0">Accurate principle:</span>
                <span className="bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 text-emerald-200">
                  {correctAnswer}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/30 text-rose-200 text-sm space-y-2">
            <div className="font-semibold flex items-center gap-2 text-rose-300">
              <BrainCircuit className="w-4 h-4 text-rose-400" />
              Why this mental model glitched:
            </div>
            <p className="leading-relaxed text-slate-300">
              {aiData?.diagnosis || question.misconceptionDiagnosis}
            </p>
          </div>

          {/* AI Mentor Assistant Trigger */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                id="btn-ai-deep-diagnosis"
                onClick={handleRequestAiRepair}
                disabled={isAiLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 transition-all"
              >
                <Bot className={`w-4 h-4 ${isAiLoading ? "animate-spin" : "text-indigo-400"}`} />
                <span>{isAiLoading ? "Synthesizing AI Diagnosis..." : "Get Deep Gemini AI Diagnosis"}</span>
              </button>

              {onOpenAiTutor && (
                <button
                  type="button"
                  onClick={() => onOpenAiTutor(concept, question, userAnswer)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-950/70 hover:bg-purple-900 border border-purple-700/70 text-purple-300 transition-all"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Ask AI Tutor</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setActiveStep(2)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors ml-auto shadow-md"
            >
              <span>Explore Mental Model Fix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Mental Model Anchor & Counter-Example */}
      {activeStep === 2 && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-700/40 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Mental Model Metaphor
            </div>
            <p className="text-slate-200 text-sm sm:text-base leading-relaxed font-medium">
              "{aiData?.mentalModelMetaphor || concept.mentalModelAnchor}"
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Concrete Counter-Example
            </div>
            <p className="text-sm text-slate-300 leading-relaxed font-mono bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              {aiData?.counterExample || question.counterExample}
            </p>
          </div>

          {aiData?.stepByStepGuide && aiData.stepByStepGuide.length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 space-y-2">
              <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                Step-by-Step Thinking Rubric
              </div>
              <div className="space-y-1.5 text-xs text-slate-200">
                {aiData.stepByStepGuide.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-200 flex items-start gap-2">
            <BookmarkCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-300">Permanent Heuristic: </span>
              <span>{aiData?.rootMisconception || question.mentalModelRule}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setActiveStep(1)}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              ← Back to Diagnosis
            </button>
            <button
              onClick={() => setActiveStep(3)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-md"
            >
              <span>Test Calibration Check</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Interactive Calibration Micro-Drill */}
      {activeStep === 3 && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Calibration Verification Check
              </span>
              <span className="text-[11px] text-slate-400">Rewire Verification</span>
            </div>

            <p className="text-sm font-medium text-slate-200">
              {aiData?.quickCheckQuestion || "Which architectural principle prevents this exact breakdown from recurring in production?"}
            </p>

            {/* Micro options */}
            <div className="space-y-2 pt-1">
              {(aiData?.options || [
                question.mentalModelRule,
                "Relying on implicit global variable sharing across all module boundaries",
                "Calling setState synchronously inside while loops",
                "Assuming network messages are never dropped or reordered"
              ]).map((opt, idx) => {
                const isSelected = selectedCalibrationIndex === idx;
                let optionStyle = "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600";
                
                if (calibrationSubmitted) {
                  const isCorrect = aiData ? idx === aiData.correctIndex : idx === 0;
                  if (isCorrect) {
                    optionStyle = "bg-emerald-950/60 border-emerald-500 text-emerald-200 font-semibold";
                  } else if (isSelected) {
                    optionStyle = "bg-rose-950/60 border-rose-500 text-rose-200";
                  }
                } else if (isSelected) {
                  optionStyle = "bg-indigo-950/60 border-indigo-500 text-indigo-200";
                }

                return (
                  <button
                    key={idx}
                    disabled={calibrationSubmitted}
                    onClick={() => setSelectedCalibrationIndex(idx)}
                    className={`w-full text-left p-3 rounded-lg border text-xs sm:text-sm transition-all flex items-start gap-2.5 ${optionStyle}`}
                  >
                    <span className="w-5 h-5 rounded-full border border-current shrink-0 flex items-center justify-center text-[10px] font-bold">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-snug">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!calibrationSubmitted ? (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setActiveStep(2)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Review Model
              </button>
              <button
                disabled={selectedCalibrationIndex === null}
                onClick={handleCalibrationSubmit}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedCalibrationIndex !== null
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                Verify Intuition
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 ${
                isCalibrationCorrect 
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200" 
                  : "bg-amber-950/40 border-amber-500/50 text-amber-200"
              }`}>
                {isCalibrationCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold">
                    {isCalibrationCorrect 
                      ? "Cognitive repair confirmed!" 
                      : "Insight reinforced for your personal vault."}
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    {aiData?.explanation || question.explanation}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  id="btn-complete-concept-repair"
                  onClick={handleFinalizeRepair}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>Log to Mental Model Vault (+35 XP)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
