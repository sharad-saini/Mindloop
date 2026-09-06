import React, { useState } from "react";
import { 
  Flame, 
  Sparkles, 
  Brain, 
  ShieldCheck, 
  BookOpen, 
  RotateCcw, 
  Award, 
  BarChart3,
  User,
  LogOut,
  Plus,
  Menu,
  X,
  Layers,
  LayoutDashboard
} from "lucide-react";
import type { UserProfile } from "../types";

interface NavbarProps {
  activeTab: "queue" | "tracks" | "repair" | "certificates" | "stats";
  onSelectTab: (tab: "queue" | "tracks" | "repair" | "certificates" | "stats") => void;
  userProfile: UserProfile;
  dueCount: number;
  repairCount: number;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onCreateCustomTrack: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  userProfile,
  dueCount,
  repairCount,
  onOpenAuth,
  onSignOut,
  onCreateCustomTrack,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentLevel = userProfile.level;
  const currentXp = userProfile.xp;
  const xpInCurrentLevel = currentXp % 100;
  const xpPercent = Math.min(100, Math.round((xpInCurrentLevel / 100) * 100));

  const navItems: {
    id: "queue" | "tracks" | "repair" | "certificates" | "stats";
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: "queue",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: dueCount,
      badgeColor: "bg-indigo-500 text-white",
    },
    {
      id: "tracks",
      label: "My Courses",
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: "repair",
      label: "Repair Lab",
      icon: <Brain className="w-4 h-4 text-rose-400" />,
      badge: repairCount,
      badgeColor: "bg-rose-500 text-white",
    },
    {
      id: "stats",
      label: "Progress",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: "certificates",
      label: "Certificates",
      icon: <Award className="w-4 h-4 text-amber-400" />,
    },
  ];

  const handleSelectTab = (tab: "queue" | "tracks" | "repair" | "certificates" | "stats") => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <div className="md:hidden flex items-center justify-between h-16 px-4 bg-[#020617] border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30">
            M
          </div>
          <span className="text-lg font-bold tracking-tight text-white uppercase">
            Mindloop
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-full border border-slate-700 text-xs text-slate-300"
          >
            <span>🔥</span>
            <span className="font-bold text-orange-400">{userProfile.currentStreak}d</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#020617] border-b border-slate-800 p-4 space-y-2 sticky top-16 z-30">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-slate-800/80 text-indigo-400 border border-slate-700/60"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isActive ? (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  ) : (
                    <div className="w-2 h-2 shrink-0" />
                  )}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || "bg-indigo-600 text-white"}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={onCreateCustomTrack}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Track</span>
            </button>
            <button
              onClick={onOpenAuth}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Profile ({userProfile.displayName})
            </button>
          </div>
        </div>
      )}

      {/* Desktop Bento Sidebar (matches the Design HTML) */}
      <aside className="hidden md:flex w-64 border-r border-slate-800 bg-[#020617] flex-col py-6 shrink-0 sticky top-0 h-screen overflow-y-auto">
        {/* Brand Header */}
        <div className="px-6 mb-8">
          <button 
            onClick={() => onSelectTab("queue")}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              M
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white uppercase">
                Mindloop
              </span>
            </div>
          </button>
        </div>

        {/* Navigation Items with Bento Styling */}
        <nav className="flex-1 px-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                  isActive
                    ? "bg-slate-800/50 text-indigo-400 border border-slate-700/50 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isActive ? (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  ) : (
                    <div className="w-2 h-2 shrink-0 opacity-0" />
                  )}
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor || "bg-indigo-600 text-white"}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Action button */}
        <div className="px-4 mb-4">
          <button
            onClick={onCreateCustomTrack}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all hover:border-indigo-500/50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Custom Track</span>
          </button>
        </div>

        {/* Pro Plan / Mastery Widget Card from Design HTML */}
        <div className="px-4 mt-auto">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Level {currentLevel} Architect
              </div>
              <div className="text-[11px] font-mono text-indigo-400 font-bold">
                {currentXp} XP
              </div>
            </div>
            <div className="text-sm font-semibold text-white">
              Adaptive Mastery
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
              <span>{xpInCurrentLevel}/100 to Lv {currentLevel + 1}</span>
              <button 
                onClick={onOpenAuth}
                className="text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Profile
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
