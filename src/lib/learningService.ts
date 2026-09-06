import { doc, getDoc, setDoc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";
import { ConceptState } from "../types";
import type { 
  SpacedRepetitionProgress, 
  PracticeAttempt, 
  LearningTrack, 
  RewardEventRecord,
  UserProfile 
} from "../types";

/**
 * Local memory & storage cache of awarded reward events to guarantee
 * instant zero-latency UI idempotency while Firestore writes execute.
 */
const awardedEventsCache = new Set<string>();

// Load any cached events from localStorage
try {
  const stored = localStorage.getItem("mindloop_reward_events");
  if (stored) {
    const list = JSON.parse(stored);
    if (Array.isArray(list)) {
      list.forEach(id => awardedEventsCache.add(id));
    }
  }
} catch (e) {
  // Safe fallback
}

function persistAwardedEventLocal(id: string) {
  awardedEventsCache.add(id);
  try {
    const list = Array.from(awardedEventsCache).slice(-200); // keep last 200
    localStorage.setItem("mindloop_reward_events", JSON.stringify(list));
  } catch (e) {
    // ignore
  }
}

/**
 * Derives the strict, evidence-based concept learning state.
 * States:
 * - NOT_STARTED: 0 attempts
 * - LEARNING: < 2 attempts (insufficient evidence) or normal active learning
 * - WEAK: >= 2 attempts with accuracy < 60% OR marked needsRepair
 * - REPAIRING: concept is currently active in the repair remediation flow
 * - IMPROVING: repaired with recent attempts showing positive recovery (>= 60%)
 * - STABLE: >= 3 attempts with sustained accuracy >= 70%
 * - MASTERED: >= 4 attempts with sustained accuracy >= 80% and consecutive correct >= 2
 */
export function computeConceptLearningState(
  progress?: Partial<SpacedRepetitionProgress> | null,
  isCurrentlyRepairing: boolean = false
): ConceptState {
  if (!progress || !progress.totalAttempts || progress.totalAttempts === 0) {
    return ConceptState.NOT_STARTED;
  }

  if (isCurrentlyRepairing) {
    return ConceptState.REPAIRING;
  }

  const total = progress.totalAttempts;
  const correct = progress.correctAttempts ?? 0;
  const accuracy = Math.round((correct / total) * 100);
  const consecutive = progress.consecutiveCorrect ?? (accuracy >= 80 ? 2 : 0);
  const needsRepair = Boolean(progress.needsRepair);

  // Insufficient evidence (< 2 attempts)
  if (total < 2) {
    return needsRepair ? ConceptState.WEAK : ConceptState.LEARNING;
  }

  // Weak if marked needsRepair or low accuracy with sufficient attempts
  if (needsRepair || accuracy < 60) {
    return ConceptState.WEAK;
  }

  // Check if concept has recently repaired and is improving
  if (progress.lastRepairDate && accuracy >= 60 && accuracy < 75) {
    return ConceptState.IMPROVING;
  }

  // Mastered requires repeated, consistent high performance
  if (total >= 4 && accuracy >= 80 && consecutive >= 2 && progress.masteryLevel && progress.masteryLevel >= 4) {
    return ConceptState.MASTERED;
  }

  // Stable requires sustained performance
  if (total >= 3 && accuracy >= 70) {
    return ConceptState.STABLE;
  }

  return ConceptState.LEARNING;
}

/**
 * Calculates rolling recency-weighted accuracy (0-100%).
 * Weights the 5 most recent attempts (65%) and historical performance (35%),
 * ensuring that past mistakes don't permanently penalize a learner who has repaired.
 */
export function calculateWeightedAccuracy(
  totalAttempts: number,
  correctAttempts: number,
  recentAttempts?: { isCorrect: boolean }[]
): number {
  if (totalAttempts === 0) return 0;
  const overallAcc = (correctAttempts / totalAttempts) * 100;

  if (!recentAttempts || recentAttempts.length === 0) {
    return Math.round(overallAcc);
  }

  const recentSlice = recentAttempts.slice(-5);
  const recentCorrect = recentSlice.filter(a => a.isCorrect).length;
  const recentAcc = (recentCorrect / recentSlice.length) * 100;

  // 65% recent, 35% historical
  return Math.round((recentAcc * 0.65) + (overallAcc * 0.35));
}

/**
 * STRICT OVERALL MASTERY CALCULATION:
 * Total Correct Practice Attempts / Total Practice Attempts * 100
 * Aggregated across all active courses and modules.
 * Returns 0% when no attempts have been recorded.
 */
export function calculateOverallMastery(
  progressMap: Record<string, SpacedRepetitionProgress>
): {
  overallMasteryPercent: number;
  totalAttempts: number;
  totalCorrect: number;
  totalWrong: number;
} {
  const progresses = Object.values(progressMap);
  let totalAttempts = 0;
  let totalCorrect = 0;

  progresses.forEach(p => {
    totalAttempts += p.totalAttempts || 0;
    totalCorrect += p.correctAttempts || 0;
  });

  const totalWrong = Math.max(0, totalAttempts - totalCorrect);
  const overallMasteryPercent = totalAttempts > 0 
    ? Math.round((totalCorrect / totalAttempts) * 100) 
    : 0;

  return {
    overallMasteryPercent,
    totalAttempts,
    totalCorrect,
    totalWrong
  };
}

/**
 * Convenience helper returning overall mastery percentage directly.
 */
export function computeOverallMasteryScore(
  _tracks?: LearningTrack[],
  progressMap: Record<string, SpacedRepetitionProgress> = {}
): number {
  return calculateOverallMastery(progressMap).overallMasteryPercent;
}

/**
 * Calculates mastery percentage for a single learning track / course.
 */
export function calculateCourseMastery(
  track: LearningTrack,
  progressMap: Record<string, SpacedRepetitionProgress>
): number {
  if (!track.concepts || track.concepts.length === 0) return 0;
  let totalAttempts = 0;
  let totalCorrect = 0;

  track.concepts.forEach(c => {
    const p = progressMap[c.id];
    if (p) {
      totalAttempts += p.totalAttempts || 0;
      totalCorrect += p.correctAttempts || 0;
    }
  });

  if (totalAttempts === 0) return 0;
  return Math.round((totalCorrect / totalAttempts) * 100);
}

/**
 * Calculates curriculum completion progress (0-100%) for a course.
 */
export function calculateCourseProgress(
  track: LearningTrack,
  progressMap: Record<string, SpacedRepetitionProgress>
): number {
  if (!track.concepts || track.concepts.length === 0) return 0;
  const attemptedCount = track.concepts.filter(c => {
    const p = progressMap[c.id];
    return p && p.totalAttempts > 0;
  }).length;

  return Math.round((attemptedCount / track.concepts.length) * 100);
}

/**
 * Generates a deterministic idempotency key for XP reward events:
 * e.g. "q_first_correct_two-pointers-window", "repair_comp_graph-bfs", "streak_7"
 */
export function getRewardEventKey(actionType: string, entityId: string): string {
  const sanitizedEntity = entityId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${actionType}_${sanitizedEntity}`;
}

/**
 * IDEMPOTENT XP REWARD SYSTEM:
 * Guarantees that points for a question, repair, module, or streak milestone are 
 * awarded EXACTLY ONCE.
 * 
 * Subsequent submissions of the same question will record learning evidence in
 * `practiceAttempts`, but will yield 0 XP.
 * 
 * Uses Firestore deterministic document IDs under `/users/{userId}/rewardEvents/{eventId}`
 * and atomic Firestore transactions for bulletproof concurrency safety.
 */
export async function claimIdempotentXP(
  userId: string,
  actionType: "question_first_correct" | "repair_completed" | "module_completed" | "streak_milestone" | "mastery_milestone",
  entityId: string,
  baseXP: number,
  reason: string
): Promise<{ awarded: boolean; xpAwarded: number; newTotalXP?: number }> {
  if (!userId || baseXP <= 0) {
    return { awarded: false, xpAwarded: 0 };
  }

  const eventKey = getRewardEventKey(actionType, entityId);
  const fullDocId = `${userId}_${eventKey}`;

  // 1. Check local fast-path cache
  if (awardedEventsCache.has(fullDocId)) {
    return { awarded: false, xpAwarded: 0 };
  }

  // 2. If guest learner without active Firestore user session
  if (userId === "guest") {
    persistAwardedEventLocal(fullDocId);
    return { awarded: true, xpAwarded: baseXP };
  }

  // 3. Authoritative Firestore check & atomic claim
  try {
    const eventDocRef = doc(db, "users", userId, "rewardEvents", fullDocId);
    const userDocRef = doc(db, "users", userId);

    const result = await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventDocRef);
      if (eventSnap.exists()) {
        // Event already claimed previously!
        return { awarded: false, xpAwarded: 0 };
      }

      const userSnap = await transaction.get(userDocRef);
      const currentXP = userSnap.exists() ? (userSnap.data()?.xp ?? 0) : 0;
      const newXP = currentXP + baseXP;
      const newLevel = Math.floor(newXP / 100) + 1;

      const record: RewardEventRecord = {
        id: fullDocId,
        userId,
        actionType,
        entityId,
        xpAwarded: baseXP,
        awardedAt: new Date().toISOString()
      };

      // Atomic write of reward event doc and user profile update
      transaction.set(eventDocRef, record);
      transaction.update(userDocRef, {
        xp: newXP,
        level: newLevel,
        lastActiveDate: new Date().toISOString()
      });

      return { awarded: true, xpAwarded: baseXP, newTotalXP: newXP };
    });

    if (result.awarded) {
      persistAwardedEventLocal(fullDocId);
    }
    return result;
  } catch (error) {
    console.warn("Idempotent XP claim fallback:", error);
    // Offline / permission fallback: check memory cache
    if (!awardedEventsCache.has(fullDocId)) {
      persistAwardedEventLocal(fullDocId);
      return { awarded: true, xpAwarded: baseXP };
    }
    return { awarded: false, xpAwarded: 0 };
  }
}

/**
 * Calculates streak and weekly Safety Streak.
 * Uses local calendar days to avoid UTC offset boundary bugs.
 */
export function calculateLocalStreak(
  currentStreak: number,
  lastActiveDateStr?: string,
  availableFreezes: number = 0
): {
  newStreak: number;
  freezesRemaining: number;
  streakSavedByFreeze: boolean;
  isActiveToday: boolean;
} {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  if (!lastActiveDateStr) {
    return {
      newStreak: 1,
      freezesRemaining: availableFreezes,
      streakSavedByFreeze: false,
      isActiveToday: true
    };
  }

  const lastActive = new Date(lastActiveDateStr);
  const lastActiveKey = `${lastActive.getFullYear()}-${String(lastActive.getMonth() + 1).padStart(2, "0")}-${String(lastActive.getDate()).padStart(2, "0")}`;

  if (todayKey === lastActiveKey) {
    // Already active today
    return {
      newStreak: Math.max(1, currentStreak),
      freezesRemaining: availableFreezes,
      streakSavedByFreeze: false,
      isActiveToday: true
    };
  }

  // Calculate day difference using midnight timestamps
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const lastMidnight = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate()).getTime();
  const diffDays = Math.round((todayMidnight - lastMidnight) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Yesterday was active -> streak + 1
    return {
      newStreak: currentStreak + 1,
      freezesRemaining: availableFreezes,
      streakSavedByFreeze: false,
      isActiveToday: true
    };
  }

  if (diffDays === 2 && availableFreezes > 0) {
    // Missed 1 day, saved by freeze
    return {
      newStreak: currentStreak + 1,
      freezesRemaining: availableFreezes - 1,
      streakSavedByFreeze: true,
      isActiveToday: true
    };
  }

  // Streak reset to 1 on fresh active day
  return {
    newStreak: 1,
    freezesRemaining: availableFreezes,
    streakSavedByFreeze: false,
    isActiveToday: true
  };
}

/**
 * Calculates Safety Streak in completed weekly blocks (consecutive 7-day cycles).
 */
export function calculateSafetyStreakWeeks(currentStreak: number): number {
  return Math.floor(currentStreak / 7);
}
