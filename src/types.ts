export interface Question {
  id: string;
  prompt: string;
  question?: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  misconceptionDiagnosis: string;
  counterExample: string;
  mentalModelRule: string;
  explanation: string;
}

export interface Concept {
  id: string;
  trackId: string;
  title: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  summary: string;
  mentalModelAnchor: string;
  commonPitfalls: string[];
  questions: Question[];
}

export interface LearningTrack {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: "frontend" | "systems" | "algorithms" | "cognition" | "custom";
  iconName: string;
  color: string;
  concepts: Concept[];
  authorId?: string;
  authorName?: string;
}

export enum ConceptState {
  NOT_STARTED = "NOT_STARTED",
  LEARNING = "LEARNING",
  WEAK = "WEAK",
  REPAIRING = "REPAIRING",
  IMPROVING = "IMPROVING",
  STABLE = "STABLE",
  MASTERED = "MASTERED",
}

export interface SpacedRepetitionProgress {
  userId: string;
  conceptId: string;
  trackId: string;
  masteryLevel: number; // 0 to 5
  easeFactor: number; // SM-2 default 2.5
  intervalDays: number;
  repetitions: number;
  nextReviewDate: string; // ISO string
  lastReviewedDate?: string;
  totalAttempts: number;
  correctAttempts: number;
  retentionScore: number; // 0 - 100
  needsRepair: boolean;
  lastMisconception?: string;
  conceptState?: ConceptState;
  recentAccuracy?: number;
  consecutiveCorrect?: number;
  lastRepairDate?: string;
}

export interface ConceptRepairRecord {
  id: string;
  userId: string;
  conceptId: string;
  trackId: string;
  conceptTitle: string;
  misconception: string;
  keyInsight: string;
  repairedAt: string;
  drillScore?: number;
}

export interface MasteryCertificate {
  certificateId: string;
  userId: string;
  userName: string;
  trackId: string;
  trackTitle: string;
  issuedAt: string;
  verificationCode: string;
  masteryScore: number;
  conceptsCount: number;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  isAnonymous?: boolean;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  streakFreezes: number;
  createdAt: string;
  safetyStreakWeeks?: number;
}

export interface RewardEventRecord {
  id: string; // e.g. "user_123_q_two-pointers-window"
  userId: string;
  actionType: "question_first_correct" | "repair_completed" | "module_completed" | "streak_milestone" | "mastery_milestone";
  entityId: string;
  xpAwarded: number;
  awardedAt: string;
}

export interface TargetedDrillQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
}

export interface AIRepairResponse {
  diagnosis: string;
  rootMisconception: string;
  mentalModelMetaphor: string;
  counterExample: string;
  quickCheckQuestion: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
  stepByStepGuide?: string[];
  secondaryQuestion?: TargetedDrillQuestion;
}

export interface AIExplainResponse {
  overview: string;
  commonPitfall: string;
  coreRule: string;
  practicalExample: string;
}

export interface PracticeAttempt {
  id?: string;
  userId: string;
  course: string;
  moduleId: string;
  moduleTitle: string;
  topic: string;
  questionId: string;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  difficulty: string;
  sessionId: string;
  attemptNumber: number;
  sessionMode: "queue" | "targeted" | "repair";
  conceptFilter?: string;
  answeredAt: string;
  createdAt: string;
}

export interface LearningContext {
  currentCourse?: string;
  currentModule?: string;
  currentTopic?: string;
  weakConcepts?: { id: string; title: string; accuracy: number; mistakesCount: number }[];
  masteredConcepts?: string[];
  recentAttempts?: {
    moduleTitle: string;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    answeredAt: string;
  }[];
  overallMastery?: number;
  currentStreak?: number;
  safetyStreakWeeks?: number;
}

export interface TutorChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    actionType: "practice" | "repair" | "explain";
    conceptId?: string;
  };
}
