import React, { useState, useMemo, useEffect } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import { 
  CheckCircle2, 
  Sparkles, 
  RotateCcw, 
  HelpCircle, 
  Clock, 
  Layers, 
  ArrowRight, 
  Flame, 
  TrendingUp, 
  Bot,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Award,
  X
} from "lucide-react";
import type { Concept, Question, SpacedRepetitionProgress, LearningTrack, UserProfile, ConceptRepairRecord, MasteryCertificate } from "../types";
import { AdaptiveConceptRepairLoop } from "./AdaptiveConceptRepairLoop";

interface DailyQueueViewProps {
  dueCards: { concept: Concept; track: LearningTrack; progress?: SpacedRepetitionProgress }[];
  allTracks: LearningTrack[];
  progressMap: Record<string, SpacedRepetitionProgress>;
  userProfile: UserProfile;
  repairRecords: ConceptRepairRecord[];
  certificates: MasteryCertificate[];
  targetedConcept?: { concept: Concept; track: LearningTrack } | null;
  onClearTargetedConcept?: () => void;
  onCardReviewed: (
    conceptId: string, 
    trackId: string, 
    quality: number, 
    misconception?: string
  ) => void;
  onRepairCompleted: (
    conceptId: string, 
    trackId: string, 
    conceptTitle: string, 
    misconception: string, 
    keyInsight: string, 
    score: number
  ) => void;
  onNavigateToTracks: () => void;
  onUseStreakFreeze?: () => void;
  onOpenAiTutor?: (concept: Concept, question: Question, userWrongAnswer: string) => void;
}

export const DailyQueueView: React.FC<DailyQueueViewProps> = ({
  dueCards,
  allTracks,
  progressMap,
  userProfile,
  repairRecords,
  certificates,
  targetedConcept,
  onClearTargetedConcept,
  onCardReviewed,
  onRepairCompleted,
  onNavigateToTracks,
  onUseStreakFreeze,
  onOpenAiTutor,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [inRepairMode, setInRepairMode] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, xpGained: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prioritize targeted concept when user chose "Practice" on a specific concept
  const queueCards = useMemo(() => {
    if (!targetedConcept) return dueCards;
    const existingIndex = dueCards.findIndex(item => item.concept.id === targetedConcept.concept.id);
    if (existingIndex >= 0) {
      const copy = [...dueCards];
      const [item] = copy.splice(existingIndex, 1);
      return [item, ...copy];
    }
    const p = progressMap[targetedConcept.concept.id];
    return [{ concept: targetedConcept.concept, track: targetedConcept.track, progress: p }, ...dueCards];
  }, [targetedConcept, dueCards, progressMap]);

  // When a targeted concept is passed in, jump straight to card 0
  useEffect(() => {
    if (targetedConcept) {
      setCurrentIndex(0);
      setSelectedOptionIndex(null);
      setIsAnswerRevealed(false);
      setInRepairMode(false);
      setSessionCompleted(false);
    }
  }, [targetedConcept?.concept?.id]);

  const activeItem = queueCards[currentIndex];
  const activeConcept = activeItem?.concept;
  const activeQuestion: Question | undefined = activeConcept?.questions[0];

  // Real-time calculation of practice attempts, correct answers, and overall mastery across all courses
  const allConceptsList = useMemo(() => {
    const list: Concept[] = [];
    allTracks.forEach(t => list.push(...t.concepts));
    return list;
  }, [allTracks]);

  const progressValues = useMemo(() => {
    return Object.values(progressMap) as SpacedRepetitionProgress[];
  }, [progressMap]);

  const totalAllPracticeAttempts = useMemo(() => {
    return progressValues.reduce((acc, p) => acc + (p.totalAttempts || 0), 0);
  }, [progressValues]);

  const totalAllCorrectAttempts = useMemo(() => {
    return progressValues.reduce((acc, p) => acc + (p.correctAttempts || 0), 0);
  }, [progressValues]);

  const totalAllWrongAttempts = useMemo(() => {
    return Math.max(0, totalAllPracticeAttempts - totalAllCorrectAttempts);
  }, [totalAllPracticeAttempts, totalAllCorrectAttempts]);

  // Overall Mastery strictly defined as: ALL CORRECT ATTEMPTS / ALL PRACTICE ATTEMPTS * 100
  // Starts at 0% when no attempts exist
  const overallMasteryPercent = useMemo(() => {
    if (totalAllPracticeAttempts === 0) return 0;
    return Math.round((totalAllCorrectAttempts / totalAllPracticeAttempts) * 100);
  }, [totalAllPracticeAttempts, totalAllCorrectAttempts]);

  const practiceAccuracyPercent = useMemo(() => {
    if (totalAllPracticeAttempts === 0) {
      if (sessionStats.reviewed > 0) {
        return Math.round((sessionStats.correct / sessionStats.reviewed) * 100);
      }
      return 0;
    }
    return Math.round((totalAllCorrectAttempts / totalAllPracticeAttempts) * 100);
  }, [totalAllPracticeAttempts, totalAllCorrectAttempts, sessionStats]);

  const longTermRetentionPercent = useMemo(() => {
    if (progressValues.length === 0) return 0;
    const sum = progressValues.reduce((acc, p) => acc + (p.retentionScore || 80), 0);
    return Math.round(sum / progressValues.length);
  }, [progressValues]);

  // Find real concept needing repair for the Bento Repair card
  const criticalRepairItem = useMemo(() => {
    for (const track of allTracks) {
      for (const concept of track.concepts) {
        const p = progressMap[concept.id];
        if (p && p.needsRepair) {
          return { concept, track, progress: p };
        }
      }
    }
    // Or lowest retention score
    let lowest: { concept: Concept; track: LearningTrack; progress: SpacedRepetitionProgress } | null = null;
    for (const track of allTracks) {
      for (const concept of track.concepts) {
        const p = progressMap[concept.id];
        if (p && (!lowest || p.retentionScore < lowest.progress.retentionScore)) {
          lowest = { concept, track, progress: p };
        }
      }
    }
    if (lowest) return lowest;
    if (allTracks[0]?.concepts[0]) {
      return {
        concept: allTracks[0].concepts[0],
        track: allTracks[0],
        progress: progressMap[allTracks[0].concepts[0].id] || {
          userId: userProfile.userId,
          conceptId: allTracks[0].concepts[0].id,
          trackId: allTracks[0].id,
          masteryLevel: 0,
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          nextReviewDate: new Date().toISOString(),
          totalAttempts: 0,
          correctAttempts: 0,
          retentionScore: 70,
          needsRepair: false
        }
      };
    }
    return null;
  }, [allTracks, progressMap, userProfile.userId]);

  const handleSelectOption = (index: number) => {
    if (isAnswerRevealed || inRepairMode) return;
    setSelectedOptionIndex(index);
    setIsAnswerRevealed(true);

    const isCorrect = index === activeQuestion?.correctIndex;
    if (isCorrect) {
      setSessionStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        correct: prev.correct + 1,
        xpGained: prev.xpGained + 20,
      }));
    } else {
      setSessionStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        xpGained: prev.xpGained + 10,
      }));
      // Auto-trigger adaptive concept repair loop!
      setInRepairMode(true);
    }
  };

  const handleSM2Rating = (quality: number) => {
    if (!activeConcept || isSubmitting) return;
    setIsSubmitting(true);
    try {
      onCardReviewed(
        activeConcept.id,
        activeConcept.trackId,
        quality
      );
      proceedToNextCard();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRepairResolved = (keyInsight: string, score: number) => {
    if (!activeConcept || !activeQuestion || isSubmitting) return;
    setIsSubmitting(true);
    try {
      onRepairCompleted(
        activeConcept.id,
        activeConcept.trackId,
        activeConcept.title,
        activeQuestion.misconceptionDiagnosis,
        keyInsight,
        score
      );

      setSessionStats(prev => ({
        ...prev,
        xpGained: prev.xpGained + 35,
      }));

      setInRepairMode(false);
      setIsAnswerRevealed(false);
      setSelectedOptionIndex(null);

      proceedToNextCard();
    } finally {
      setIsSubmitting(false);
    }
  };

  const proceedToNextCard = () => {
    if (currentIndex + 1 < queueCards.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOptionIndex(null);
      setIsAnswerRevealed(false);
      setInRepairMode(false);
    } else {
      setSessionCompleted(true);
      if (onClearTargetedConcept) onClearTargetedConcept();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Safe if canvas unavailable
      }
    }
  };

  const queueProgressPercent = queueCards.length > 0 
    ? Math.round(((currentIndex) / queueCards.length) * 100) 
    : 100;

  // Milestone count
  const masteredCount = (Object.values(progressMap) as SpacedRepetitionProgress[]).filter(p => p.masteryLevel >= 4).length;
  const unlockedBadgesCount = [
    userProfile.currentStreak >= 3,
    userProfile.currentStreak >= 7,
    userProfile.currentStreak >= 10,
    userProfile.currentStreak >= 20,
    userProfile.currentStreak >= 30,
    userProfile.currentStreak >= 50,
    userProfile.currentStreak >= 100,
    masteredCount >= 1,
    masteredCount >= 5,
    masteredCount >= 10,
    repairRecords.length >= 1,
    repairRecords.length >= 5,
    certificates.length >= 1,
  ].filter(Boolean).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
        
        {/* HERO BENTO CARD: Active Recall or Completed Session (Col Span 8) */}
        <div className="col-span-12 lg:col-span-8 bg-gradient-to-br from-indigo-900/40 via-slate-900/90 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
          {/* Ambient Glow from Design HTML */}
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-5">
            {/* Targeted Practice Banner if user clicked Practice from Knowledge Map */}
            {targetedConcept && !sessionCompleted && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
                <div className="flex items-center gap-2 text-xs text-indigo-300">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 font-bold uppercase tracking-wider text-[10px]">
                    Targeted Practice
                  </span>
                  <span className="font-semibold text-white truncate max-w-xs sm:max-w-md">
                    {targetedConcept.concept.title}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (onClearTargetedConcept) onClearTargetedConcept();
                    onNavigateToTracks();
                  }}
                  className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 font-medium transition-colors"
                >
                  <span>Return to Course</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Top Eyebrow */}
            <div className="flex items-center justify-between">
              <div className="text-indigo-400 text-xs font-bold tracking-widest uppercase">
                {sessionCompleted 
                  ? "SESSION SUMMARY" 
                  : `CONTINUE LEARNING • CARD ${currentIndex + 1} OF ${queueCards.length || 1}`}
              </div>
              {activeItem && !sessionCompleted && (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeItem.track.title}
                </span>
              )}
            </div>

            {/* Session Completed State */}
            {sessionCompleted || queueCards.length === 0 ? (
              <div className="py-6 space-y-6 text-center sm:text-left">
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {sessionCompleted ? "Daily Review Completed!" : "You're All Caught Up!"}
                  </h2>
                  <p className="text-slate-300 text-sm max-w-lg leading-relaxed">
                    {sessionCompleted
                      ? `Great consistency! You reinforced ${sessionStats.reviewed} micro-concepts and earned +${sessionStats.xpGained} XP.`
                      : "No active recall cards due right now. The SM-2 spaced repetition scheduler has organized your intervals."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    id="btn-resume-explore-tracks"
                    onClick={onNavigateToTracks}
                    className="px-8 py-3 bg-white hover:bg-slate-100 text-black font-bold rounded-xl text-sm transition-all shadow-md shadow-white/10 flex items-center gap-2"
                  >
                    <span>Explore More Courses</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setSessionCompleted(false);
                      setCurrentIndex(0);
                    }}
                    className="px-6 py-3 bg-slate-800/80 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm border border-slate-700 transition-colors"
                  >
                    Review Again
                  </button>
                </div>
              </div>
            ) : inRepairMode && activeQuestion && activeConcept ? (
              /* If In Concept Repair Mode */
              <div className="pt-2">
                <AdaptiveConceptRepairLoop
                  concept={activeConcept}
                  question={activeQuestion}
                  userAnswer={selectedOptionIndex !== null ? activeQuestion.options[selectedOptionIndex] : "Misconception"}
                  correctAnswer={activeQuestion.options[activeQuestion.correctIndex]}
                  onRepairResolved={handleRepairResolved}
                  onSkip={() => proceedToNextCard()}
                  onOpenAiTutor={onOpenAiTutor}
                />
              </div>
            ) : (
              /* Active Recall Question within Bento Hero Card */
              <div className="space-y-5">
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold mb-1">
                    {activeConcept?.category}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {activeConcept?.title}
                  </h2>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                    {activeQuestion?.prompt}
                  </p>
                </div>

                {/* Code Snippet if present */}
                {activeQuestion?.codeSnippet && (
                  <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                    <pre className="whitespace-pre">{activeQuestion.codeSnippet}</pre>
                  </div>
                )}

                {/* Multiple Choice Options */}
                <div className="space-y-2.5 pt-1">
                  {activeQuestion?.options.map((option, idx) => {
                    const isSelected = selectedOptionIndex === idx;
                    const isCorrect = idx === activeQuestion.correctIndex;

                    let btnClass = "bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-800/70 hover:border-slate-700";
                    
                    if (isAnswerRevealed) {
                      if (isCorrect) {
                        btnClass = "bg-emerald-950/70 border-emerald-500 text-emerald-100 font-medium";
                      } else if (isSelected) {
                        btnClass = "bg-rose-950/70 border-rose-500 text-rose-100";
                      } else {
                        btnClass = "bg-slate-950/40 border-slate-800/60 text-slate-500 opacity-50";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        id={`queue-option-${idx}`}
                        disabled={isAnswerRevealed}
                        onClick={() => handleSelectOption(idx)}
                        className={`w-full text-left p-3.5 rounded-2xl border text-sm transition-all flex items-start gap-3 ${btnClass}`}
                      >
                        <span className="w-6 h-6 rounded-lg bg-slate-900 border border-current shrink-0 flex items-center justify-center text-xs font-bold mt-0.5">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="leading-snug">{option}</span>
                      </button>
                    );
                  })}
                </div>

                {/* If Correct: SM-2 Spaced Repetition Buttons */}
                {isAnswerRevealed && selectedOptionIndex === activeQuestion?.correctIndex && (
                  <div className="pt-4 border-t border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Accurate Recall!
                      </span>
                      <span className="text-slate-400 font-normal">Select recall difficulty:</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <button
                        id="btn-sm2-hard"
                        onClick={() => handleSM2Rating(3)}
                        className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-center transition-all group"
                      >
                        <div className="text-xs font-bold text-amber-400">Hard</div>
                        <div className="text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5">+1d Interval</div>
                      </button>
                      <button
                        id="btn-sm2-good"
                        onClick={() => handleSM2Rating(4)}
                        className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-center transition-all group"
                      >
                        <div className="text-xs font-bold text-blue-400">Good</div>
                        <div className="text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5">+3d Interval</div>
                      </button>
                      <button
                        id="btn-sm2-easy"
                        onClick={() => handleSM2Rating(5)}
                        className="p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-center transition-all group"
                      >
                        <div className="text-xs font-bold text-emerald-400">Easy</div>
                        <div className="text-[10px] text-slate-400 group-hover:text-slate-300 mt-0.5">+7d Interval</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Progress Bar with Glow from Design HTML */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-400 uppercase font-semibold">Session Progress</span>
                    <span className="text-white font-bold">{queueProgressPercent}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)] transition-all duration-300"
                      style={{ width: `${queueProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MASTERY DISTRIBUTION BENTO CARD (Col Span 4) */}
        <div className="col-span-12 lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase mb-4 tracking-wider">
              Mastery Distribution
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-300 font-medium">Overall Mastery</span>
                  <span className="text-xl font-bold text-emerald-400">{overallMasteryPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-300" 
                    style={{ width: `${overallMasteryPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-300 font-medium">Practice Accuracy</span>
                  <span className="text-xl font-bold text-blue-400">{practiceAccuracyPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-300" 
                    style={{ width: `${practiceAccuracyPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-300 font-medium">Long-Term Retention</span>
                  <span className="text-xl font-bold text-indigo-400">{longTermRetentionPercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-300" 
                    style={{ width: `${longTermRetentionPercent}%` }}
                  />
                </div>
              </div>

              {/* Questions, Correct, Wrong breakdown */}
              <div className="pt-2 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Questions</div>
                  <div className="text-white font-bold text-sm">{totalAllPracticeAttempts}</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <div className="text-emerald-400 text-[10px] uppercase font-semibold">Correct</div>
                  <div className="text-emerald-400 font-bold text-sm">{totalAllCorrectAttempts}</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <div className="text-rose-400 text-[10px] uppercase font-semibold">Wrong</div>
                  <div className="text-rose-400 font-bold text-sm">{totalAllWrongAttempts}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>SM-2 Memory Engine</span>
            <span className="text-indigo-400 font-semibold">Active</span>
          </div>
        </div>

        {/* DAILY ACTIVITY BENTO CARD (Col Span 4) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase mb-1 tracking-wider">
              Daily Activity
            </div>
            <div className="text-2xl font-bold text-white">
              +{sessionStats.xpGained} XP
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Earned this session • Total: {userProfile.xp} XP</p>
          </div>

          {/* Activity Bar Chart from Design HTML */}
          <div className="pt-6">
            <div className="flex items-end gap-1.5 h-20">
              <div className="flex-1 bg-slate-800 h-1/4 rounded-t hover:bg-slate-700 transition-colors" title="Mon" />
              <div className="flex-1 bg-slate-800 h-2/4 rounded-t hover:bg-slate-700 transition-colors" title="Tue" />
              <div className="flex-1 bg-slate-800 h-1/3 rounded-t hover:bg-slate-700 transition-colors" title="Wed" />
              <div className="flex-1 bg-indigo-500 h-full rounded-t shadow-[0_0_8px_rgba(99,102,241,0.4)]" title="Today: Active" />
              <div className="flex-1 bg-slate-800 h-2/3 rounded-t hover:bg-slate-700 transition-colors" title="Fri" />
              <div className="flex-1 bg-slate-800 h-1/2 rounded-t hover:bg-slate-700 transition-colors" title="Sat" />
              <div className="flex-1 bg-slate-700 h-3/4 rounded-t hover:bg-slate-600 transition-colors" title="Sun" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-2">
              <span>Mon</span>
              <span className="text-indigo-400 font-bold">Today</span>
              <span>Sun</span>
            </div>
          </div>
        </div>

        {/* REPAIR NEEDED BENTO CARD (Col Span 4) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                Repair Needed
              </div>
              <div className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                criticalRepairItem?.progress?.needsRepair 
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30" 
                  : "bg-amber-500/20 text-amber-400 border-amber-500/30"
              }`}>
                {criticalRepairItem?.progress?.needsRepair ? "CRITICAL" : "DECAY WATCH"}
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-white font-bold text-lg mb-1 truncate">
                {criticalRepairItem?.concept.title || "Reference Identity & Closures"}
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">
                {criticalRepairItem?.progress?.lastMisconception || 
                  criticalRepairItem?.concept.summary || 
                  "Subtle misconception detected in component boundary re-renders."}
              </p>
            </div>

            {/* Score box from Design HTML */}
            <div className="flex items-center justify-center h-20 mb-4 border border-slate-800 rounded-2xl bg-slate-950/50">
              <div className="text-center">
                <div className="text-3xl font-black text-rose-400">
                  {criticalRepairItem?.progress?.retentionScore || 70}%
                </div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Retention Score</div>
              </div>
            </div>
          </div>

          <div>
            <button
              id="btn-bento-start-repair"
              onClick={() => {
                if (criticalRepairItem) {
                  const idx = queueCards.findIndex(c => c.concept.id === criticalRepairItem.concept.id);
                  if (idx >= 0) {
                    setCurrentIndex(idx);
                  }
                  setInRepairMode(true);
                }
              }}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition-colors shadow-lg shadow-rose-600/20"
            >
              Start Repair
            </button>
            <div className="mt-2.5 text-center">
              <button 
                onClick={onNavigateToTracks}
                className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4"
              >
                View Repair Path
              </button>
            </div>
          </div>
        </div>

        {/* RECENT MILESTONES BENTO CARD (Col Span 4) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="text-slate-400 text-xs font-bold uppercase mb-4 tracking-wider">
              Recent Milestones
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-xl shrink-0">
                  🏆
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {repairRecords.length > 0 ? "Mental Model Vaulted" : "Active Recall Explorer"}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {repairRecords.length > 0 ? `${repairRecords.length} models vaulted` : "Initial concepts engaged"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-xl shrink-0">
                  🔥
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white">
                    {userProfile.currentStreak > 0 ? `${userProfile.currentStreak}-Day Streak Active` : "Habit Ignited"}
                  </div>
                  <div className="text-[10px] text-slate-500">Unbroken habit streak</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-500 uppercase font-bold">Milestones</span>
            <span className="text-xs text-white font-black">{unlockedBadgesCount}/13 Unlocked</span>
          </div>
        </div>

        {/* WEEKLY SAFETY / STREAK SHIELD BENTO CARD (Col Span 12 or 4) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-indigo-600 rounded-3xl p-6 flex items-center justify-between text-white shadow-xl shadow-indigo-600/20">
          <div>
            <div className="text-indigo-100 text-xs font-bold uppercase mb-1">
              Weekly Safety
            </div>
            <div className="text-xl font-bold text-white">
              {userProfile.streakFreezes > 0 ? `${userProfile.streakFreezes} Shield${userProfile.streakFreezes > 1 ? 's' : ''} Ready` : "Shield Depleted"}
            </div>
            <div className="text-xs text-indigo-200 mt-0.5">
              {userProfile.streakFreezes > 0 ? "Protects streak against missed days" : "Earn +100 XP to recharge shield"}
            </div>
          </div>
          <button 
            onClick={onUseStreakFreeze}
            title={userProfile.streakFreezes > 0 ? "Equip Streak Shield" : "No shields available"}
            className="w-14 h-14 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center border border-white/30 text-2xl shrink-0 transition-transform hover:scale-105 active:scale-95"
          >
            🛡️
          </button>
        </div>

      </div>

      {/* Floating Game Progression Next Module Reward Bar */}
      <AnimatePresence>
        {isAnswerRevealed && selectedOptionIndex === activeQuestion?.correctIndex && (
          <motion.div
            id="floating-next-module-container"
            initial={{ y: 90, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 90, opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 350, damping: 24 }}
            className="fixed bottom-6 inset-x-0 mx-auto max-w-lg px-4 z-50 pointer-events-auto"
          >
            <div className="p-[2px] rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 shadow-[0_12px_40px_rgba(99,102,241,0.45)]">
              <div className="bg-slate-950/95 backdrop-blur-lg rounded-[14px] p-3.5 sm:p-4 flex items-center justify-between gap-3 border border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/40 shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300/40 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                        +20 XP Reward Earned
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                        Accurate
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 truncate mt-0.5">
                      {activeConcept?.title || "Concept"} intuition validated
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="btn-next-module-action"
                    type="button"
                    onClick={() => handleSM2Rating(4)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-lg shadow-indigo-600/40 transition-all hover:scale-105 active:scale-95 border border-indigo-400/40 cursor-pointer"
                  >
                    <span>Next Module</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
