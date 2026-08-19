/**
 * Client-Side Storage & State Manager for Static Hosting (InfinityFree, GitHub Pages, etc.)
 * Provides full quiz lifecycle, question management, submissions, and leaderboard sync
 * without requiring an active Node.js server.
 */

import { DEFAULT_QUESTIONS } from "../data/defaultQuestions";
import { GameState, LeaderboardEntry, Player, Question, AppSettings, PlayerAnswer } from "../types";

const STORAGE_KEY_PLAYERS = "onam_quiz_players_list";
const STORAGE_KEY_QUESTIONS = "onam_quiz_questions_list";
const STORAGE_KEY_SETTINGS = "onam_quiz_settings";
const STORAGE_KEY_GAME_STATE = "onam_quiz_game_state";

export const DEFAULT_SETTINGS: AppSettings = {
  quizEnabled: true,
  allowSubmissions: true,
  adminEntryEnabled: true,
  questionDuration: 20,
  maxPointsPerQuestion: 5,
  autoAdvance: true,
  autoAdvanceDelay: 6,
};

// Safe localStorage helpers
function getLocalItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item) as T;
    }
  } catch (e) {
    // ignore
  }
  return fallback;
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
}

// -------------------------------------------------------------
// Questions Storage
// -------------------------------------------------------------
export function getLocalQuestions(): Question[] {
  const list = getLocalItem<Question[]>(STORAGE_KEY_QUESTIONS, []);
  if (!list || list.length === 0) {
    setLocalItem(STORAGE_KEY_QUESTIONS, DEFAULT_QUESTIONS);
    return DEFAULT_QUESTIONS;
  }
  return list;
}

export function saveLocalQuestions(questions: Question[]): void {
  setLocalItem(STORAGE_KEY_QUESTIONS, questions);
}

export function restoreDefaultLocalQuestions(): Question[] {
  setLocalItem(STORAGE_KEY_QUESTIONS, DEFAULT_QUESTIONS);
  return DEFAULT_QUESTIONS;
}

// -------------------------------------------------------------
// Settings Storage
// -------------------------------------------------------------
export function getLocalSettings(): AppSettings {
  return getLocalItem<AppSettings>(STORAGE_KEY_SETTINGS, DEFAULT_SETTINGS);
}

export function saveLocalSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getLocalSettings();
  const updated = { ...current, ...settings };
  setLocalItem(STORAGE_KEY_SETTINGS, updated);
  return updated;
}

// -------------------------------------------------------------
// Players & Leaderboard Storage
// -------------------------------------------------------------
export function getLocalPlayers(): Player[] {
  return getLocalItem<Player[]>(STORAGE_KEY_PLAYERS, []);
}

export function saveLocalPlayers(players: Player[]): void {
  setLocalItem(STORAGE_KEY_PLAYERS, players);
}

export function registerLocalPlayer(name: string): Player {
  const players = getLocalPlayers();
  const trimmed = name.trim();
  
  // Check if player already exists
  const existing = players.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    existing.isOnline = true;
    saveLocalPlayers(players);
    return existing;
  }

  const newPlayer: Player = {
    id: "p_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36),
    name: trimmed,
    totalScore: 0,
    correctCount: 0,
    answeredCount: 0,
    answers: {},
    joinedAt: new Date().toISOString(),
    isOnline: true,
  };

  players.push(newPlayer);
  saveLocalPlayers(players);
  return newPlayer;
}

export function getLocalLeaderboard(): LeaderboardEntry[] {
  const players = getLocalPlayers();
  const sorted = [...players].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    if (b.correctCount !== a.correctCount) {
      return b.correctCount - a.correctCount;
    }
    return (new Date(a.joinedAt || 0).getTime()) - (new Date(b.joinedAt || 0).getTime());
  });

  return sorted.map((p, idx) => ({
    id: p.id,
    name: p.name,
    totalScore: Math.round(p.totalScore * 100) / 100,
    correctCount: p.correctCount,
    answeredCount: p.answeredCount,
    rank: idx + 1,
    isOnline: p.isOnline !== false,
  }));
}

export function submitLocalAnswer(
  playerId: string,
  questionId: number,
  selectedOption: number,
  timeRemaining: number
): { success: boolean; scoreEarned: number; isCorrect: boolean; player?: Player } {
  const players = getLocalPlayers();
  const player = players.find((p) => p.id === playerId);
  if (!player) {
    return { success: false, scoreEarned: 0, isCorrect: false };
  }

  const questions = getLocalQuestions();
  const question = questions.find((q) => q.id === questionId);
  if (!question) {
    return { success: false, scoreEarned: 0, isCorrect: false };
  }

  const isCorrect = selectedOption === question.correctIndex;
  let scoreEarned = 0;

  if (isCorrect) {
    // Speed-decay scoring: 5.00 * (timeRemaining / duration)
    const settings = getLocalSettings();
    const duration = settings.questionDuration || 20;
    const maxPoints = settings.maxPointsPerQuestion || 5;
    const ratio = Math.max(0, Math.min(1, timeRemaining / duration));
    scoreEarned = Math.round((maxPoints * ratio) * 100) / 100;
  }

  if (!player.answers) player.answers = {};
  const answerRecord: PlayerAnswer = {
    questionId,
    selectedOption,
    isCorrect,
    score: scoreEarned,
    timeRemaining,
    answeredAt: new Date().toISOString(),
  };
  player.answers[questionId] = answerRecord;

  player.answeredCount = Object.keys(player.answers).length;
  player.correctCount = Object.values(player.answers).filter((a) => a.isCorrect).length;
  player.totalScore = Math.round(
    Object.values(player.answers).reduce((sum, a) => sum + (a.score || 0), 0) * 100
  ) / 100;

  saveLocalPlayers(players);
  return { success: true, scoreEarned, isCorrect, player };
}

// -------------------------------------------------------------
// Game State Storage
// -------------------------------------------------------------
export function getLocalGameState(): GameState {
  const questions = getLocalQuestions();
  const defaultState: GameState = {
    status: "lobby",
    currentQuestionIndex: 0,
    totalQuestions: questions.length || 15,
    currentQuestion: questions[0] || undefined,
    questionStartTime: 0,
    questionDuration: 20,
    serverTime: Date.now(),
    connectedPlayersCount: getLocalPlayers().length || 1,
    answeredThisRoundCount: 0,
    leaderboard: getLocalLeaderboard(),
  };

  const saved = getLocalItem<GameState | null>(STORAGE_KEY_GAME_STATE, null);
  if (!saved) {
    return defaultState;
  }

  saved.leaderboard = getLocalLeaderboard();
  saved.totalQuestions = questions.length;
  if (saved.currentQuestionIndex >= 0 && saved.currentQuestionIndex < questions.length) {
    saved.currentQuestion = questions[saved.currentQuestionIndex];
  }
  return saved;
}

export function saveLocalGameState(state: GameState): void {
  setLocalItem(STORAGE_KEY_GAME_STATE, state);
}
