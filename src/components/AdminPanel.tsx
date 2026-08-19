import React, { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Trophy,
  HelpCircle,
  KeyRound,
  Settings,
  Users,
  Plus,
  Trash2,
  Edit2,
  Save,
  Download,
  Eye,
  EyeOff,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  X,
  FileText,
  Tag,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Flame,
  UserPlus
} from "lucide-react";
import { Question, LeaderboardEntry, AppSettings, Player, PlayerAnswer } from "../types";
import { PookkalamArt } from "./PookkalamArt";
import { DEFAULT_QUESTIONS } from "../data/defaultQuestions";
import {
  loginAdminWithFallback,
  verifyPasscodeWithFallback,
  resetPasswordWithPasscodeWithFallback,
  setStoredAdminPassword,
  verifyAdminPasswordLocally,
  ADMIN_RECOVERY_PASSCODE,
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
} from "../lib/quizStorage";

interface AdminPanelProps {
  onBackToQuiz: () => void;
  onRefreshAllData: () => void;
  adminEntryEnabled: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onBackToQuiz,
  onRefreshAllData,
  adminEntryEnabled: initialAdminEntryEnabled,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Recovery Passcode State
  const [loginMode, setLoginMode] = useState<"login" | "recovery">("login");
  const [recoveryPasscode, setRecoveryPasscode] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  // 4 Explicit Dashboards
  const [activeTab, setActiveTab] = useState<"scoreboard" | "questions" | "security" | "settings">("scoreboard");

  // Core Data
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    quizEnabled: true,
    allowSubmissions: true,
    adminEntryEnabled: initialAdminEntryEnabled,
    questionDuration: 20,
    maxPointsPerQuestion: 5,
    autoAdvance: true,
    autoAdvanceDelay: 4,
  });

  // Toasts
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Dashboard 1: Scoreboard State
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<{ id: string; name: string; totalScore: number } | null>(null);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerScore, setNewPlayerScore] = useState<number>(0);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // Dashboard 2: Questions State
  const [questionSearch, setQuestionSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [questionFormData, setQuestionFormData] = useState<{
    question: string;
    category: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctIndex: number;
    explanation: string;
  }>({
    question: "",
    category: "Tradition & Rituals",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctIndex: 0,
    explanation: "",
  });

  // Dashboard 3: Password & Security State
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [securityPasscodeResetInput, setSecurityPasscodeResetInput] = useState("");
  const [securityPasscodeNewPassword, setSecurityPasscodeNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load All Admin Data
  const loadAdminData = async (pwd?: string) => {
    const authHeader = pwd || passwordInput;
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { "x-admin-password": authHeader },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.players) setPlayers(data.players);
        if (data.questions?.length) setQuestions(data.questions);
        if (data.settings) setSettings(data.settings);
        return;
      }
    } catch (e) {
      // offline fallback
    }

    // Static / Local Fallback (InfinityFree)
    const localP = getLocalPlayers();
    const localQ = getLocalQuestions();
    const localS = getLocalSettings();
    setPlayers(localP);
    setQuestions(localQ.length ? localQ : DEFAULT_QUESTIONS);
    setSettings(localS);
  };

  // Handle Initial Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError("Please enter your admin password.");
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    const result = await loginAdminWithFallback(passwordInput.trim());
    setIsAuthenticating(false);

    if (result.success) {
      setIsAuthenticated(true);
      loadAdminData(passwordInput.trim());
      showToast("Admin access verified. Welcome to Control Center!");
    } else {
      setAuthError(result.error || "Incorrect admin password. Please try again.");
    }
  };

  // Live Auto-Update effect for Scoreboard and Settings
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh immediately
    loadAdminData();

    // Auto-poll every 2 seconds for live changes (new answers / scores / players)
    const pollInterval = setInterval(() => {
      loadAdminData();
    }, 2000);

    // Cross-tab synchronization
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "onam_quiz_players_list" || e.key === "onam_quiz_settings" || e.key === "onam_quiz_game_state") {
        loadAdminData();
      }
    };
    window.addEventListener("storage", handleStorage);

    const handleFocus = () => {
      loadAdminData();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isAuthenticated, passwordInput]);

  // Handle Recovery Password Reset
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (recoveryPasscode.trim() !== ADMIN_RECOVERY_PASSCODE) {
      setRecoveryError("Invalid master recovery passcode.");
      return;
    }

    if (recoveryNewPassword.length < 4) {
      setRecoveryError("New password must be at least 4 characters.");
      return;
    }

    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setRecoveryError("Passwords do not match.");
      return;
    }

    setIsRecovering(true);
    const result = await resetPasswordWithPasscodeWithFallback(
      recoveryPasscode.trim(),
      recoveryNewPassword.trim()
    );
    setIsRecovering(false);

    if (result.success) {
      showToast("Password successfully reset! You can now log in.");
      setPasswordInput(recoveryNewPassword.trim());
      setLoginMode("login");
      setRecoveryPasscode("");
      setRecoveryNewPassword("");
      setRecoveryConfirmPassword("");
    } else {
      setRecoveryError(result.error || "Failed to reset password.");
    }
  };

  // =========================================================================
  // 1. SCOREBOARD ACTIONS
  // =========================================================================
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return new Date(a.joinedAt || 0).getTime() - new Date(b.joinedAt || 0).getTime();
  });

  const filteredPlayers = sortedPlayers.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveEditPlayer = async () => {
    if (!editingPlayer) return;

    const updatedPlayers = players.map((p) =>
      p.id === editingPlayer.id
        ? {
            ...p,
            name: editingPlayer.name.trim() || p.name,
            totalScore: Math.max(0, Math.round(Number(editingPlayer.totalScore) * 100) / 100),
          }
        : p
    );

    saveLocalPlayers(updatedPlayers);
    setPlayers(updatedPlayers);

    // Try server update
    try {
      await fetch(`/api/admin/players/${editingPlayer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({
          name: editingPlayer.name,
          totalScore: editingPlayer.totalScore,
        }),
      });
    } catch (e) {}

    setEditingPlayer(null);
    showToast("Participant record updated successfully.");
    onRefreshAllData();
  };

  const handleDeletePlayer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the scoreboard?`)) return;

    const updated = players.filter((p) => p.id !== id);
    saveLocalPlayers(updated);
    setPlayers(updated);

    try {
      await fetch(`/api/admin/players/${id}`, {
        method: "DELETE",
        headers: { "x-admin-password": passwordInput },
      });
    } catch (e) {}

    showToast(`Removed ${name} from scoreboard.`);
    onRefreshAllData();
  };

  const handleAddManualPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const newEntry: Player = {
      id: `p_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newPlayerName.trim(),
      totalScore: Math.max(0, Math.round(Number(newPlayerScore) * 100) / 100),
      correctCount: 0,
      answeredCount: 0,
      answers: {},
      joinedAt: new Date().toISOString(),
      isOnline: true,
    };

    const updated = [newEntry, ...players];
    saveLocalPlayers(updated);
    setPlayers(updated);

    try {
      await fetch("/api/admin/players/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({
          name: newPlayerName.trim(),
          totalScore: newPlayerScore,
        }),
      });
    } catch (e) {}

    setShowAddPlayerModal(false);
    setNewPlayerName("");
    setNewPlayerScore(0);
    showToast(`Added ${newEntry.name} to the scoreboard.`);
    onRefreshAllData();
  };

  const handleClearAllPlayers = async () => {
    saveLocalPlayers([]);
    setPlayers([]);
    setShowClearConfirmModal(false);

    try {
      await fetch("/api/admin/reset-system", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({ target: "all-participants" }),
      });
    } catch (e) {}

    showToast("Cleared all participant entries.");
    onRefreshAllData();
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(players, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `onam-quiz-scoreboard-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Downloaded scoreboard JSON export.");
  };

  const handleExportCSV = () => {
    const headers = ["Rank", "Name", "Total Score", "Correct Answers", "Questions Answered", "Joined At"];
    const rows = sortedPlayers.map((p, idx) => [
      idx + 1,
      `"${p.name.replace(/"/g, '""')}"`,
      p.totalScore.toFixed(2),
      p.correctCount,
      p.answeredCount,
      `"${p.joinedAt || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `onam-quiz-scoreboard-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("Downloaded scoreboard CSV export.");
  };

  // =========================================================================
  // 2. QUESTION & ANSWER MANAGEMENT ACTIONS
  // =========================================================================
  const categoriesList = Array.from(new Set(questions.map((q) => q.category || "General Culture")));

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.question.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.options.some((opt) => opt.toLowerCase().includes(questionSearch.toLowerCase()));
    const matchesCat = selectedCategoryFilter === "all" || q.category === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleOpenAddQuestion = () => {
    setEditingQuestionId(null);
    setQuestionFormData({
      question: "",
      category: "Tradition & Rituals",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctIndex: 0,
      explanation: "",
    });
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setQuestionFormData({
      question: q.question,
      category: q.category || "Tradition & Rituals",
      optionA: q.options[0] || "",
      optionB: q.options[1] || "",
      optionC: q.options[2] || "",
      optionD: q.options[3] || "",
      correctIndex: q.correctIndex ?? 0,
      explanation: q.explanation || "",
    });
    setShowQuestionModal(true);
  };

  const handleSaveQuestionForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const { question, category, optionA, optionB, optionC, optionD, correctIndex, explanation } = questionFormData;

    if (!question.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      alert("Please fill in the question text and all 4 options.");
      return;
    }

    const options = [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()];
    let updatedQuestions: Question[];

    if (editingQuestionId !== null) {
      // Editing existing question
      updatedQuestions = questions.map((q) =>
        q.id === editingQuestionId
          ? {
              ...q,
              question: question.trim(),
              category: category.trim(),
              options,
              correctIndex,
              explanation: explanation.trim(),
            }
          : q
      );
    } else {
      // Adding new question
      const newId = questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1;
      const newQ: Question = {
        id: newId,
        question: question.trim(),
        category: category.trim(),
        options,
        correctIndex,
        explanation: explanation.trim(),
      };
      updatedQuestions = [...questions, newQ];
    }

    saveLocalQuestions(updatedQuestions);
    setQuestions(updatedQuestions);

    // Sync to server if live
    try {
      await fetch("/api/admin/questions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({ questions: updatedQuestions }),
      });
    } catch (e) {}

    setShowQuestionModal(false);
    showToast(editingQuestionId !== null ? "Question updated successfully." : "New question added successfully.");
    onRefreshAllData();
  };

  const handleDeleteQuestion = async (id: number) => {
    if (questions.length <= 1) {
      alert("At least one question is required for the quiz.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this question?")) return;

    const updated = questions.filter((q) => q.id !== id);
    saveLocalQuestions(updated);
    setQuestions(updated);

    try {
      await fetch("/api/admin/questions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({ questions: updated }),
      });
    } catch (e) {}

    showToast("Question deleted.");
    onRefreshAllData();
  };

  const handleRestoreDefaultQuestions = async () => {
    if (!window.confirm("Restore the default 15 Onam questions? This will replace current questions.")) return;

    const defaults = restoreDefaultLocalQuestions();
    setQuestions(defaults);

    try {
      await fetch("/api/admin/questions/restore-default", {
        method: "POST",
        headers: { "x-admin-password": passwordInput },
      });
    } catch (e) {}

    showToast("Default 15 Onam questions restored.");
    onRefreshAllData();
  };

  // =========================================================================
  // 3. PASSWORD & SECURITY ACTIONS
  // =========================================================================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPasswordInput) {
      alert("Please enter current admin password.");
      return;
    }
    if (newPasswordInput.length < 4) {
      alert("New password must be at least 4 characters long.");
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      alert("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({
          currentPassword: currentPasswordInput,
          newPassword: newPasswordInput,
        }),
      });

      if (res.ok) {
        setStoredAdminPassword(newPasswordInput.trim());
        setPasswordInput(newPasswordInput.trim());
        setCurrentPasswordInput("");
        setNewPasswordInput("");
        setConfirmPasswordInput("");
        showToast("Admin password successfully updated!");
        setIsChangingPassword(false);
        return;
      }
    } catch (e) {}

    // Local verification & update
    if (verifyAdminPasswordLocally(currentPasswordInput)) {
      setStoredAdminPassword(newPasswordInput.trim());
      setPasswordInput(newPasswordInput.trim());
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setConfirmPasswordInput("");
      showToast("Admin password successfully updated locally!");
    } else {
      alert("Current password verification failed.");
    }
    setIsChangingPassword(false);
  };

  const handleSecurityPasscodeReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityPasscodeResetInput.trim() !== ADMIN_RECOVERY_PASSCODE) {
      alert("Invalid master recovery passcode.");
      return;
    }
    if (securityPasscodeNewPassword.length < 4) {
      alert("New password must be at least 4 characters.");
      return;
    }

    const result = await resetPasswordWithPasscodeWithFallback(
      securityPasscodeResetInput.trim(),
      securityPasscodeNewPassword.trim()
    );

    if (result.success) {
      setPasswordInput(securityPasscodeNewPassword.trim());
      setSecurityPasscodeResetInput("");
      setSecurityPasscodeNewPassword("");
      showToast("Password reset via Master Recovery Passcode successful!");
    } else {
      alert(result.error || "Failed to reset password.");
    }
  };

  const handleToggleAdminEntry = async (enabled: boolean) => {
    const updatedSettings = saveLocalSettings({ adminEntryEnabled: enabled });
    setSettings(updatedSettings);

    try {
      await fetch("/api/admin/toggle-entry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({ enabled }),
      });
    } catch (e) {}

    showToast(`Admin entry link is now ${enabled ? "VISIBLE" : "HIDDEN"}.`);
    onRefreshAllData();
  };

  // =========================================================================
  // 4. GAME SETTINGS & TIMER ACTIONS
  // =========================================================================
  const handleUpdateDuration = async (newDuration: number) => {
    const updated = saveLocalSettings({ questionDuration: newDuration });
    setSettings(updated);

    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({ questionDuration: newDuration }),
      });
    } catch (e) {}

    showToast(`Per-question countdown duration set to ${newDuration} seconds.`);
    onRefreshAllData();
  };

  const handleUpdateMaxPoints = async (pts: number) => {
    const updated = saveLocalSettings({ maxPointsPerQuestion: pts });
    setSettings(updated);

    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({ maxPointsPerQuestion: pts }),
      });
    } catch (e) {}

    showToast(`Max points per question set to ${pts} points.`);
    onRefreshAllData();
  };

  const handleToggleSubmissions = async (allow: boolean) => {
    const updated = saveLocalSettings({ allowSubmissions: allow });
    setSettings(updated);

    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({ allowSubmissions: allow }),
      });
    } catch (e) {}

    showToast(`Participant submissions are now ${allow ? "OPEN" : "PAUSED"}.`);
    onRefreshAllData();
  };

  const handleFactoryReset = async () => {
    if (!window.confirm("Perform Full Factory Reset? This will reset default questions, clear all participants, and restore default timer (20s).")) {
      return;
    }

    const defaultQ = restoreDefaultLocalQuestions();
    saveLocalPlayers([]);
    const defaultS = saveLocalSettings({
      quizEnabled: true,
      allowSubmissions: true,
      adminEntryEnabled: true,
      questionDuration: 20,
      maxPointsPerQuestion: 5,
      autoAdvance: true,
      autoAdvanceDelay: 4,
    });

    setQuestions(defaultQ);
    setPlayers([]);
    setSettings(defaultS);

    try {
      await fetch("/api/admin/reset-system", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({ target: "factory-reset" }),
      });
    } catch (e) {}

    showToast("Full factory reset completed.");
    onRefreshAllData();
  };

  // -------------------------------------------------------------------------
  // RENDER: LOGIN & PASSCODE RECOVERY SCREENS (When not authenticated)
  // -------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-amber-50/70 via-stone-50 to-amber-100/40 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border-2 border-amber-200/90 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-600/30">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight">Admin Control Center</h2>
            <p className="text-xs text-stone-500">
              {loginMode === "login" ? "Enter your admin password to access management dashboards" : "Master Recovery Passcode Reset"}
            </p>
          </div>

          {loginMode === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full pl-12 pr-12 py-3.5 rounded-2xl border-2 border-stone-300 focus:border-amber-600 focus:ring-4 focus:ring-amber-500/20 text-sm font-medium outline-none transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isAuthenticating ? "Verifying Credentials..." : "Access Admin Dashboard"}
              </button>

              <div className="pt-2 flex items-center justify-between text-xs text-stone-500 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setLoginMode("recovery")}
                  className="text-amber-700 hover:text-amber-900 font-semibold underline cursor-pointer"
                >
                  Forgot Password?
                </button>
                <button
                  type="button"
                  onClick={onBackToQuiz}
                  className="text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Back to Quiz
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              {recoveryError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{recoveryError}</span>
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                Use the Master Passcode (<code>0099887766</code>) to override and set a new password.
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Master Recovery Passcode
                </label>
                <input
                  type="text"
                  value={recoveryPasscode}
                  onChange={(e) => setRecoveryPasscode(e.target.value)}
                  placeholder="Enter 10-digit passcode (0099887766)"
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-600 text-sm font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  New Admin Password
                </label>
                <input
                  type="password"
                  value={recoveryNewPassword}
                  onChange={(e) => setRecoveryNewPassword(e.target.value)}
                  placeholder="Min 4 characters"
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-600 text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={recoveryConfirmPassword}
                  onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-600 text-sm outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isRecovering}
                className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow transition cursor-pointer"
              >
                {isRecovering ? "Resetting..." : "Reset Password & Unlock"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setLoginMode("login")}
                  className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
                >
                  Return to Admin Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER: AUTHENTICATED ADMIN DASHBOARDS (4 TABS)
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-amber-50/70 via-stone-50 to-amber-100/40 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-20 right-6 z-50 animate-bounce">
            <div
              className={`px-5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 ${
                toast.type === "success"
                  ? "bg-emerald-900 text-emerald-100 border-2 border-emerald-500"
                  : "bg-red-900 text-red-100 border-2 border-red-500"
              }`}
            >
              {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-amber-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-stone-900">Admin Control Center</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  Authenticated
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Dr. P. Alikutty's Hospital • Onam Grand Speed Challenge 2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setIsAuthenticated(false);
                setPasswordInput("");
                showToast("Logged out from admin panel.");
              }}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
            >
              Log Out
            </button>
            <button
              onClick={onBackToQuiz}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Back to Quiz</span>
            </button>
          </div>
        </div>

        {/* 4 Distinct Navigation Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <button
            id="tab-scoreboard-btn"
            onClick={() => setActiveTab("scoreboard")}
            className={`p-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer border-2 ${
              activeTab === "scoreboard"
                ? "bg-amber-600 text-white border-amber-700 shadow-md scale-[1.02]"
                : "bg-white text-stone-700 hover:bg-stone-50 border-stone-200"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Scoreboard</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === "scoreboard" ? "bg-amber-800 text-amber-100" : "bg-stone-100 text-stone-600"
            }`}>
              {players.length}
            </span>
          </button>

          <button
            id="tab-questions-btn"
            onClick={() => setActiveTab("questions")}
            className={`p-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer border-2 ${
              activeTab === "questions"
                ? "bg-amber-600 text-white border-amber-700 shadow-md scale-[1.02]"
                : "bg-white text-stone-700 hover:bg-stone-50 border-stone-200"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Questions & Answers</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === "questions" ? "bg-amber-800 text-amber-100" : "bg-stone-100 text-stone-600"
            }`}>
              {questions.length}
            </span>
          </button>

          <button
            id="tab-security-btn"
            onClick={() => setActiveTab("security")}
            className={`p-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer border-2 ${
              activeTab === "security"
                ? "bg-amber-600 text-white border-amber-700 shadow-md scale-[1.02]"
                : "bg-white text-stone-700 hover:bg-stone-50 border-stone-200"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Password & Security</span>
          </button>

          <button
            id="tab-settings-btn"
            onClick={() => setActiveTab("settings")}
            className={`p-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer border-2 ${
              activeTab === "settings"
                ? "bg-amber-600 text-white border-amber-700 shadow-md scale-[1.02]"
                : "bg-white text-stone-700 hover:bg-stone-50 border-stone-200"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Game Settings & Timer</span>
          </button>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: SCOREBOARD / LEADERBOARD DASHBOARD */}
        {/* ================================================================= */}
        {activeTab === "scoreboard" && (
          <div className="space-y-6">
            {/* Live Highest Scorer Spotlight Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-800 via-amber-900 to-amber-950 text-white p-6 sm:p-7 shadow-2xl border-2 border-amber-400/50">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 opacity-25 pointer-events-none">
                <PookkalamArt size={220} />
              </div>

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-300/40 px-3.5 py-1 rounded-full text-xs font-bold tracking-wider text-amber-200 uppercase">
                    <span className="text-sm">👑</span>
                    <span>Current Highest Scoring Participant</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  </div>

                  {sortedPlayers.length > 0 && sortedPlayers[0]?.name ? (
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-amber-100 flex items-center gap-2.5 flex-wrap">
                        <span>{sortedPlayers[0].name}</span>
                        <span className="text-xs bg-amber-400 text-amber-950 font-black px-3 py-1 rounded-full shadow-md">
                          Rank #1 Leader
                        </span>
                      </h2>
                      <p className="text-xs text-amber-200/90 mt-1.5 flex items-center gap-2 flex-wrap">
                        <span>
                          Correct Answers: <strong className="text-white font-mono">{sortedPlayers[0].correctCount} / {sortedPlayers[0].answeredCount || sortedPlayers[0].correctCount}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Accuracy: <strong className="text-emerald-300 font-mono">
                            {sortedPlayers[0].answeredCount ? Math.round((sortedPlayers[0].correctCount / sortedPlayers[0].answeredCount) * 100) : 100}%
                          </strong>
                        </span>
                        <span>•</span>
                        <span className="text-amber-300/80">
                          Auto-updates live with every submission
                        </span>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-xl font-bold text-amber-200">No Participant Scores Recorded Yet</h2>
                      <p className="text-xs text-amber-200/70 mt-1">
                        As participants complete quiz questions, the highest-scoring person will immediately appear here at the top.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-amber-950/90 border-2 border-amber-400/50 rounded-2xl p-4 sm:px-6 text-center shrink-0 shadow-xl">
                  <span className="text-[11px] text-amber-300 font-bold uppercase tracking-wider block">
                    Highest Live Score
                  </span>
                  <strong className="text-3xl sm:text-4xl font-black text-yellow-300 font-mono">
                    {sortedPlayers[0]?.totalScore ? sortedPlayers[0].totalScore.toFixed(2) : "0.00"}
                    <span className="text-sm font-normal text-amber-200 ml-1">pts</span>
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
                <span className="text-[11px] text-stone-500 font-bold uppercase tracking-wider block">Total Participants</span>
                <strong className="text-2xl font-black text-stone-900">{players.length}</strong>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
                <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider block">Highest Score</span>
                <strong className="text-2xl font-black text-amber-900">
                  {sortedPlayers[0]?.totalScore ? `${sortedPlayers[0].totalScore.toFixed(2)} pts` : "0.00 pts"}
                </strong>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
                <span className="text-[11px] text-stone-500 font-bold uppercase tracking-wider block">Average Score</span>
                <strong className="text-2xl font-black text-stone-900">
                  {players.length > 0
                    ? (players.reduce((sum, p) => sum + p.totalScore, 0) / players.length).toFixed(2) + " pts"
                    : "0.00 pts"}
                </strong>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200">
                <span className="text-[11px] text-stone-500 font-bold uppercase tracking-wider block">Top Participant</span>
                <strong className="text-base font-extrabold text-stone-900 truncate block">
                  {sortedPlayers[0]?.name || "None yet"}
                </strong>
              </div>
            </div>

            {/* Scoreboard Controls Bar */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-amber-200/80 space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search participant name..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm font-medium outline-none focus:border-amber-600"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Scoreboard Actions */}
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                  <button
                    onClick={() => setShowAddPlayerModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Participant</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Export CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>

                  <button
                    onClick={handleExportJSON}
                    className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Export JSON"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>

                  <button
                    onClick={() => setShowClearConfirmModal(true)}
                    className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {/* Scoreboard Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider bg-stone-50">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Participant Name</th>
                      <th className="py-3 px-4">Total Points</th>
                      <th className="py-3 px-4">Correct / Total</th>
                      <th className="py-3 px-4">Joined Time</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-stone-400">
                          {searchQuery ? "No participants match your search." : "No registered participants on scoreboard yet."}
                        </td>
                      </tr>
                    ) : (
                      filteredPlayers.map((player, idx) => {
                        const isExpanded = expandedPlayerId === player.id;
                        const rank = idx + 1;
                        const answersCount = player.answers ? Object.keys(player.answers).length : player.answeredCount;

                        return (
                          <React.Fragment key={player.id}>
                            <tr className="hover:bg-amber-50/40 transition">
                              <td className="py-3.5 px-4 font-black">
                                <span
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs ${
                                    rank === 1
                                      ? "bg-amber-400 text-amber-950 font-black shadow"
                                      : rank === 2
                                      ? "bg-stone-300 text-stone-800 font-bold"
                                      : rank === 3
                                      ? "bg-amber-700 text-white font-bold"
                                      : "bg-stone-100 text-stone-600"
                                  }`}
                                >
                                  #{rank}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-extrabold text-stone-900">{player.name}</div>
                                <div className="text-[10px] text-stone-400 font-mono">{player.id}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-extrabold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-300">
                                  {player.totalScore.toFixed(2)} pts
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="text-stone-700 font-semibold">
                                  {player.correctCount} / {answersCount || 0}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-xs text-stone-500 font-mono">
                                {player.joinedAt ? new Date(player.joinedAt).toLocaleTimeString() : "-"}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
                                    title="View Answer Details"
                                  >
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() =>
                                      setEditingPlayer({
                                        id: player.id,
                                        name: player.name,
                                        totalScore: player.totalScore,
                                      })
                                    }
                                    className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition cursor-pointer"
                                    title="Edit Name/Score"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePlayer(player.id, player.name)}
                                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition cursor-pointer"
                                    title="Delete from Leaderboard"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Answer Breakdown */}
                            {isExpanded && (
                              <tr className="bg-amber-50/70 border-b border-amber-200">
                                <td colSpan={6} className="p-4">
                                  <div className="bg-white rounded-2xl p-4 border border-amber-200 space-y-3">
                                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                      <Flame className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Per-Question Breakdown for {player.name}</span>
                                    </h4>

                                    {!player.answers || Object.keys(player.answers).length === 0 ? (
                                      <p className="text-xs text-stone-500">No question answers recorded yet for this participant.</p>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                                        {(Object.values(player.answers) as PlayerAnswer[]).map((ans) => {
                                          const q = questions.find((item) => item.id === ans.questionId);
                                          const optionLetter = ["A", "B", "C", "D"][ans.selectedOption] || "None";

                                          return (
                                            <div
                                              key={ans.questionId}
                                              className={`p-3 rounded-xl border ${
                                                ans.isCorrect
                                                  ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                                                  : "bg-red-50/80 border-red-300 text-red-950"
                                              }`}
                                            >
                                              <div className="flex items-center justify-between font-bold mb-1">
                                                <span>Question #{ans.questionId}</span>
                                                <span className="font-mono">+{ans.score.toFixed(2)} pts</span>
                                              </div>
                                              <p className="text-[11px] text-stone-600 line-clamp-1 mb-1">{q?.question || "Question text"}</p>
                                              <div className="flex items-center justify-between text-[10px] text-stone-500">
                                                <span>Choice: <strong>{optionLetter}</strong></span>
                                                <span>{ans.timeRemaining.toFixed(1)}s left</span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: QUESTION & ANSWER MANAGEMENT DASHBOARD */}
        {/* ================================================================= */}
        {activeTab === "questions" && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-amber-200/80 space-y-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                    <span>Question Database</span>
                    <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                      {questions.length} Questions
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Add, edit, review, and organize quiz questions and answer options.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    id="add-question-btn"
                    onClick={handleOpenAddQuestion}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Question</span>
                  </button>

                  <button
                    onClick={handleRestoreDefaultQuestions}
                    className="px-3.5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-stone-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                    <span>Restore 15 Defaults</span>
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-stone-100">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="Search question text or options..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-300 text-xs outline-none focus:border-amber-600"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full pb-1">
                  <button
                    onClick={() => setSelectedCategoryFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedCategoryFilter === "all"
                        ? "bg-amber-600 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    All Categories ({questions.length})
                  </button>
                  {categoriesList.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        selectedCategoryFilter === cat
                          ? "bg-amber-600 text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {filteredQuestions.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-stone-200 space-y-2">
                  <HelpCircle className="w-10 h-10 text-stone-300 mx-auto" />
                  <h4 className="font-bold text-stone-800">No questions found</h4>
                  <p className="text-xs text-stone-500">Try adjusting your search query or category filter.</p>
                </div>
              ) : (
                filteredQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-amber-200/80 hover:shadow-md transition space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-amber-100 text-amber-900 font-extrabold text-xs px-2.5 py-1 rounded-lg border border-amber-300 font-mono">
                          Q{idx + 1} (#{q.id})
                        </span>
                        {q.category && (
                          <span className="inline-flex items-center text-xs text-stone-600 bg-stone-100 px-2.5 py-1 rounded-md font-semibold">
                            <Tag className="w-3 h-3 mr-1 text-amber-600" />
                            {q.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditQuestion(q)}
                          className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    <h4 className="text-base font-bold text-stone-900 leading-relaxed">{q.question}</h4>

                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctIndex === optIdx;
                        const letter = ["A", "B", "C", "D"][optIdx];

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border flex items-center justify-between ${
                              isCorrect
                                ? "bg-emerald-50/90 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-400/30"
                                : "bg-stone-50 border-stone-200 text-stone-700"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[11px] ${
                                  isCorrect ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-700"
                                }`}
                              >
                                {letter}
                              </span>
                              <span>{opt}</span>
                            </div>
                            {isCorrect && (
                              <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Correct Answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Cultural Context */}
                    {q.explanation && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-stone-700 space-y-0.5">
                        <strong className="text-amber-900 font-bold flex items-center gap-1 text-[11px]">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Cultural Explanation</span>
                        </strong>
                        <p className="leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: PASSWORD & SECURITY DASHBOARD */}
        {/* ================================================================= */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Change Admin Password */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-200/80 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-stone-900">Change Admin Password</h3>
                  <p className="text-xs text-stone-500">Update the primary password required to unlock admin dashboards.</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm outline-none focus:border-amber-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Min 4 characters"
                      className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm outline-none focus:border-amber-600"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm outline-none focus:border-amber-600"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow transition cursor-pointer"
                >
                  {isChangingPassword ? "Updating..." : "Update Admin Password"}
                </button>
              </form>
            </div>

            {/* Passcode Reset & Access Visibility */}
            <div className="space-y-6">
              {/* Toggle Public Admin Entry */}
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-amber-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-stone-900">Admin Entry Link on Navbar</h4>
                      <p className="text-xs text-stone-500">Show or hide the "Admin Portal" link from public participants.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleAdminEntry(!settings.adminEntryEnabled)}
                    className="text-2xl cursor-pointer"
                  >
                    {settings.adminEntryEnabled ? (
                      <ToggleRight className="w-9 h-9 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-stone-400" />
                    )}
                  </button>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600">
                  Status: <strong>{settings.adminEntryEnabled ? "Visible to Everyone" : "Hidden (Stealth Mode)"}</strong>
                </div>
              </div>

              {/* Master Recovery Passcode */}
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-amber-200/80 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-stone-900">Master Passcode Override</h4>
                    <p className="text-xs text-stone-500">Emergency reset mechanism for hospital administrators.</p>
                  </div>
                </div>

                <form onSubmit={handleSecurityPasscodeReset} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Master Passcode (<code>0099887766</code>)
                    </label>
                    <input
                      type="text"
                      value={securityPasscodeResetInput}
                      onChange={(e) => setSecurityPasscodeResetInput(e.target.value)}
                      placeholder="Enter 0099887766"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-mono outline-none focus:border-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={securityPasscodeNewPassword}
                      onChange={(e) => setSecurityPasscodeNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs outline-none focus:border-red-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow transition cursor-pointer"
                  >
                    Reset Password via Master Passcode
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: GAME SETTINGS & TIMER DASHBOARD */}
        {/* ================================================================= */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Precision Timer Duration Settings */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-200/80 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-stone-900">Per-Question Timer Limit</h3>
                  <p className="text-xs text-stone-500">Configure countdown duration per question with 100% precision.</p>
                </div>
              </div>

              {/* Current Duration Display */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 text-center">
                <span className="text-xs text-amber-800 uppercase font-bold tracking-wider block">Active Duration</span>
                <strong className="text-4xl font-black text-amber-950 font-mono">
                  {settings.questionDuration} seconds
                </strong>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Select Timer Preset
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[10, 15, 20, 30, 45, 60].map((dur) => (
                    <button
                      key={dur}
                      onClick={() => handleUpdateDuration(dur)}
                      className={`py-2.5 rounded-xl font-mono font-bold text-xs transition cursor-pointer border ${
                        settings.questionDuration === dur
                          ? "bg-amber-600 text-white border-amber-700 shadow"
                          : "bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200"
                      }`}
                    >
                      {dur}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Points */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                  Max Points Per Question (Default 5 pts)
                </label>
                <div className="flex items-center gap-2">
                  {[5, 10, 20].map((pts) => (
                    <button
                      key={pts}
                      onClick={() => handleUpdateMaxPoints(pts)}
                      className={`flex-1 py-2 rounded-xl font-bold text-xs transition cursor-pointer border ${
                        (settings.maxPointsPerQuestion || 5) === pts
                          ? "bg-amber-600 text-white border-amber-700"
                          : "bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200"
                      }`}
                    >
                      {pts} Points
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed Scoring Formula Preview */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-2">
                <strong className="text-stone-800 font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Speed-Decay Scoring Behavior ({settings.questionDuration}s total)</span>
                </strong>
                <div className="space-y-1 text-[11px] text-stone-600 font-mono">
                  <div className="flex justify-between">
                    <span>At {settings.questionDuration}.0s remaining (Instant):</span>
                    <strong className="text-emerald-700">+{settings.maxPointsPerQuestion || 5}.00 pts</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>At {(settings.questionDuration / 2).toFixed(1)}s remaining (Halfway):</span>
                    <strong className="text-amber-700">+{( (settings.maxPointsPerQuestion || 5) / 2 ).toFixed(2)} pts</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>At 0.0s or incorrect response:</span>
                    <strong className="text-red-700">0.00 pts</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz Control & Factory Reset */}
            <div className="space-y-6">
              {/* Submission Toggle */}
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-amber-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-stone-900">Quiz Submissions</h4>
                      <p className="text-xs text-stone-500">Allow or pause participant quiz attempts.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleSubmissions(!settings.allowSubmissions)}
                    className="text-2xl cursor-pointer"
                  >
                    {settings.allowSubmissions ? (
                      <ToggleRight className="w-9 h-9 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-stone-400" />
                    )}
                  </button>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600">
                  Status: <strong>{settings.allowSubmissions ? "Submissions OPEN" : "Submissions PAUSED"}</strong>
                </div>
              </div>

              {/* Factory Reset */}
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-red-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-red-950">Factory System Reset</h4>
                    <p className="text-xs text-stone-500">Restore canonical Onam questions and wipe participant data.</p>
                  </div>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  Restores the standard 15 Onam cultural questions, sets per-question timer back to 20 seconds, and clears all leaderboard entries.
                </p>

                <button
                  onClick={handleFactoryReset}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Execute Full Factory Reset</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* MODAL: ADD / EDIT QUESTION */}
      {/* ================================================================= */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border-2 border-amber-300 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <span>{editingQuestionId !== null ? `Edit Question #${editingQuestionId}` : "Add New Question"}</span>
              </h3>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestionForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Question Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={questionFormData.question}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, question: e.target.value })}
                  placeholder="Enter the full question prompt..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-stone-300 text-sm font-medium outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Category Tag
                </label>
                <input
                  type="text"
                  value={questionFormData.category}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, category: e.target.value })}
                  placeholder="e.g. Tradition & Rituals / Food & Sadya / Boat Race"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-medium outline-none focus:border-amber-600"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Options & Correct Answer Selection <span className="text-red-500">*</span>
                </label>

                {[
                  { key: "optionA", label: "Option A", idx: 0 },
                  { key: "optionB", label: "Option B", idx: 1 },
                  { key: "optionC", label: "Option C", idx: 2 },
                  { key: "optionD", label: "Option D", idx: 3 },
                ].map(({ key, label, idx }) => (
                  <div
                    key={key}
                    className={`p-3 rounded-xl border flex items-center gap-3 ${
                      questionFormData.correctIndex === idx
                        ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-400/30"
                        : "bg-stone-50 border-stone-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="correctOption"
                      id={`radio-${key}`}
                      checked={questionFormData.correctIndex === idx}
                      onChange={() => setQuestionFormData({ ...questionFormData, correctIndex: idx })}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                    <label htmlFor={`radio-${key}`} className="font-bold text-xs text-stone-700 w-16 cursor-pointer">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={(questionFormData as any)[key]}
                      onChange={(e) => setQuestionFormData({ ...questionFormData, [key]: e.target.value })}
                      placeholder={`Enter ${label} text`}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 text-xs bg-white outline-none focus:border-amber-600"
                      required
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Cultural Context / Explanation (Shown during review)
                </label>
                <textarea
                  value={questionFormData.explanation}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, explanation: e.target.value })}
                  placeholder="Provide background context or explanation for why the answer is correct..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-stone-300 text-xs outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingQuestionId !== null ? "Save Changes" : "Create Question"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: EDIT PARTICIPANT NAME / SCORE */}
      {/* ================================================================= */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-amber-300 space-y-4">
            <h3 className="text-base font-black text-stone-900">Edit Participant Record</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Participant Name
                </label>
                <input
                  type="text"
                  value={editingPlayer.name}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-medium outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Total Points
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPlayer.totalScore}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, totalScore: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-mono outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingPlayer(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditPlayer}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow cursor-pointer"
              >
                Save Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ADD MANUAL PARTICIPANT */}
      {/* ================================================================= */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-amber-300 space-y-4">
            <h3 className="text-base font-black text-stone-900">Add Participant to Scoreboard</h3>

            <form onSubmit={handleAddManualPlayer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Participant Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-medium outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Initial Total Score (pts)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newPlayerScore}
                  onChange={(e) => setNewPlayerScore(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-mono outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlayerModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow cursor-pointer"
                >
                  Add Participant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: CLEAR ALL CONFIRMATION */}
      {/* ================================================================= */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-red-500 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-red-950">Clear Entire Scoreboard?</h3>
                <p className="text-xs text-red-700">This will remove all {players.length} participant records permanently.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllPlayers}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow cursor-pointer"
              >
                Yes, Clear All Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
