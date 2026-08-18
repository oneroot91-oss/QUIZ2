import React from "react";
import { Trophy, Home, Sparkles, RefreshCw, Lock, Shield } from "lucide-react";
import { PookkalamArt } from "./PookkalamArt";

interface HeaderProps {
  currentView: "landing" | "quiz" | "completion" | "leaderboard" | "admin";
  onNavigate: (view: "landing" | "leaderboard" | "admin") => void;
  totalSubmissions?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isAdminLoggedIn?: boolean;
  adminEntryEnabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  totalSubmissions = 0,
  onRefresh,
  isRefreshing = false,
  isAdminLoggedIn = false,
  adminEntryEnabled = true,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-amber-50 shadow-md border-b-2 border-amber-500/40">
      {/* Traditional Kasavu Gold Top Ribbon */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300"></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Hospital & Event Title */}
        <div
          onClick={() => onNavigate("landing")}
          className="flex items-center gap-3 cursor-pointer group"
          id="header-brand-logo"
        >
          <div className="relative">
            <PookkalamArt size={48} className="drop-shadow-md group-hover:scale-105 transition-transform" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-500/30">
                Dr. P. Alikutty's Hospital
              </span>
              <span className="hidden md:inline-flex items-center text-[10px] text-emerald-300 font-medium bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                <Sparkles className="w-2.5 h-2.5 mr-1 text-emerald-400" /> Onam Festival 2026
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-amber-100 flex items-center gap-1.5 mt-0.5">
              <span>Onam Grand Quiz Challenge</span>
              <span className="text-amber-300">🌼</span>
            </h1>
          </div>
        </div>

        {/* Navigation & Actions (Quiz Entry -> Leaderboard -> Admin Panel) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
          <button
            id="nav-quiz-home-btn"
            onClick={() => onNavigate("landing")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === "landing" || currentView === "quiz" || currentView === "completion"
                ? "bg-amber-400 text-amber-950 shadow-sm font-semibold"
                : "bg-amber-950/60 hover:bg-amber-900 text-amber-200 border border-amber-500/30"
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Quiz Entry</span>
          </button>

          <button
            id="nav-leaderboard-btn"
            onClick={() => onNavigate("leaderboard")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === "leaderboard"
                ? "bg-amber-400 text-amber-950 shadow-sm font-semibold"
                : "bg-amber-950/60 hover:bg-amber-900 text-amber-200 border border-amber-500/30"
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-300 group-hover:text-amber-100" />
            <span>Leaderboard</span>
            {totalSubmissions > 0 && (
              <span className="ml-1 bg-amber-900/90 text-amber-200 text-xs px-1.5 py-0.2 rounded-full border border-amber-400/40">
                {totalSubmissions}
              </span>
            )}
          </button>

          {/* Admin Panel Tab right after Leaderboard */}
          <button
            id="nav-admin-panel-btn"
            onClick={() => onNavigate("admin")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === "admin"
                ? "bg-amber-400 text-amber-950 shadow-sm font-bold"
                : !adminEntryEnabled && !isAdminLoggedIn
                ? "bg-stone-900/60 hover:bg-stone-900 text-stone-400 border border-stone-700/50 opacity-80"
                : "bg-stone-900/80 hover:bg-stone-800 text-amber-300 border border-amber-500/40"
            }`}
            title={
              !adminEntryEnabled && !isAdminLoggedIn
                ? "Admin Entry Page is currently turned OFF by administrator"
                : "Admin Control Panel (Protected with password)"
            }
          >
            {isAdminLoggedIn ? (
              <Shield className="w-4 h-4 text-amber-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>Admin Panel</span>
            {!adminEntryEnabled && !isAdminLoggedIn && (
              <span className="text-[10px] bg-red-950/80 text-red-300 px-1.5 py-0.2 rounded border border-red-500/40 font-mono">
                OFF
              </span>
            )}
          </button>

          {onRefresh && (
            <button
              id="header-refresh-btn"
              onClick={onRefresh}
              title="Refresh quiz stats"
              className="p-2 rounded-lg bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-200" : ""}`} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
