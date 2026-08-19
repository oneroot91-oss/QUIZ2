import React, { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Play,
  RotateCcw,
  Users,
  Settings,
  HelpCircle,
  Trophy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Edit2,
  Plus,
  Save,
  Download,
  KeyRound,
  Eye,
  EyeOff,
  Clock,
  Zap,
  Flame,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck
} from "lucide-react";
import { Question, LeaderboardEntry, AppSettings } from "../types";
import { PookkalamArt } from "./PookkalamArt";
import { DEFAULT_QUESTIONS } from "../data/defaultQuestions";
import {
  loginAdminWithFallback,
  verifyPasscodeWithFallback,
  resetPasswordWithPasscodeWithFallback,
  setStoredAdminPassword,
  verifyAdminPasswordLocally,
} from "../lib/authStorage";
import {
  getLocalPlayers,
  saveLocalPlayers,
  getLocalQuestions,
  saveLocalQuestions,
  restoreDefaultLocalQuestions,
  getLocalSettings,
  saveLocalSettings,
  getLocalLeaderboard,
  getLocalGameState,
  saveLocalGameState,
  registerLocalPlayer,
} from "../lib/quizStorage";

interface AdminPanelProps {
  onBackToQuiz: () => void;
  onRefreshAllData: () => void;
  adminEntryEnabled: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onBackToQuiz,
  onRefreshAllData,
  adminEntryEnabled,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Login Recovery Flow states
  const [loginMode, setLoginMode] = useState<"login" | "forgot-passcode" | "set-new-password">("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [recoveryPasscode, setRecoveryPasscode] = useState("");
  const [showRecoveryPasscode, setShowRecoveryPasscode] = useState(false);
  const [recoveryPasscodeError, setRecoveryPasscodeError] = useState<string | null>(null);
  const [isVerifyingPasscode, setIsVerifyingPasscode] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Active Admin Tabs
  const [activeTab, setActiveTab] = useState<
    "game-master" | "participants" | "questions" | "settings" | "security"
  >("game-master");

  // Overview State
  const [players, setPlayers] = useState<any[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    quizEnabled: true,
    allowSubmissions: true,
    adminEntryEnabled: true,
    questionDuration: 20,
    maxPointsPerQuestion: 5,
    autoAdvance: true,
    autoAdvanceDelay: 6,
  });
  const [gameState, setGameState] = useState<any>({
    status: "lobby",
    currentQuestionIndex: 0,
    connectedPlayersCount: 0,
    answeredThisRoundCount: 0,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Action status toasts
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Participant edit state
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editPlayerName, setEditPlayerName] = useState("");
  const [editPlayerScore, setEditPlayerScore] = useState<number>(0);

  // Manual participant add
  const [manualName, setManualName] = useState("");
  const [manualScore, setManualScore] = useState(0);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);

  // Question edit state
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editQuestionData, setEditQuestionData] = useState<Partial<Question>>({});

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch admin data
  const fetchAdminOverview = async (pwd?: string) => {
    const authHeader = pwd || passwordInput;
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { "x-admin-password": authHeader },
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setPlayers(data.players || []);
        setQuestions(data.questions?.length ? data.questions : DEFAULT_QUESTIONS);
        setSettings(data.settings || settings);
        setGameState(data.gameState || gameState);
        setLeaderboard(data.leaderboard || []);
        return;
      }
    } catch (err) {
      // Offline fallback
    }

    // Fallback default state for static hosting (InfinityFree)
    const localQ = getLocalQuestions();
    const localP = getLocalPlayers();
    const localS = getLocalSettings();
    const localG = getLocalGameState();
    const localL = getLocalLeaderboard();

    setQuestions(localQ);
    setPlayers(localP);
    setSettings(localS);
    setGameState(localG);
    setLeaderboard(localL);
  };

  // Admin Login with robust fallback
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const result = await loginAdminWithFallback(passwordInput.trim());

      if (result.success) {
        setIsAuthenticated(true);
        fetchAdminOverview(passwordInput.trim());
        showToast("Admin access verified. Welcome to Game Master Control.");
      } else {
        setAuthError(result.error || "Incorrect admin password.");
      }
    } catch (err) {
      setAuthError("Could not verify password. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Login Page: Verify Master Recovery Passcode
  const handleVerifyPasscodeOnLoginPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryPasscode.trim()) {
      setRecoveryPasscodeError("Please enter the master recovery passcode.");
      return;
    }

    setIsVerifyingPasscode(true);
    setRecoveryPasscodeError(null);

    try {
      const result = await verifyPasscodeWithFallback(recoveryPasscode.trim());

      if (result.success) {
        setRecoveryPasscodeError(null);
        setLoginMode("set-new-password");
      } else {
        setRecoveryPasscodeError(result.error || "Incorrect recovery passcode.");
      }
    } catch (err) {
      if (recoveryPasscode.trim() === "0099887766") {
        setRecoveryPasscodeError(null);
        setLoginMode("set-new-password");
      } else {
        setRecoveryPasscodeError("Invalid passcode. Please enter the authorized recovery passcode (0099887766).");
      }
    } finally {
      setIsVerifyingPasscode(false);
    }
  };

  // Login Page: Reset Password with Verified Passcode
  const handleResetPasswordOnLoginPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetNewPassword.trim()) {
      setResetPasswordError("Please enter a new admin password.");
      return;
    }
    if (resetNewPassword.trim().length < 4) {
      setResetPasswordError("New password must be at least 4 characters long.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetPasswordError("Passwords do not match.");
      return;
    }

    setIsResettingPassword(true);
    setResetPasswordError(null);

    try {
      const result = await resetPasswordWithPasscodeWithFallback(
        recoveryPasscode.trim(),
        resetNewPassword.trim()
      );

      if (result.success) {
        showToast("Admin password reset successfully! Logging you in...", "success");
        setPasswordInput(resetNewPassword.trim());
        setIsAuthenticated(true);
        fetchAdminOverview(resetNewPassword.trim());
      } else {
        setResetPasswordError(result.error || "Failed to reset password.");
      }
    } catch (err) {
      // Fallback: If passcode is verified, succeed and save
      if (recoveryPasscode.trim() === "0099887766") {
        setStoredAdminPassword(resetNewPassword.trim());
        showToast("Admin password updated successfully! Logging you in...", "success");
        setPasswordInput(resetNewPassword.trim());
        setIsAuthenticated(true);
        fetchAdminOverview(resetNewPassword.trim());
      } else {
        setResetPasswordError("Failed to update password. Please check passcode.");
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  // -------------------------------------------------------------
  // Game Master Controls
  // -------------------------------------------------------------
  const handleGameAction = async (action: "start" | "next" | "previous" | "reveal" | "reset", payload?: any) => {
    try {
      const res = await fetch(`/api/admin/game/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify(payload || {}),
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        showToast(data.message || `Action ${action} executed successfully.`);
        fetchAdminOverview();
        onRefreshAllData();
        return;
      }
    } catch (err) {
      // Offline fallback
    }

    // Static hosting local state handler (InfinityFree)
    const currentQList = getLocalQuestions();
    const curState = getLocalGameState();
    const duration = settings.questionDuration || 20;

    if (action === "start") {
      curState.status = "question_active";
      curState.currentQuestionIndex = 0;
      curState.currentQuestion = currentQList[0] || null;
      curState.questionStartTime = Date.now();
      curState.questionDuration = duration;
      showToast("Quiz round started!");
    } else if (action === "next") {
      const nextIdx = curState.currentQuestionIndex + 1;
      if (nextIdx < currentQList.length) {
        curState.status = "question_active";
        curState.currentQuestionIndex = nextIdx;
        curState.currentQuestion = currentQList[nextIdx];
        curState.questionStartTime = Date.now();
        curState.questionDuration = duration;
        showToast(`Advanced to question ${nextIdx + 1}`);
      } else {
        curState.status = "game_over";
        showToast("Quiz completed! Showing final rankings.");
      }
    } else if (action === "previous") {
      const prevIdx = Math.max(0, curState.currentQuestionIndex - 1);
      curState.status = "question_active";
      curState.currentQuestionIndex = prevIdx;
      curState.currentQuestion = currentQList[prevIdx];
      curState.questionStartTime = Date.now();
      curState.questionDuration = duration;
      showToast(`Returned to question ${prevIdx + 1}`);
    } else if (action === "reveal") {
      curState.status = "question_review";
      showToast("Correct answer revealed.");
    } else if (action === "reset") {
      curState.status = "lobby";
      curState.currentQuestionIndex = 0;
      curState.currentQuestion = currentQList[0] || undefined;
      curState.questionStartTime = 0;
      showToast("Game master state reset to lobby.");
    }

    saveLocalGameState(curState);
    setGameState(curState);
    fetchAdminOverview();
    onRefreshAllData();
  };

  // -------------------------------------------------------------
  // Participant Manager Actions
  // -------------------------------------------------------------
  const handleSavePlayerEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/players/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({
          name: editPlayerName,
          totalScore: editPlayerScore,
        }),
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        showToast("Participant record updated.");
        setEditingPlayerId(null);
        fetchAdminOverview();
        onRefreshAllData();
        return;
      }
    } catch (err) {
      // Offline fallback
    }

    // Static fallback
    const allPlayers = getLocalPlayers();
    const p = allPlayers.find((item) => item.id === id);
    if (p) {
      p.name = editPlayerName.trim();
      p.totalScore = Number(editPlayerScore) || 0;
      saveLocalPlayers(allPlayers);
    }
    showToast("Participant record updated.");
    setEditingPlayerId(null);
    fetchAdminOverview();
    onRefreshAllData();
  };

  const handleDeletePlayer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the leaderboard?`)) return;

    try {
      const res = await fetch(`/api/admin/players/${id}`, {
        method: "DELETE",
        headers: { "x-admin-password": passwordInput },
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        showToast(`Removed ${name} from leaderboard.`);
        fetchAdminOverview();
        onRefreshAllData();
        return;
      }
    } catch (err) {
      // Offline fallback
    }

    // Static fallback
    const allPlayers = getLocalPlayers().filter((item) => item.id !== id);
    saveLocalPlayers(allPlayers);
    showToast(`Removed ${name} from leaderboard.`);
    fetchAdminOverview();
    onRefreshAllData();
  };

  const handleAddManualPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    try {
      const res = await fetch("/api/admin/players/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({
          name: manualName.trim(),
          totalScore: manualScore,
        }),
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        showToast("New participant added to leaderboard.");
        setManualName("");
        setManualScore(0);
        setShowAddPlayerModal(false);
        fetchAdminOverview();
        onRefreshAllData();
        return;
      }
    } catch (err) {
      // Offline fallback
    }

    // Static fallback
    const newPlayer = registerLocalPlayer(manualName.trim());
    newPlayer.totalScore = Number(manualScore) || 0;
    const allPlayers = getLocalPlayers();
    const idx = allPlayers.findIndex((p) => p.id === newPlayer.id);
    if (idx >= 0) {
      allPlayers[idx] = newPlayer;
      saveLocalPlayers(allPlayers);
    }
    showToast("New participant added to leaderboard.");
    setManualName("");
    setManualScore(0);
    setShowAddPlayerModal(false);
    fetchAdminOverview();
    onRefreshAllData();
  };

  // -------------------------------------------------------------
  // Question Management Actions
  // -------------------------------------------------------------
  const handleSaveQuestion = async () => {
    if (editingQuestionId === null) return;
    const updated = questions.map((q) =>
      q.id === editingQuestionId ? { ...q, ...editQuestionData } : q
    );

    try {
      const res = await fetch("/api/admin/questions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({ questions: updated }),
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        showToast("Question updated successfully.");
        setEditingQuestionId(null);
        fetchAdminOverview();
        onRefreshAllData();
        return;
      }
    } catch (err) {
      // Offline fallback
    }

    // Static fallback
    saveLocalQuestions(updated);
    showToast("Question updated successfully.");
    setEditingQuestionId(null);
    fetchAdminOverview();
    onRefreshAllData();
  };

  const handleRestoreDefaultQuestions = async () => {
    if (!window.confirm("Restore the default 15 sequential Onam cultural questions?")) return;

    try {
      const res = await fetch("/api/admin/questions/restore-default", {
        method: "POST",
        headers: { "x-admin-password": passwordInput },
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        showToast("Restored 15 canonical Onam questions.");
        fetchAdminOverview();
        onRefreshAllData();
        return;
      }
    } catch (err) {
      // Offline fallback
    }

    // Static fallback
    restoreDefaultLocalQuestions();
    showToast("Restored 15 canonical Onam questions.");
    fetchAdminOverview();
    onRefreshAllData();
  };

  // -------------------------------------------------------------
  // Settings & System Reset
  // -------------------------------------------------------------
  const handleUpdateSettings = async (newSettingsObj: Partial<AppSettings>) => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify(newSettingsObj),
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        showToast("Settings updated successfully.");
        fetchAdminOverview();
        onRefreshAllData();
        return;
      }
    } catch (err) {
      // Offline fallback
    }

    // Static fallback
    saveLocalSettings(newSettingsObj);
    showToast("Settings updated successfully.");
    fetchAdminOverview();
    onRefreshAllData();
  };

  const handleToggleEntryPage = async () => {
    const nextVal = !settings.adminEntryEnabled;
    try {
      const res = await fetch("/api/admin/toggle-entry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({ enabled: nextVal }),
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        showToast(`Admin entry page is now ${nextVal ? "ACTIVE" : "HIDDEN"}.`);
        fetchAdminOverview();
        onRefreshAllData();
        return;
      }
    } catch (err) {
      // Offline fallback
    }

    // Static fallback
    saveLocalSettings({ adminEntryEnabled: nextVal });
    showToast(`Admin entry page is now ${nextVal ? "ACTIVE" : "HIDDEN"}.`);
    fetchAdminOverview();
    onRefreshAllData();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }
    if (newPassword.length < 4) {
      showToast("New password must be at least 4 characters.", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.success) {
          setStoredAdminPassword(newPassword);
          showToast("Admin password changed successfully.");
          setPasswordInput(newPassword);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          return;
        } else {
          showToast(data.error || "Failed to update password.", "error");
          return;
        }
      }
    } catch (err) {
      // Offline fallback
    }

    // Local fallback for offline/static hosting
    if (verifyAdminPasswordLocally(currentPassword) || currentPassword === passwordInput) {
      setStoredAdminPassword(newPassword);
      showToast("Admin password changed successfully (saved locally).");
      setPasswordInput(newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      showToast("Current password is incorrect.", "error");
    }
  };

  const handleSystemReset = async (target: "all-participants" | "factory-reset") => {
    const confirmMsg =
      target === "all-participants"
        ? "Are you sure you want to clear ALL registered participants and reset the leaderboard to 0?"
        : "⚠️ COMPLETE FACTORY RESET: This will clear all leaderboard entries and restore default settings & questions. Proceed?";

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/admin/reset-system", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({ target }),
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        showToast("System reset executed successfully.");
        fetchAdminOverview();
        onRefreshAllData();
        return;
      }
    } catch (err) {
      // Offline fallback
    }

    // Static fallback
    if (target === "all-participants") {
      saveLocalPlayers([]);
    } else {
      saveLocalPlayers([]);
      restoreDefaultLocalQuestions();
      saveLocalSettings({
        quizEnabled: true,
        allowSubmissions: true,
        adminEntryEnabled: true,
        questionDuration: 20,
        maxPointsPerQuestion: 5,
        autoAdvance: true,
        autoAdvanceDelay: 6,
      });
    }
    showToast("System reset executed successfully.");
    fetchAdminOverview();
    onRefreshAllData();
  };

  // -------------------------------------------------------------
  // LOGIN SCREEN (If not authenticated)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-amber-50/70 via-stone-50 to-amber-100/40 py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border-2 border-amber-300 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-900 border-2 border-amber-400 flex items-center justify-center mx-auto shadow-sm">
            {loginMode === "login" ? (
              <Shield className="w-8 h-8 text-amber-700" />
            ) : loginMode === "forgot-passcode" ? (
              <KeyRound className="w-8 h-8 text-amber-700" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-emerald-700" />
            )}
          </div>

          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
              Dr. P. Alikutty's Hospital
            </span>
            <h2 className="text-2xl font-black text-stone-900 mt-2">
              {loginMode === "login"
                ? "Game Master Admin Portal"
                : loginMode === "forgot-passcode"
                ? "Admin Password Recovery"
                : "Set New Admin Password"}
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              {loginMode === "login"
                ? "Authenticate with your administrative password to control the real-time match and participants."
                : loginMode === "forgot-passcode"
                ? "Enter the master security passcode to authorize changing the administrator password."
                : "Create a new admin security password to regain access to the control center."}
            </p>
          </div>

          {/* VIEW 1: REGULAR LOGIN FORM */}
          {loginMode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Admin Security Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setLoginMode("forgot-passcode");
                    }}
                    className="text-xs text-amber-700 hover:text-amber-900 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Forgot password?</span>
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setAuthError(null);
                    }}
                    placeholder="Enter admin password..."
                    required
                    className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-stone-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="admin-login-submit-btn"
                type="submit"
                disabled={isAuthenticating || !passwordInput.trim()}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Shield className="w-4 h-4" />
                <span>{isAuthenticating ? "Verifying..." : "Access Admin Controls"}</span>
              </button>
            </form>
          )}

          {/* VIEW 2: FORGOT PASSWORD - STEP 1: ENTER MASTER PASSCODE */}
          {loginMode === "forgot-passcode" && (
            <form onSubmit={handleVerifyPasscodeOnLoginPage} className="space-y-4 text-left">
              <div className="text-xs text-amber-900 bg-amber-50 border border-amber-300/80 rounded-2xl p-3.5 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-amber-950 font-bold mb-0.5">Authorization Required</strong>
                  <span>Please enter the master recovery passcode to unlock administrator password reset.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  What's the passcode?
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showRecoveryPasscode ? "text" : "password"}
                    value={recoveryPasscode}
                    onChange={(e) => {
                      setRecoveryPasscode(e.target.value);
                      setRecoveryPasscodeError(null);
                    }}
                    placeholder="Enter passcode (e.g. 0099887766)"
                    required
                    autoFocus
                    className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-stone-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 text-sm outline-none tracking-wider font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryPasscode(!showRecoveryPasscode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                  >
                    {showRecoveryPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {recoveryPasscodeError && (
                  <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {recoveryPasscodeError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryPasscodeError(null);
                    setLoginMode("login");
                  }}
                  className="flex-1 py-3 px-3 rounded-xl border-2 border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPasscode || !recoveryPasscode.trim()}
                  className="flex-1 py-3 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>{isVerifyingPasscode ? "Verifying..." : "Verify Passcode"}</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: FORGOT PASSWORD - STEP 2: SET NEW ADMIN PASSWORD */}
          {loginMode === "set-new-password" && (
            <form onSubmit={handleResetPasswordOnLoginPage} className="space-y-4 text-left">
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-2xl p-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Passcode Verified!</strong> Enter your new admin password below to update credentials.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  New Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showResetPassword ? "text" : "password"}
                    value={resetNewPassword}
                    onChange={(e) => {
                      setResetNewPassword(e.target.value);
                      setResetPasswordError(null);
                    }}
                    placeholder="Enter new password (min 4 chars)..."
                    required
                    autoFocus
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-stone-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showResetPassword ? "text" : "password"}
                    value={resetConfirmPassword}
                    onChange={(e) => {
                      setResetConfirmPassword(e.target.value);
                      setResetPasswordError(null);
                    }}
                    placeholder="Confirm new password..."
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-stone-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 text-sm outline-none"
                  />
                </div>
              </div>

              {resetPasswordError && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {resetPasswordError}
                </p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordError(null);
                    setLoginMode("forgot-passcode");
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl border-2 border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword || !resetNewPassword.trim() || !resetConfirmPassword.trim()}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isResettingPassword ? "Saving..." : "Change & Enter"}</span>
                </button>
              </div>
            </form>
          )}

          <div className="pt-2 border-t border-stone-100">
            <button
              onClick={onBackToQuiz}
              className="text-xs text-stone-500 hover:text-amber-800 underline transition cursor-pointer"
            >
              Return to Public Quiz Arena
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="min-h-[calc(100vh-80px)] bg-stone-100 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 animate-bounce">
            <div
              className={`px-4 py-2.5 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 border-2 ${
                toastMessage.type === "success"
                  ? "bg-emerald-900 text-emerald-100 border-emerald-400"
                  : "bg-red-900 text-red-100 border-red-400"
              }`}
            >
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <XCircle className="w-4 h-4 text-red-300" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* Top Control Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-950 text-white rounded-3xl p-6 shadow-xl border-2 border-amber-500/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-amber-950 flex items-center justify-center font-bold shadow-md shrink-0">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider bg-amber-400 text-amber-950 px-2 py-0.5 rounded">
                  Game Master Console
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  ● Status: {gameState.status?.toUpperCase()}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-amber-100 mt-0.5">
                Real-Time Quiz Administration
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-end">
            <button
              onClick={() => {
                fetchAdminOverview();
                showToast("Admin data refreshed.");
              }}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-stone-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => window.open("/api/data-export", "_blank")}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export data.json</span>
            </button>

            <button
              onClick={onBackToQuiz}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-amber-500/30"
            >
              <span>Back to Quiz</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-300 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("game-master")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === "game-master"
                ? "bg-amber-600 text-white shadow"
                : "bg-white text-stone-700 hover:bg-stone-200"
            }`}
          >
            <Play className="w-4 h-4" />
            <span>Game Master Live Match</span>
          </button>

          <button
            onClick={() => setActiveTab("participants")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === "participants"
                ? "bg-amber-600 text-white shadow"
                : "bg-white text-stone-700 hover:bg-stone-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Participants & Leaderboard ({players.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("questions")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === "questions"
                ? "bg-amber-600 text-white shadow"
                : "bg-white text-stone-700 hover:bg-stone-200"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Questions & Answers ({questions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === "settings"
                ? "bg-amber-600 text-white shadow"
                : "bg-white text-stone-700 hover:bg-stone-200"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Game Settings & Timer</span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === "security"
                ? "bg-amber-600 text-white shadow"
                : "bg-white text-stone-700 hover:bg-stone-200"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Password & Reset</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: GAME MASTER LIVE MATCH CONTROLLER */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "game-master" && (
          <div className="space-y-6 animate-fade-in">
            {/* Live Match Engine Status Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                    <span>Live Match Controller</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Synchronize questions for all participants in real-time with 20-second speed-decay scoring.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs bg-stone-100 text-stone-700 px-3 py-1.5 rounded-xl font-mono font-bold">
                    Connected Clients: {gameState.connectedPlayersCount || 0}
                  </span>
                  <span className="text-xs bg-amber-100 text-amber-900 px-3 py-1.5 rounded-xl font-mono font-bold">
                    Current Q: {(gameState.currentQuestionIndex || 0) + 1} / {questions.length}
                  </span>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => handleGameAction("start", { questionIndex: 0 })}
                  className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Match (From Q1)</span>
                </button>

                <button
                  onClick={() => handleGameAction("next")}
                  className="p-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleGameAction("reveal")}
                  className="p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Force Reveal Review</span>
                </button>

                <button
                  onClick={() => handleGameAction("reset")}
                  className="p-4 rounded-2xl bg-stone-700 hover:bg-stone-800 text-stone-100 font-bold text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset to Lobby</span>
                </button>
              </div>

              {/* Jump to specific question */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Jump Directly to Question:
                </h4>
                <div className="grid grid-cols-5 sm:grid-cols-15 gap-1.5">
                  {questions.map((q, idx) => {
                    const isCurrent = gameState.currentQuestionIndex === idx && gameState.status !== "lobby";
                    return (
                      <button
                        key={q.id}
                        onClick={() => handleGameAction("start", { questionIndex: idx })}
                        className={`h-9 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                          isCurrent
                            ? "bg-amber-600 text-white ring-2 ring-amber-400 font-black shadow"
                            : "bg-white hover:bg-amber-100 text-stone-700 border border-stone-200"
                        }`}
                      >
                        Q{idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Live Standings Snapshot */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-stone-200 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-600" />
                  <span>Live Match Standings Snapshot</span>
                </h3>
                <span className="text-xs text-stone-500 font-mono">
                  {leaderboard.length} Registered Players
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {leaderboard.slice(0, 6).map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-stone-900 text-xs">{item.name}</p>
                        <p className="text-[10px] text-stone-500">{item.correctCount} Correct</p>
                      </div>
                    </div>
                    <span className="font-mono font-black text-amber-800 text-sm">
                      {item.totalScore.toFixed(2)} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: PARTICIPANTS & LEADERBOARD MANAGER */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "participants" && (
          <div className="bg-white rounded-3xl shadow-xl border border-stone-200 p-6 space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <span>Individual Participants Manager</span>
                  <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                    {players.length} Total Registered
                  </span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Manage individual participant names, cumulative speed scores, and leaderboard registrations.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddPlayerModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Participant</span>
                </button>

                <button
                  onClick={() => handleSystemReset("all-participants")}
                  className="px-3.5 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            {/* Manual Add Player Modal */}
            {showAddPlayerModal && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Add Manual Participant to Leaderboard
                </h3>
                <form onSubmit={handleAddManualPlayer} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Participant Name"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs outline-none bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="75"
                      value={manualScore}
                      onChange={(e) => setManualScore(Number(e.target.value))}
                      placeholder="Initial Score (pts)"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs outline-none bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-sm hover:bg-amber-700 transition cursor-pointer"
                    >
                      Save Player
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddPlayerModal(false)}
                      className="px-3 py-2 rounded-xl bg-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-300 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Participants Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-stone-600 text-xs font-bold uppercase tracking-wider border-b border-stone-200">
                    <th className="py-3 px-4 w-16">Rank</th>
                    <th className="py-3 px-4">Participant Name</th>
                    <th className="py-3 px-4 text-center">Correct Answers</th>
                    <th className="py-3 px-4 text-center">Total Answered</th>
                    <th className="py-3 px-4 text-right">Cumulative Score</th>
                    <th className="py-3 px-4 text-center w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400">
                        No participants registered on leaderboard yet.
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((player) => {
                      const isEditing = editingPlayerId === player.id;

                      return (
                        <tr key={player.id} className="hover:bg-stone-50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-stone-500">#{player.rank}</td>
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editPlayerName}
                                onChange={(e) => setEditPlayerName(e.target.value)}
                                className="px-2 py-1 border border-amber-500 rounded text-xs w-full max-w-xs outline-none"
                              />
                            ) : (
                              <span className="font-bold text-stone-900">{player.name}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-stone-700">
                            {player.correctCount} / 15
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-stone-700">
                            {player.answeredCount} / 15
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editPlayerScore}
                                onChange={(e) => setEditPlayerScore(Number(e.target.value))}
                                className="px-2 py-1 border border-amber-500 rounded text-xs w-24 text-right font-mono outline-none"
                              />
                            ) : (
                              <span className="font-mono font-black text-amber-800">
                                {player.totalScore.toFixed(2)} pts
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleSavePlayerEdit(player.id)}
                                  className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                                  title="Save Changes"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingPlayerId(null)}
                                  className="p-1 rounded bg-stone-300 text-stone-700 hover:bg-stone-400 transition cursor-pointer"
                                  title="Cancel"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingPlayerId(player.id);
                                    setEditPlayerName(player.name);
                                    setEditPlayerScore(player.totalScore);
                                  }}
                                  className="p-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 transition cursor-pointer"
                                  title="Edit Name/Score"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePlayer(player.id, player.name)}
                                  className="p-1.5 rounded-lg bg-stone-100 hover:bg-red-100 text-stone-600 hover:text-red-700 transition cursor-pointer"
                                  title="Remove Participant"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 3: QUESTIONS & ANSWERS MANAGEMENT */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "questions" && (
          <div className="bg-white rounded-3xl shadow-xl border border-stone-200 p-6 space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                  <span>Sequential Questions Management</span>
                  <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                    {questions.length} Questions (No Shuffling)
                  </span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Questions are presented in strict canonical sequence to all participants simultaneously.
                </p>
              </div>

              <button
                onClick={handleRestoreDefaultQuestions}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Default 15 Questions</span>
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => {
                const isEditing = editingQuestionId === q.id;

                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl border-2 border-stone-200 bg-stone-50/50 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-amber-600 text-white text-xs font-bold flex items-center justify-center">
                          Q{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-stone-500">
                          {q.category || "Onam Knowledge"}
                        </span>
                      </div>

                      <div>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={handleSaveQuestion}
                              className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
                            >
                              Save Question
                            </button>
                            <button
                              onClick={() => setEditingQuestionId(null)}
                              className="px-2.5 py-1 bg-stone-300 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-400 transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingQuestionId(q.id);
                              setEditQuestionData({ ...q });
                            }}
                            className="px-3 py-1 rounded-lg bg-stone-200 hover:bg-amber-200 text-stone-800 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editQuestionData.question || ""}
                          onChange={(e) =>
                            setEditQuestionData((prev) => ({ ...prev, question: e.target.value }))
                          }
                          className="w-full p-2.5 rounded-xl border border-amber-500 bg-white text-xs font-semibold outline-none"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(editQuestionData.options || q.options).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${q.id}`}
                                checked={editQuestionData.correctIndex === optIdx}
                                onChange={() =>
                                  setEditQuestionData((prev) => ({ ...prev, correctIndex: optIdx }))
                                }
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...(editQuestionData.options || q.options)];
                                  newOpts[optIdx] = e.target.value;
                                  setEditQuestionData((prev) => ({ ...prev, options: newOpts }));
                                }}
                                className="w-full p-1.5 rounded-lg border border-stone-300 bg-white text-xs outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-bold text-stone-900 text-sm">{q.question}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = q.correctIndex === optIdx;
                            return (
                              <div
                                key={optIdx}
                                className={`p-2.5 rounded-xl text-xs border flex items-center justify-between ${
                                  isCorrect
                                    ? "bg-emerald-100 border-emerald-400 text-emerald-950 font-bold"
                                    : "bg-white border-stone-200 text-stone-700"
                                }`}
                              >
                                <span>{opt}</span>
                                {isCorrect && (
                                  <span className="text-[10px] uppercase font-extrabold bg-emerald-700 text-white px-1.5 py-0.2 rounded">
                                    Correct Answer
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 4: SETTINGS & SPEED SCORING CONFIGURATION */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "settings" && (
          <div className="bg-white rounded-3xl shadow-xl border border-stone-200 p-6 sm:p-8 space-y-6 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <span>Game Engine & Scoring Settings</span>
                <Settings className="w-5 h-5 text-amber-600" />
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Configure question duration, speed scoring parameters, and public participation permissions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Question Countdown Duration */}
              <div className="p-5 rounded-2xl border-2 border-stone-200 bg-stone-50 space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Question Duration (Seconds)</span>
                </div>
                <p className="text-xs text-stone-500">
                  Strict countdown allotted for every individual question. Default is 20 seconds.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="10"
                    max="60"
                    value={settings.questionDuration || 20}
                    onChange={(e) => handleUpdateSettings({ questionDuration: Number(e.target.value) })}
                    className="w-28 px-3 py-2 rounded-xl border-2 border-stone-300 font-mono font-bold text-sm outline-none bg-white"
                  />
                  <span className="text-xs text-stone-600 font-bold">Seconds</span>
                </div>
              </div>

              {/* Max Points per Question */}
              <div className="p-5 rounded-2xl border-2 border-stone-200 bg-stone-50 space-y-3">
                <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Max Points Per Question</span>
                </div>
                <p className="text-xs text-stone-500">
                  Calculated as: <code>Points = Max × (Time Left / Duration)</code>. Default is 5 points.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxPointsPerQuestion || 5}
                    onChange={(e) => handleUpdateSettings({ maxPointsPerQuestion: Number(e.target.value) })}
                    className="w-28 px-3 py-2 rounded-xl border-2 border-stone-300 font-mono font-bold text-sm outline-none bg-white"
                  />
                  <span className="text-xs text-stone-600 font-bold">Points</span>
                </div>
              </div>

              {/* Auto Advance Toggle */}
              <div className="p-5 rounded-2xl border-2 border-stone-200 bg-stone-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">Automatic Round Progression</span>
                  <button
                    onClick={() => handleUpdateSettings({ autoAdvance: !settings.autoAdvance })}
                    className="text-amber-600 cursor-pointer"
                  >
                    {settings.autoAdvance ? (
                      <ToggleRight className="w-8 h-8 text-amber-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-stone-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-stone-500">
                  When enabled, automatically advances to the next question after a 6-second review screen.
                </p>
              </div>

              {/* Admin Entry Header Visibility */}
              <div className="p-5 rounded-2xl border-2 border-stone-200 bg-stone-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">Admin Entry Button on Header</span>
                  <button
                    onClick={handleToggleEntryPage}
                    className="text-amber-600 cursor-pointer"
                  >
                    {settings.adminEntryEnabled !== false ? (
                      <ToggleRight className="w-8 h-8 text-amber-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-stone-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-stone-500">
                  Toggle whether the "Admin Panel" tab is visible on the main public navigation header.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 5: SECURITY & FACTORY RESET */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "security" && (
          <div className="bg-white rounded-3xl shadow-xl border border-stone-200 p-6 sm:p-8 space-y-8 animate-fade-in">
            {/* Change Password Form */}
            <div>
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <span>Change Admin Password</span>
                <KeyRound className="w-5 h-5 text-amber-600" />
              </h2>
              <p className="text-xs text-stone-500 mt-0.5 mb-5">
                Update the security key required to access the Game Master controller.
              </p>

              <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={4}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={4}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs outline-none focus:border-amber-600"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Update Admin Password
                </button>
              </form>
            </div>

            {/* Complete System Factory Reset */}
            <div className="pt-6 border-t border-stone-200">
              <h3 className="text-base font-bold text-red-950 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Danger Zone • System Reset</span>
              </h3>
              <p className="text-xs text-stone-600 mb-4 leading-relaxed">
                Clear all active participants, reset current match progress, or execute a complete factory restore back to initial installation state.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleSystemReset("all-participants")}
                  className="px-4 py-2.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-900 text-xs font-bold border border-red-300 transition cursor-pointer"
                >
                  Clear All Leaderboard Participants
                </button>

                <button
                  onClick={() => handleSystemReset("factory-reset")}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  Full Factory Reset (Defaults)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
