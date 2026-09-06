import type { SpacedRepetitionProgress } from "../types";

export interface SM2Result {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  masteryLevel: number;
  nextReviewDate: string;
  retentionScore: number;
  needsRepair: boolean;
}

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm
 * Quality scale:
 * 5 - Perfect response, instant recall
 * 4 - Correct response after a hesitation
 * 3 - Correct response recalled with significant difficulty
 * 2 - Incorrect response; where the correct one seemed easy to recall
 * 1 - Incorrect response; the correct one remembered
 * 0 - Complete blackout
 */
export function calculateSM2(
  current: Partial<SpacedRepetitionProgress>,
  quality: number
): SM2Result {
  const prevEF = current.easeFactor ?? 2.5;
  const prevInterval = current.intervalDays ?? 0;
  const prevReps = current.repetitions ?? 0;
  const prevMastery = current.masteryLevel ?? 0;

  let newEF = prevEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;
  if (newEF > 3.2) newEF = 3.2;

  let newInterval: number;
  let newReps: number;
  let newMastery: number;
  let needsRepair = false;

  if (quality >= 3) {
    if (prevReps === 0) {
      newInterval = 1;
    } else if (prevReps === 1) {
      newInterval = 3;
    } else {
      newInterval = Math.round(prevInterval * newEF);
    }
    newReps = prevReps + 1;
    newMastery = Math.min(5, prevMastery + (quality === 5 ? 1 : 0.5));
    needsRepair = false;
  } else {
    // Failure / mistake triggers concept repair
    newReps = 0;
    newInterval = 1;
    newMastery = Math.max(0, prevMastery - 1);
    needsRepair = true;
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);

  // Ebbinghaus estimated baseline retention
  const retentionScore = quality >= 3 ? Math.min(100, Math.round(75 + newMastery * 5)) : 35;

  return {
    easeFactor: Number(newEF.toFixed(2)),
    intervalDays: newInterval,
    repetitions: newReps,
    masteryLevel: Math.round(newMastery * 10) / 10,
    nextReviewDate: nextDate.toISOString(),
    retentionScore,
    needsRepair
  };
}

/**
 * Calculates current retention percentage based on Ebbinghaus forgetting curve
 */
export function calculateCurrentRetention(progress: SpacedRepetitionProgress): number {
  if (!progress.lastReviewedDate) return 100;
  const lastTime = new Date(progress.lastReviewedDate).getTime();
  const now = Date.now();
  const elapsedDays = Math.max(0, (now - lastTime) / (1000 * 60 * 60 * 24));
  
  // Stability proxy based on interval
  const stability = Math.max(1, progress.intervalDays * (progress.easeFactor / 2.0));
  const retention = Math.exp(-elapsedDays / stability) * 100;
  return Math.max(15, Math.min(100, Math.round(retention)));
}

/**
 * Checks if a card is due for review today
 */
export function isDueToday(nextReviewDateStr: string): boolean {
  if (!nextReviewDateStr) return true;
  const dueDate = new Date(nextReviewDateStr);
  const now = new Date();
  return dueDate.getTime() <= now.getTime();
}

/**
 * Calculates updated streak and freeze consumption based on meaningful activity
 */
export function calculateUpdatedStreak(
  currentStreak: number,
  lastActiveDateStr?: string,
  availableFreezes: number = 0
): { newStreak: number; freezesRemaining: number; streakSavedByFreeze: boolean } {
  if (!lastActiveDateStr) {
    return { newStreak: 1, freezesRemaining: availableFreezes, streakSavedByFreeze: false };
  }

  const now = new Date();
  const lastActive = new Date(lastActiveDateStr);

  const nowDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const lastDate = new Date(Date.UTC(lastActive.getUTCFullYear(), lastActive.getUTCMonth(), lastActive.getUTCDate()));

  const diffMs = nowDate.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { newStreak: Math.max(1, currentStreak), freezesRemaining: availableFreezes, streakSavedByFreeze: false };
  }

  if (diffDays === 1) {
    return { newStreak: currentStreak + 1, freezesRemaining: availableFreezes, streakSavedByFreeze: false };
  }

  if (diffDays === 2 && availableFreezes > 0) {
    return {
      newStreak: currentStreak + 1,
      freezesRemaining: availableFreezes - 1,
      streakSavedByFreeze: true,
    };
  }

  return { newStreak: 1, freezesRemaining: availableFreezes, streakSavedByFreeze: false };
}
