import React, { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  addDoc, 
  query, 
  where 
} from "firebase/firestore";
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signInAnonymously, 
  type User 
} from "./lib/firebase";
import { DEFAULT_TRACKS } from "./data/tracks";
import { calculateSM2, isDueToday, calculateUpdatedStreak } from "./lib/spacedRepetition";
import type { 
  UserProfile, 
  LearningTrack, 
  Concept, 
  SpacedRepetitionProgress, 
  ConceptRepairRecord, 
  MasteryCertificate,
  PracticeAttempt,
  LearningContext,
  Question
} from "./types";
import { claimIdempotentXP, computeOverallMasteryScore } from "./lib/learningService";

import { Navbar } from "./components/Navbar";
import { DailyQueueView } from "./components/DailyQueueView";
import { TracksView } from "./components/TracksView";
import { ConceptRepairLabView } from "./components/ConceptRepairLabView";
import { CertificatesView } from "./components/CertificatesView";
import { StatsRetentionView } from "./components/StatsRetentionView";
import { CustomTrackModal } from "./components/CustomTrackModal";
import { AiExplainModal } from "./components/AiExplainModal";
import { AuthModal } from "./components/AuthModal";
import { AiTutorDrawer } from "./components/AiTutorDrawer";
import { NextModuleUnlockBanner } from "./components/NextModuleUnlockBanner";

export const App: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<"queue" | "tracks" | "repair" | "certificates" | "stats">("queue");

  // User & Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    userId: "guest",
    displayName: "Guest Learner",
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: new Date().toISOString(),
    streakFreezes: 1,
    createdAt: new Date().toISOString(),
  });

  // Curriculum & Progress
  const [tracks, setTracks] = useState<LearningTrack[]>(DEFAULT_TRACKS);
  const [progressMap, setProgressMap] = useState<Record<string, SpacedRepetitionProgress>>({});
  const [repairRecords, setRepairRecords] = useState<ConceptRepairRecord[]>([]);
  const [certificates, setCertificates] = useState<MasteryCertificate[]>([]);
  const [targetedConcept, setTargetedConcept] = useState<{ concept: Concept; track: LearningTrack } | null>(null);

  // Modals & Drawers
  const [isCustomTrackOpen, setIsCustomTrackOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [aiExplainConcept, setAiExplainConcept] = useState<{ concept: Concept; track: LearningTrack } | null>(null);
  const [isAiTutorOpen, setIsAiTutorOpen] = useState(false);
  const [aiTutorInitialConcept, setAiTutorInitialConcept] = useState<string | undefined>(undefined);
  const [nextModuleUnlock, setNextModuleUnlock] = useState<{
    isVisible: boolean;
    completedTitle: string;
    nextConcept: { concept: Concept; track: LearningTrack };
  } | null>(null);

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadUserData(user);
      } else {
        // Auto-sign in anonymously for instant zero-friction persistence
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.warn("Anonymous sign-in fallback:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Load Firestore Data for the User
  const loadUserData = async (user: User) => {
    try {
      // User Profile Doc
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        setUserProfile(data);
      } else {
        // Initialize default profile
        const initialProfile: UserProfile = {
          userId: user.uid,
          displayName: user.displayName || (user.isAnonymous ? "Guest Learner" : "MindLoop Scholar"),
          isAnonymous: user.isAnonymous,
          xp: 0,
          level: 1,
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: new Date().toISOString(),
          streakFreezes: 1,
          createdAt: new Date().toISOString(),
          ...(user.email ? { email: user.email } : {}),
          ...(user.photoURL ? { photoURL: user.photoURL } : {}),
        };
        await setDoc(userDocRef, initialProfile);
        setUserProfile(initialProfile);
      }

      // Load Progress Subcollection (actual user practice state)
      const progressColRef = collection(db, "users", user.uid, "progress");
      const progressSnap = await getDocs(progressColRef);
      const pMap: Record<string, SpacedRepetitionProgress> = {};
      progressSnap.forEach(doc => {
        const p = doc.data() as SpacedRepetitionProgress;
        pMap[p.conceptId] = p;
      });
      setProgressMap(pMap);

      // Load Repairs Subcollection (only real user repair logs)
      const repairsColRef = collection(db, "users", user.uid, "repairs");
      const repairsSnap = await getDocs(repairsColRef);
      const reps: ConceptRepairRecord[] = [];
      repairsSnap.forEach(doc => {
        reps.push({ id: doc.id, ...doc.data() } as ConceptRepairRecord);
      });
      setRepairRecords(reps);

      // Load Certificates
      const certColRef = collection(db, "certificates");
      const certSnap = await getDocs(query(certColRef, where("userId", "==", user.uid)));
      const certList: MasteryCertificate[] = [];
      certSnap.forEach(doc => {
        certList.push(doc.data() as MasteryCertificate);
      });
      setCertificates(certList);

      // Load Custom Tracks
      const customTracksRef = collection(db, "customTracks");
      const customTracksSnap = await getDocs(customTracksRef);
      const cTracks: LearningTrack[] = [];
      customTracksSnap.forEach(doc => {
        cTracks.push(doc.data() as LearningTrack);
      });
      if (cTracks.length > 0) {
        setTracks([...DEFAULT_TRACKS, ...cTracks]);
      }
    } catch (error) {
      console.warn("Data load warning:", error);
    }
  };

  // 3. Compute Due Cards for Active Recall
  const dueCards = useMemo(() => {
    const list: { concept: Concept; track: LearningTrack; progress?: SpacedRepetitionProgress }[] = [];

    tracks.forEach(track => {
      track.concepts.forEach(concept => {
        const p = progressMap[concept.id];
        if (!p || isDueToday(p.nextReviewDate) || p.needsRepair) {
          list.push({ concept, track, progress: p });
        }
      });
    });

    return list;
  }, [tracks, progressMap]);

  // Count concepts needing repair
  const repairCount = useMemo(() => {
    const list = Object.values(progressMap) as SpacedRepetitionProgress[];
    return list.filter(p => p.needsRepair).length;
  }, [progressMap]);

  // Compute weak concepts for AI Tutor context
  const weakConceptsList = useMemo(() => {
    const list: { conceptId: string; title: string; accuracy: number; misconception?: string }[] = [];
    tracks.forEach(track => {
      track.concepts.forEach(concept => {
        const p = progressMap[concept.id];
        if (p && (p.needsRepair || (p.totalAttempts >= 2 && Math.round((p.correctAttempts / p.totalAttempts) * 100) < 70))) {
          const acc = p.totalAttempts > 0 ? Math.round((p.correctAttempts / p.totalAttempts) * 100) : 0;
          list.push({
            id: concept.id,
            title: concept.title,
            accuracy: acc,
            mistakesCount: p.totalAttempts - p.correctAttempts,
            misconception: p.lastMisconception || concept.summary
          });
        }
      });
    });
    return list;
  }, [tracks, progressMap]);

  // Unified learning context with Overall Mastery across all tracks
  const learningContext: LearningContext = useMemo(() => {
    const overallMastery = computeOverallMasteryScore(tracks, progressMap);
    return {
      currentCourse: targetedConcept?.track.title || tracks[0]?.title || "Computer Science",
      currentTopic: targetedConcept?.concept.title || "Adaptive Topology",
      overallMastery,
      currentStreak: userProfile.currentStreak,
      weakConcepts: weakConceptsList,
      recentAttempts: []
    };
  }, [tracks, progressMap, targetedConcept, userProfile.currentStreak, weakConceptsList]);

  const handleOpenAiTutor = (conceptTitle?: string) => {
    setAiTutorInitialConcept(conceptTitle);
    setIsAiTutorOpen(true);
  };

  const handleOpenAiTutorWithContext = (concept: Concept, question: Question, userWrongAnswer: string) => {
    const qText = question.prompt || question.question || "this active recall question";
    const prompt = `I need help understanding "${concept.title}". On the question "${qText}", I answered "${userWrongAnswer}". What mental model helps explain why that was mistaken?`;
    setAiTutorInitialConcept(prompt);
    setIsAiTutorOpen(true);
  };

  // 4. Update Profile XP & Streak
  const addXP = async (amount: number, authoritativeXp?: number) => {
    const streakUpdate = calculateUpdatedStreak(
      userProfile.currentStreak,
      userProfile.lastActiveDate,
      userProfile.streakFreezes
    );
    const newXp = authoritativeXp ?? userProfile.xp + amount;
    const newLevel = Math.floor(newXp / 100) + 1;
    const updatedProfile: UserProfile = {
      ...userProfile,
      xp: newXp,
      level: newLevel,
      currentStreak: streakUpdate.newStreak,
      longestStreak: Math.max(userProfile.longestStreak, streakUpdate.newStreak),
      streakFreezes: streakUpdate.freezesRemaining,
      lastActiveDate: new Date().toISOString(),
    };

    setUserProfile(updatedProfile);
    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid), updatedProfile, { merge: true });
      } catch (e) {
        console.warn("Could not sync profile XP:", e);
      }
    }
  };

  // 5. Handle Card Reviewed in Active Recall
  const handleCardReviewed = async (
    conceptId: string, 
    trackId: string, 
    quality: number,
    misconception?: string
  ) => {
    const currentProgress = progressMap[conceptId] || {
      userId: currentUser?.uid || "guest",
      conceptId,
      trackId,
      masteryLevel: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      nextReviewDate: new Date().toISOString(),
      totalAttempts: 0,
      correctAttempts: 0,
      retentionScore: 60,
      needsRepair: false
    };

    const sm2 = calculateSM2(currentProgress, quality);

    const newTotalAttempts = currentProgress.totalAttempts + 1;
    const isCorrect = quality >= 3;
    const newCorrectAttempts = isCorrect ? currentProgress.correctAttempts + 1 : currentProgress.correctAttempts;
    const accuracy = Math.round((newCorrectAttempts / newTotalAttempts) * 100);
    const conceptNeedsRepair = (accuracy < 70 && newTotalAttempts >= 2) || sm2.needsRepair;

    const updated: SpacedRepetitionProgress = {
      ...currentProgress,
      masteryLevel: sm2.masteryLevel,
      easeFactor: sm2.easeFactor,
      intervalDays: sm2.intervalDays,
      repetitions: sm2.repetitions,
      nextReviewDate: sm2.nextReviewDate,
      lastReviewedDate: new Date().toISOString(),
      totalAttempts: newTotalAttempts,
      correctAttempts: newCorrectAttempts,
      retentionScore: sm2.retentionScore,
      needsRepair: conceptNeedsRepair,
      lastMisconception: misconception || currentProgress.lastMisconception
    };

    setProgressMap(prev => ({
      ...prev,
      [conceptId]: updated
    }));

    // Grant XP via idempotent ledger (awards XP only once for same question attempt)
    const activeUserId = currentUser?.uid || userProfile.userId || "guest";
    const rewardRes = await claimIdempotentXP(
      activeUserId,
      "question_first_correct",
      `${conceptId}_att_${newTotalAttempts}`,
      isCorrect ? 20 : 10,
      `Active recall on ${conceptId}`
    );
    if (rewardRes.awarded) {
      await addXP(rewardRes.xpAwarded, rewardRes.newTotalXP);
    }

    const matchedTrack = tracks.find(t => t.id === trackId);
    const matchedConcept = matchedTrack?.concepts.find(c => c.id === conceptId);

    // Trigger next module unlock animation if there is an adjacent concept in the curriculum
    if (matchedTrack && matchedConcept) {
      const cIdx = matchedTrack.concepts.findIndex(c => c.id === conceptId);
      if (cIdx >= 0 && cIdx + 1 < matchedTrack.concepts.length) {
        const nextC = matchedTrack.concepts[cIdx + 1];
        setNextModuleUnlock({
          isVisible: true,
          completedTitle: matchedConcept.title,
          nextConcept: { concept: nextC, track: matchedTrack }
        });
      }
    }

    // Persist in Firestore
    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "progress", conceptId), updated);

        // Record granular practice attempt for comprehensive mastery tracking
        const attemptRef = doc(collection(db, "practiceAttempts"));

        const attemptRecord: PracticeAttempt = {
          id: attemptRef.id,
          userId: currentUser.uid,
          course: matchedTrack?.title || trackId,
          moduleId: conceptId,
          moduleTitle: matchedConcept?.title || conceptId,
          topic: matchedTrack?.category || "Computer Science",
          questionId: `q-${conceptId}-${Date.now()}`,
          question: matchedConcept?.questions[0]?.question || "Active recall evaluation",
          selectedAnswer: isCorrect ? "Accurate answer" : "Incorrect response",
          correctAnswer: matchedConcept?.questions[0]?.options[matchedConcept.questions[0].correctIndex] || "Accurate answer",
          isCorrect,
          difficulty: quality >= 5 ? "Easy" : quality === 4 ? "Good" : "Hard",
          sessionId: `session-${Date.now().toString(36)}`,
          attemptNumber: newTotalAttempts,
          sessionMode: "queue",
          answeredAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        await setDoc(attemptRef, attemptRecord);
      } catch (e) {
        console.warn("Could not sync progress or attempt:", e);
      }
    }
  };

  // Sign out resets in-memory learner state so the fresh anonymous session starts at 0%
  const handleSignOut = async () => {
    try {
      setProgressMap({});
      setRepairRecords([]);
      setCertificates([]);
      setTargetedConcept(null);
      setUserProfile({
        userId: "guest",
        displayName: "Guest Learner",
        xp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: new Date().toISOString(),
        streakFreezes: 1,
        createdAt: new Date().toISOString(),
      });
      await auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    }
  };

  // 6. Handle Concept Repair Completed
  const handleRepairCompleted = async (
    conceptId: string,
    trackId: string,
    conceptTitle: string,
    misconception: string,
    keyInsight: string,
    score: number
  ) => {
    const currentProgress = progressMap[conceptId];
    if (currentProgress) {
      const updatedProgress: SpacedRepetitionProgress = {
        ...currentProgress,
        needsRepair: false,
        masteryLevel: Math.min(5, currentProgress.masteryLevel + 1),
        lastMisconception: undefined,
        lastReviewedDate: new Date().toISOString()
      };

      setProgressMap(prev => ({
        ...prev,
        [conceptId]: updatedProgress
      }));

      if (currentUser) {
        try {
          await setDoc(doc(db, "users", currentUser.uid, "progress", conceptId), updatedProgress);
        } catch (e) {}
      }
    }

    const newRecord: ConceptRepairRecord = {
      id: `repair-${Date.now()}`,
      userId: currentUser?.uid || "guest",
      conceptId,
      trackId,
      conceptTitle,
      misconception,
      keyInsight,
      repairedAt: new Date().toISOString(),
      drillScore: score
    };

    setRepairRecords(prev => [newRecord, ...prev]);

    // Grant +35 XP for cognitive repair idempotently
    const repairReward = await claimIdempotentXP(
      currentUser?.uid || userProfile.userId || "guest",
      "repair_completed",
      conceptId,
      35,
      `Cognitive repair on ${conceptTitle}`
    );
    if (repairReward.awarded) {
      await addXP(repairReward.xpAwarded, repairReward.newTotalXP);
    }

    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid, "repairs", newRecord.id), newRecord);
      } catch (e) {
        console.warn("Could not save repair log:", e);
      }
    }
  };

  // 7. Handle Issuing Mastery Certificate
  const handleIssueCertificate = async (track: LearningTrack, score: number) => {
    const certCode = `ML-${new Date().getFullYear()}-${track.id.replace("track-", "").toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const newCert: MasteryCertificate = {
      certificateId: `cert-${Date.now()}`,
      userId: currentUser?.uid || "guest",
      userName: userProfile.displayName,
      trackId: track.id,
      trackTitle: track.title,
      issuedAt: new Date().toISOString(),
      verificationCode: certCode,
      masteryScore: score,
      conceptsCount: track.concepts.length
    };

    setCertificates(prev => [newCert, ...prev]);

    // Grant +100 XP for certificate issuance idempotently
    const certReward = await claimIdempotentXP(
      currentUser?.uid || userProfile.userId || "guest",
      "mastery_milestone",
      track.id,
      100,
      `Mastery certificate for ${track.title}`
    );
    if (certReward.awarded) {
      await addXP(certReward.xpAwarded, certReward.newTotalXP);
    }

    try {
      await setDoc(doc(db, "certificates", newCert.certificateId), newCert);
    } catch (e) {
      console.warn("Could not issue certificate to Firestore:", e);
    }
  };

  // 8. Handle Creating Custom Track
  const handleTrackCreated = async (newTrack: LearningTrack) => {
    setTracks(prev => [...prev, newTrack]);
    try {
      await setDoc(doc(db, "customTracks", newTrack.id), newTrack);
    } catch (e) {
      console.warn("Could not save custom track to Firestore:", e);
    }
  };

  // 9. Use Streak Freeze
  const handleUseStreakFreeze = async () => {
    if (userProfile.streakFreezes <= 0) return;
    const updated = {
      ...userProfile,
      streakFreezes: userProfile.streakFreezes - 1
    };
    setUserProfile(updated);
    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid), updated, { merge: true });
      } catch (e) {}
    }
  };

  // 10. Update Display Name
  const handleUpdateDisplayName = async (newName: string) => {
    const updated = {
      ...userProfile,
      displayName: newName
    };
    setUserProfile(updated);
    if (currentUser) {
      try {
        await setDoc(doc(db, "users", currentUser.uid), updated, { merge: true });
      } catch (e) {}
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex flex-col md:flex-row selection:bg-indigo-500 selection:text-white">
      {/* Bento Grid Sidebar Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        userProfile={userProfile}
        dueCount={dueCards.length}
        repairCount={repairCount}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
        onCreateCustomTrack={() => setIsCustomTrackOpen(true)}
        onOpenAiTutor={() => handleOpenAiTutor()}
      />

      {/* Main Bento Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#020617]">
        {/* Bento Top Header from Design HTML */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-[#020617]/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3 text-xs sm:text-sm font-medium truncate">
            <span className="text-slate-500 hidden sm:inline">Current Course:</span>
            <span className="text-white font-semibold truncate">
              {tracks[0]?.title || "Data Structures & Systems"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-full border border-slate-700/60">
              <span className="text-xs text-slate-400">🔥 Streak:</span>
              <span className="text-xs font-bold text-orange-400">{userProfile.currentStreak} Days</span>
            </div>

            <button
              onClick={() => setIsAuthOpen(true)}
              className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-slate-700 flex items-center justify-center font-bold text-xs text-white shadow hover:scale-105 transition-transform"
              title="Open Profile"
            >
              {userProfile.displayName ? userProfile.displayName.slice(0, 2).toUpperCase() : "ML"}
            </button>
          </div>
        </header>

        {/* Main App Body */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === "queue" && (
            <DailyQueueView
              dueCards={dueCards}
              allTracks={tracks}
              progressMap={progressMap}
              userProfile={userProfile}
              repairRecords={repairRecords}
              certificates={certificates}
              targetedConcept={targetedConcept}
              onClearTargetedConcept={() => setTargetedConcept(null)}
              onCardReviewed={handleCardReviewed}
              onRepairCompleted={handleRepairCompleted}
              onNavigateToTracks={() => setActiveTab("tracks")}
              onUseStreakFreeze={handleUseStreakFreeze}
              onOpenAiTutor={handleOpenAiTutorWithContext}
            />
          )}

          {activeTab === "tracks" && (
            <TracksView
              tracks={tracks}
              progressMap={progressMap}
              onStartConceptPractice={(concept, track) => {
                setTargetedConcept({ concept, track });
                setActiveTab("queue");
              }}
              onOpenConceptRepair={(concept, track) => {
                setTargetedConcept({ concept, track });
                setActiveTab("repair");
              }}
              onRepair={(concept, track) => {
                setTargetedConcept({ concept, track });
                setActiveTab("repair");
              }}
              onCreateCustomTrack={() => setIsCustomTrackOpen(true)}
              onAskAiExplain={(concept, track) => {
                setAiExplainConcept({ concept, track });
              }}
            />
          )}

          {activeTab === "repair" && (
            <ConceptRepairLabView
              repairRecords={repairRecords}
              allTracks={tracks}
              progressMap={progressMap}
              targetedConcept={targetedConcept}
              onClearTargetedConcept={() => setTargetedConcept(null)}
              onRepairCompleted={handleRepairCompleted}
              onNavigateToTracks={() => setActiveTab("tracks")}
            />
          )}

          {activeTab === "certificates" && (
            <CertificatesView
              certificates={certificates}
              tracks={tracks}
              progressMap={progressMap}
              userName={userProfile.displayName}
              onIssueCertificate={handleIssueCertificate}
            />
          )}

          {activeTab === "stats" && (
            <StatsRetentionView
              userProfile={userProfile}
              progressMap={progressMap}
              tracks={tracks}
              onUseStreakFreeze={handleUseStreakFreeze}
            />
          )}
        </main>

        {/* Bento Footer */}
        <footer className="border-t border-slate-800/80 bg-[#020617] py-4 px-6 text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400">MindLoop</span>
              <span>•</span>
              <span>Adaptive Micro-Learning & Concept Repair</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 text-[11px]">
              <span>Bento Architecture</span>
              <span>•</span>
              <span>SM-2 & Gemini AI</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Auxiliary Modals */}
      <CustomTrackModal
        isOpen={isCustomTrackOpen}
        onClose={() => setIsCustomTrackOpen(false)}
        onTrackCreated={handleTrackCreated}
        authorId={currentUser?.uid || "guest"}
        authorName={userProfile.displayName}
      />

      <AiExplainModal
        isOpen={aiExplainConcept !== null}
        onClose={() => setAiExplainConcept(null)}
        concept={aiExplainConcept?.concept || null}
        track={aiExplainConcept?.track || null}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        userProfile={userProfile}
        onUpdateDisplayName={handleUpdateDisplayName}
        onSignOut={handleSignOut}
      />

      {/* Socratic AI Tutor Interactive Drawer */}
      <AiTutorDrawer
        isOpen={isAiTutorOpen}
        onClose={() => setIsAiTutorOpen(false)}
        learningContext={learningContext}
        initialConceptTitle={aiTutorInitialConcept}
        onStartRepair={(conceptId) => {
          setIsAiTutorOpen(false);
          for (const t of tracks) {
            const found = t.concepts.find(c => c.id === conceptId || c.title.toLowerCase() === conceptId.toLowerCase());
            if (found) {
              setTargetedConcept({ concept: found, track: t });
              setActiveTab("repair");
              break;
            }
          }
        }}
        onStartPractice={(conceptId) => {
          setIsAiTutorOpen(false);
          for (const t of tracks) {
            const found = t.concepts.find(c => c.id === conceptId || c.title.toLowerCase() === conceptId.toLowerCase());
            if (found) {
              setTargetedConcept({ concept: found, track: t });
              setActiveTab("queue");
              break;
            }
          }
        }}
      />

      {/* Next Module Unlock Celebration & Progression Banner */}
      <NextModuleUnlockBanner
        isVisible={nextModuleUnlock?.isVisible ?? false}
        completedConceptTitle={nextModuleUnlock?.completedTitle ?? ""}
        nextConcept={nextModuleUnlock?.nextConcept.concept ?? null}
        nextTrack={nextModuleUnlock?.nextConcept.track ?? null}
        onContinueNext={(concept, track) => {
          setNextModuleUnlock(null);
          setTargetedConcept({ concept, track });
          setActiveTab("queue");
        }}
        onDismiss={() => setNextModuleUnlock(null)}
      />
    </div>
  );
};

export default App;
