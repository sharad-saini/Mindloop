import React, { useState } from "react";
import { User, LogIn, LogOut, Check, X, Sparkles, Shield } from "lucide-react";
import type { UserProfile } from "../types";
import { signInAnonymously, signInWithPopup, signOut, googleProvider, auth } from "../lib/firebase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onUpdateDisplayName: (newName: string) => void;
  onSignOut?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onUpdateDisplayName,
  onSignOut,
}) => {
  const [nameInput, setNameInput] = useState(userProfile.displayName);
  const [isSaved, setIsSaved] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateDisplayName(nameInput.trim());
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setAuthError(err.message || "Google sign in was cancelled or failed.");
    }
  };

  const handleSignOut = async () => {
    try {
      if (onSignOut) {
        onSignOut();
      } else {
        await signOut(auth);
      }
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Learner Profile</h3>
            <p className="text-xs text-slate-400">Manage your sync identity & credentials</p>
          </div>
        </div>

        {authError && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
            {authError}
          </div>
        )}

        {/* Display Name Edit */}
        <form onSubmit={handleSaveName} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Display Name (Printed on Certificates)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors shrink-0"
              >
                {isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : "Save"}
              </button>
            </div>
          </div>
        </form>

        {/* Account Info */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Authentication Status:</span>
            <span className="text-indigo-300 font-semibold">
              {userProfile.email ? "Google Account" : "Anonymous Cloud Session"}
            </span>
          </div>
          {userProfile.email && (
            <div className="flex justify-between text-slate-400">
              <span>Email:</span>
              <span className="text-slate-200 font-mono">{userProfile.email}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-400">
            <span>Cloud Database:</span>
            <span className="text-emerald-400 font-semibold">Synced with Firestore</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Streak Freezes:</span>
            <span className="text-sky-400 font-bold">{userProfile.streakFreezes} active</span>
          </div>
        </div>

        {/* Google Sign In / Sign out */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          {!userProfile.email ? (
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-colors"
            >
              <LogIn className="w-4 h-4 text-indigo-400" />
              <span>Link with Google Account</span>
            </button>
          ) : (
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-800 text-xs font-semibold text-rose-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
