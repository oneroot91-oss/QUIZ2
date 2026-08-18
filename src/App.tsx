import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { LandingPage } from "./components/LandingPage";
import { QuizPage } from "./components/QuizPage";
import { CompletionPage } from "./components/CompletionPage";
import { LeaderboardPage } from "./components/LeaderboardPage";
import { AdminPanel } from "./components/AdminPanel";
import { AdminLoginModal } from "./components/AdminLoginModal";
import { useRealtimeQuiz } from "./hooks/useRealtimeQuiz";
import { Player, LeaderboardEntry } from "./types";
import { Lock } from "lucide-react";

export default function App() {
  const [currentView, setCurrentView] = useState<"landing" | "quiz" | "completion" | "leaderboard" | "admin">("landing");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [adminEntryEnabled, setAdminEntryEnabled] = useState<boolean>(true);

  // Admin Auth State
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);

  // Current registered player state
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(() => {
    try {
      const savedId = localStorage.getItem("onam_quiz_player_id");
      const savedName = localStorage.getItem("onam_quiz_player_name");
      if (savedId && savedName) {
        return {
          id: savedId,
          name: savedName,
          totalScore: 0,
          correctCount: 0,
          answeredCount: 0,
          answers: {},
          lastActive: Date.now(),
          isOnline: true,
        };
      }
    } catch (e) {}
    return null;
  });

  // Real-time WebSocket hook
  const {
    gameState,
    timeRemaining,
    isConnected,
    registerPlayer,
    submitAnswer,
    refreshState,
  } = useRealtimeQuiz(currentPlayer?.id);

  // Fetch full Leaderboard and system settings from REST API
  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const lbRes = await fetch("/api/leaderboard");
      if (lbRes.ok) {
        const contentType = lbRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const lbData = await lbRes.json();
          setLeaderboardData(lbData.leaderboard || []);
          setTotalParticipants(lbData.totalParticipants || lbData.leaderboard?.length || 0);
        }
      }

      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) {
        const contentType = settingsRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const sData = await settingsRes.json();
          if (sData.settings?.adminEntryEnabled !== undefined) {
            setAdminEntryEnabled(Boolean(sData.settings.adminEntryEnabled));
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch quiz leaderboard:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Sync leaderboard when WebSocket broadcasts updates
  useEffect(() => {
    if (gameState.leaderboard && gameState.leaderboard.length > 0) {
      setLeaderboardData(gameState.leaderboard);
      setTotalParticipants(gameState.leaderboard.length);
    }
  }, [gameState.leaderboard]);

  // Update current player state if present in server leaderboard
  useEffect(() => {
    if (currentPlayer && gameState.leaderboard) {
      const updated = gameState.leaderboard.find((p) => p.id === currentPlayer.id);
      if (updated) {
        setCurrentPlayer((prev) => (prev ? { ...prev, ...updated } : prev));
      }
    }
  }, [gameState.leaderboard, currentPlayer?.id]);

  // Automatic match navigation when game is active or finishes
  useEffect(() => {
    if (gameState.status === "game_over" && currentView === "quiz") {
      setCurrentView("completion");
    }
  }, [gameState.status, currentView]);

  // Navigation handler
  const handleNavigate = (view: "landing" | "leaderboard" | "admin") => {
    if (view === "admin") {
      if (currentView === "admin" && adminPassword) {
        return;
      }
      setShowAdminLoginModal(true);
      return;
    }

    if (currentView === "admin") {
      setAdminPassword("");
    }

    setCurrentView(view);
    fetchAllData();
  };

  const handleAdminLoginSuccess = (pwd: string) => {
    setAdminPassword(pwd);
    setCurrentView("admin");
    fetchAllData();
  };

  // Join match from Landing Page
  const handleJoinMatch = async (name: string) => {
    try {
      const player = await registerPlayer(name);
      if (player) {
        setCurrentPlayer(player);
        try {
          localStorage.setItem("onam_quiz_player_id", player.id);
          localStorage.setItem("onam_quiz_player_name", player.name);
        } catch (e) {}
        setCurrentView("quiz");
      }
    } catch (err) {
      console.error("Registration error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-amber-400 selection:text-amber-950">
      {/* Real-time Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        totalSubmissions={totalParticipants}
        onRefresh={() => {
          fetchAllData();
          refreshState();
        }}
        isRefreshing={isRefreshing}
        isAdminLoggedIn={Boolean(adminPassword)}
        adminEntryEnabled={adminEntryEnabled}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {currentView === "landing" && (
          <LandingPage
            onJoinQuiz={handleJoinMatch}
            onViewLeaderboard={() => setCurrentView("leaderboard")}
            gameState={gameState}
            savedPlayerName={currentPlayer?.name}
          />
        )}

        {currentView === "quiz" && currentPlayer && (
          <QuizPage
            currentPlayer={currentPlayer}
            gameState={gameState}
            timeRemaining={timeRemaining}
            onSubmitAnswer={submitAnswer}
            onFinishQuiz={() => setCurrentView("completion")}
            onExitToLobby={() => setCurrentView("landing")}
          />
        )}

        {currentView === "completion" && currentPlayer && (
          <CompletionPage
            player={currentPlayer}
            leaderboard={leaderboardData}
            totalQuestions={gameState.totalQuestions || 15}
            onViewLeaderboard={() => setCurrentView("leaderboard")}
            onBackToHome={() => setCurrentView("landing")}
          />
        )}

        {currentView === "leaderboard" && (
          <LeaderboardPage
            leaderboardData={leaderboardData}
            totalParticipants={totalParticipants}
            onBackToQuiz={() => setCurrentView(currentPlayer ? "quiz" : "landing")}
            onRefresh={() => {
              fetchAllData();
              refreshState();
            }}
            isRefreshing={isRefreshing}
          />
        )}

        {currentView === "admin" && (
          <AdminPanel
            onBackToQuiz={() => setCurrentView("landing")}
            onRefreshAllData={() => {
              fetchAllData();
              refreshState();
            }}
            adminEntryEnabled={adminEntryEnabled}
          />
        )}
      </main>

      {/* Admin Password Modal */}
      <AdminLoginModal
        isOpen={showAdminLoginModal}
        onClose={() => setShowAdminLoginModal(false)}
        onLoginSuccess={handleAdminLoginSuccess}
        adminEntryEnabled={adminEntryEnabled}
      />

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 text-xs py-6 border-t border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-bold text-stone-300">
              Dr. P. Alikutty's Hospital • Onam Grand Quiz 2026 🌼
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Real-Time Individual Multiplayer Quiz with 20s Speed-Decay Scoring
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] flex-wrap justify-center">
            <span>Database: <code>data.json</code></span>
            <span>•</span>
            <span>WebSocket Live Engine</span>
            <span>•</span>
            <button
              onClick={() => handleNavigate("admin")}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 underline cursor-pointer"
              title="Admin Control Center"
            >
              <Lock className="w-3 h-3" /> Admin Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
