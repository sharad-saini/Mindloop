import React from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Flame, 
  ShieldCheck, 
  Brain, 
  CheckCircle2, 
  RotateCcw, 
  Clock, 
  Zap,
  Calendar,
  Award
} from "lucide-react";
import type { UserProfile, SpacedRepetitionProgress, LearningTrack } from "../types";
import { calculateCurrentRetention } from "../lib/spacedRepetition";

interface StatsRetentionViewProps {
  userProfile: UserProfile;
  progressMap: Record<string, SpacedRepetitionProgress>;
  tracks: LearningTrack[];
  onUseStreakFreeze: () => void;
}

export const StatsRetentionView: React.FC<StatsRetentionViewProps> = ({
  userProfile,
  progressMap,
  tracks,
  onUseStreakFreeze,
}) => {
  const allProgressList = Object.values(progressMap) as SpacedRepetitionProgress[];
  const totalConceptsTracked = allProgressList.length;

  let totalMasterySum = 0;
  let masteredCount = 0; // Lv 4-5
  let reviewingCount = 0; // Lv 2-3
  let learningCount = 0; // Lv 0-1
  let totalRetentionSum = 0;

  allProgressList.forEach(p => {
    totalMasterySum += p.masteryLevel;
    if (p.masteryLevel >= 4) masteredCount++;
    else if (p.masteryLevel >= 2) reviewingCount++;
    else learningCount++;

    totalRetentionSum += calculateCurrentRetention(p);
  });

  const avgRetention = totalConceptsTracked > 0 
    ? Math.round(totalRetentionSum / totalConceptsTracked) 
    : 0;

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Retention & Cognitive Metrics
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time memory decay tracking powered by the Ebbinghaus forgetting model.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Flame className="w-4 h-4 fill-current" />
            <span>{userProfile.currentStreak} Days Streak</span>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Projected Retention</span>
            <Brain className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-teal-400">
            {avgRetention}%
          </div>
          <div className="text-[11px] text-slate-500">
            Active memory strength
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Mastered Concepts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400">
            {masteredCount}
          </div>
          <div className="text-[11px] text-slate-500">
            Level 4 & 5 permanent memory
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Reviewing & Active</span>
            <RotateCcw className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-400">
            {reviewingCount}
          </div>
          <div className="text-[11px] text-slate-500">
            In spaced repetition queue
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Experience</span>
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-400">
            {userProfile.xp} XP
          </div>
          <div className="text-[11px] text-slate-500">
            Rank: Level {userProfile.level} Architect
          </div>
        </div>
      </div>

      {/* Ebbinghaus Forgetting Curve Projection Visualizer */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Ebbinghaus Spaced Repetition Curve
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              How timed active recall interrupts natural exponential memory decay.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-3 h-0.5 bg-rose-400 inline-block" /> Unreviewed Decay
            </span>
            <span className="flex items-center gap-1.5 text-teal-400">
              <span className="w-3 h-0.5 bg-teal-400 inline-block" /> Spaced Recall Interventions
            </span>
          </div>
        </div>

        {/* SVG Curve Chart */}
        <div className="h-56 w-full bg-slate-950/60 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
          <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="40" x2="500" y2="40" stroke="#334155" strokeDasharray="3 3" />
            <line x1="0" y1="80" x2="500" y2="80" stroke="#334155" strokeDasharray="3 3" />
            <line x1="0" y1="120" x2="500" y2="120" stroke="#334155" strokeDasharray="3 3" />

            {/* Natural decay curve (red/rose) */}
            <path
              d="M 20 20 Q 80 130 500 150"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />

            {/* Spaced repetition saw-tooth recovery curve (teal) */}
            <path
              d="M 20 20 
                 Q 50 65 70 80 
                 L 70 20 
                 Q 120 50 160 65 
                 L 160 20 
                 Q 230 40 300 48 
                 L 300 20 
                 Q 400 30 500 32"
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="3"
            />

            {/* Review Nodes */}
            <circle cx="70" cy="20" r="4" fill="#2dd4bf" />
            <circle cx="160" cy="20" r="4" fill="#2dd4bf" />
            <circle cx="300" cy="20" r="4" fill="#2dd4bf" />

            <text x="25" y="15" fill="#94a3b8" fontSize="9" fontFamily="monospace">Day 0 (100%)</text>
            <text x="75" y="15" fill="#2dd4bf" fontSize="9" fontFamily="monospace">Review 1 (+1d)</text>
            <text x="165" y="15" fill="#2dd4bf" fontSize="9" fontFamily="monospace">Review 2 (+3d)</text>
            <text x="305" y="15" fill="#2dd4bf" fontSize="9" fontFamily="monospace">Review 3 (+7d)</text>
          </svg>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800/80">
            <span>Immediate Encounter</span>
            <span>24 Hours</span>
            <span>3 Days</span>
            <span>1 Week</span>
            <span>1 Month & Beyond</span>
          </div>
        </div>
      </div>

      {/* Daily Streak & Streak Freeze Manager - Bento Banner */}
      <div className="bg-indigo-600 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white shadow-xl shadow-indigo-600/20">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-200">
            Weekly Safety & Habit Guard
          </div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-white" />
            <span>Streak Protection Vault</span>
          </h3>
          <p className="text-xs text-indigo-100 max-w-md">
            Maintain your consistent habits without losing historical cognitive momentum if life interrupts.
          </p>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-center">
          <div className="text-right">
            <div className="text-xs text-indigo-200">Freezes Available</div>
            <div className="text-lg font-bold text-white">
              {userProfile.streakFreezes} active
            </div>
          </div>

          <button
            onClick={onUseStreakFreeze}
            disabled={userProfile.streakFreezes <= 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              userProfile.streakFreezes > 0
                ? "bg-white text-indigo-950 hover:bg-indigo-50 shadow-white/10"
                : "bg-indigo-700/60 text-indigo-300/60 cursor-not-allowed"
            }`}
          >
            Equip Streak Shield
          </button>
        </div>
      </div>

      {/* Milestone Badges & Streaks: 7, 10, 20, 30, 50, 100 Days */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Milestone Badges & Habit Streaks</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Persistent recognition for disciplined active recall intervals and mental model calibrations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {[
            {
              id: "streak-3",
              title: "3-Day Spark",
              requirement: "3-Day Daily Streak",
              icon: "🔥",
              unlocked: userProfile.currentStreak >= 3 || userProfile.longestStreak >= 3,
              current: Math.min(3, userProfile.longestStreak),
              target: 3,
            },
            {
              id: "streak-7",
              title: "7-Day Consistency",
              requirement: "7-Day Daily Streak",
              icon: "⚡",
              unlocked: userProfile.currentStreak >= 7 || userProfile.longestStreak >= 7,
              current: Math.min(7, userProfile.longestStreak),
              target: 7,
            },
            {
              id: "streak-10",
              title: "10-Day Momentum",
              requirement: "10-Day Daily Streak",
              icon: "🌟",
              unlocked: userProfile.currentStreak >= 10 || userProfile.longestStreak >= 10,
              current: Math.min(10, userProfile.longestStreak),
              target: 10,
            },
            {
              id: "streak-20",
              title: "20-Day Habit",
              requirement: "20-Day Daily Streak",
              icon: "🛡️",
              unlocked: userProfile.currentStreak >= 20 || userProfile.longestStreak >= 20,
              current: Math.min(20, userProfile.longestStreak),
              target: 20,
            },
            {
              id: "streak-30",
              title: "30-Day Dedication",
              requirement: "30-Day Daily Streak",
              icon: "💎",
              unlocked: userProfile.currentStreak >= 30 || userProfile.longestStreak >= 30,
              current: Math.min(30, userProfile.longestStreak),
              target: 30,
            },
            {
              id: "streak-50",
              title: "50-Day Mastery",
              requirement: "50-Day Daily Streak",
              icon: "👑",
              unlocked: userProfile.currentStreak >= 50 || userProfile.longestStreak >= 50,
              current: Math.min(50, userProfile.longestStreak),
              target: 50,
            },
            {
              id: "streak-100",
              title: "100-Day Legend",
              requirement: "100-Day Daily Streak",
              icon: "🏆",
              unlocked: userProfile.currentStreak >= 100 || userProfile.longestStreak >= 100,
              current: Math.min(100, userProfile.longestStreak),
              target: 100,
            },
            {
              id: "mastery-1",
              title: "First Anchor",
              requirement: "1 Concept Mastered (Lv 5)",
              icon: "🎯",
              unlocked: masteredCount >= 1,
              current: Math.min(1, masteredCount),
              target: 1,
            },
            {
              id: "mastery-5",
              title: "Deep Retention",
              requirement: "5 Concepts Mastered",
              icon: "🧠",
              unlocked: masteredCount >= 5,
              current: Math.min(5, masteredCount),
              target: 5,
            },
            {
              id: "mastery-10",
              title: "Polymath Engine",
              requirement: "10 Concepts Mastered",
              icon: "🚀",
              unlocked: masteredCount >= 10,
              current: Math.min(10, masteredCount),
              target: 10,
            },
            {
              id: "xp-500",
              title: "Cognitive Scholar",
              requirement: "500 XP Earned",
              icon: "✨",
              unlocked: userProfile.xp >= 500,
              current: Math.min(500, userProfile.xp),
              target: 500,
            },
            {
              id: "xp-1000",
              title: "Master Architect",
              requirement: "1,000 XP Earned",
              icon: "🏛️",
              unlocked: userProfile.xp >= 1000,
              current: Math.min(1000, userProfile.xp),
              target: 1000,
            },
          ].map(badge => (
            <div
              key={badge.id}
              className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                badge.unlocked
                  ? "bg-slate-900/80 border-amber-500/40 shadow-lg shadow-amber-500/5"
                  : "bg-slate-950/40 border-slate-800/60 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${
                  badge.unlocked ? "bg-amber-500/20 border border-amber-500/40" : "bg-slate-900 border border-slate-800"
                }`}>
                  {badge.icon}
                </div>
                {badge.unlocked ? (
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    Unlocked
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {badge.current}/{badge.target}
                  </span>
                )}
              </div>

              <div className="mt-3">
                <div className="text-xs font-bold text-white">
                  {badge.title}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  {badge.requirement}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
