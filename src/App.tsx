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
import { getLocalLeaderboard, getLocalSettings, clearLocalPlayerSession, clearAllLocalQuizData } from "./lib/quizStorage";
import { clearDeviceTracking } from "./lib/deviceTracker";

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

  const handleClearPlayerSession = useCallback(() => {
    setCurrentPlayer(null);
    clearLocalPlayerSession();
    clearDeviceTracking();
  }, []);

  // Real-time WebSocket hook with reset handlers
  const {
    gameState,
    timeRemaining,
    isConnected,
    registerPlayer,
    submitAnswer,
    refreshState,
  } = useRealtimeQuiz(currentPlayer?.id, setCurrentPlayer, handleClearPlayerSession);

  // Fetch full Leaderboard and system settings with static fallback
  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    let loadedLeaderboard = false;
    let loadedSettings = false;

    try {
      const lbRes = await fetch("/api/leaderboard");
      const contentType = lbRes.headers.get("content-type");
      if (lbRes.ok && contentType && contentType.includes("application/json")) {
        const lbData = await lbRes.json();
        const incomingLeaderboard = lbData.leaderboard || [];
        setLeaderboardData(incomingLeaderboard);
        setTotalParticipants(lbData.totalParticipants || incomingLeaderboard.length || 0);
        loadedLeaderboard = true;

        // If database is empty on server, ensure stale player is cleared
        if (incomingLeaderboard.length === 0) {
          handleClearPlayerSession();
        }
      }
    } catch (err) {
      // Offline fallback
    }

    try {
      const settingsRes = await fetch("/api/settings");
      const contentType = settingsRes.headers.get("content-type");
      if (settingsRes.ok && contentType && contentType.includes("application/json")) {
        const sData = await settingsRes.json();
        if (sData.settings?.adminEntryEnabled !== undefined) {
          setAdminEntryEnabled(Boolean(sData.settings.adminEntryEnabled));
        }
        loadedSettings = true;
      }
    } catch (err) {
      // Offline fallback
    }

    // Static hosting fallback (InfinityFree / GitHub Pages)
    if (!loadedLeaderboard) {
      const localLb = getLocalLeaderboard();
      setLeaderboardData(localLb);
      setTotalParticipants(localLb.length);
      if (localLb.length === 0) {
        handleClearPlayerSession();
      }
    }
    if (!loadedSettings) {
      const localSettings = getLocalSettings();
      setAdminEntryEnabled(localSettings.adminEntryEnabled !== false);
    }

    setIsRefreshing(false);
  }, [handleClearPlayerSession]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Sync leaderboard when WebSocket broadcasts updates
  useEffect(() => {
    if (gameState.leaderboard) {
      setLeaderboardData(gameState.leaderboard);
      setTotalParticipants(gameState.leaderboard.length);

      // If leaderboard is reset to empty, clear player session
      if (gameState.leaderboard.length === 0 && currentPlayer) {
        handleClearPlayerSession();
      }
    }
  }, [gameState.leaderboard, currentPlayer, handleClearPlayerSession]);

  // Update current player state if present in server leaderboard
  useEffect(() => {
    if (currentPlayer && gameState.leaderboard && gameState.leaderboard.length > 0) {
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
      throw err;
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
            currentPlayer={currentPlayer}
            gameState={gameState}
            onJoinGame={handleJoinMatch}
            onJoinQuiz={handleJoinMatch}
            onStartPlaying={() => setCurrentView("quiz")}
            onViewLeaderboard={() => setCurrentView("leaderboard")}
            onClearPlayerSession={handleClearPlayerSession}
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
            onClearPlayerSession={handleClearPlayerSession}
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

