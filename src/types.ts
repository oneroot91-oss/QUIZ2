export interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number; // 0-based index
  explanation?: string;
  category?: string;
}

export interface PlayerAnswer {
  questionId: number;
  selectedOption: number; // 0-3, or -1 for timed out
  timeRemaining: number; // in seconds (0 to 20)
  score: number; // 0 to 5 points (5 * (timeRemaining / 20))
  isCorrect: boolean;
  answeredAt: string;
}

export interface Player {
  id: string;
  name: string;
  totalScore: number;
  correctCount: number;
  answeredCount: number;
  answers: Record<number, PlayerAnswer>;
  joinedAt: string;
  isOnline?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  totalScore: number;
  correctCount: number;
  answeredCount: number;
  lastQuestionScore?: number;
  lastQuestionCorrect?: boolean;
  averageSpeedSeconds?: number;
  answers?: Record<number, PlayerAnswer>;
  joinedAt?: string;
  isOnline?: boolean;
}

export type GameStatus = "lobby" | "question_active" | "question_review" | "game_over";

export interface GameState {
  status: GameStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion?: Question;
  questionStartTime: number; // epoch ms
  questionDuration: number; // 20s
  serverTime: number; // epoch ms
  connectedPlayersCount: number;
  answeredThisRoundCount: number;
  leaderboard: LeaderboardEntry[];
  lastRoundResults?: {
    questionId: number;
    correctIndex: number;
    question: string;
    explanation?: string;
    topSpeedPlayer?: { name: string; timeRemaining: number; score: number };
  };
}

export interface AppSettings {
  quizEnabled: boolean;
  allowSubmissions: boolean;
  adminEntryEnabled: boolean;
  adminPassword?: string;
  questionDuration: number; // default 20s
  maxPointsPerQuestion: number; // 5 pts
  autoAdvance: boolean;
  autoAdvanceDelay: number; // seconds in review mode
}

export const DEFAULT_QUESTION_DURATION = 20; // 20 seconds
export const MAX_POINTS_PER_QUESTION = 5; // 5 max points

/**
 * Speed-based decay scoring formula:
 * Correct Score = 5 * (Time Remaining in Seconds / 20)
 * Incorrect or timed-out = 0
 */
export function calculateSpeedScore(isCorrect: boolean, timeRemainingSeconds: number, duration: number = DEFAULT_QUESTION_DURATION): number {
  if (!isCorrect) return 0;
  const clampedTime = Math.max(0, Math.min(duration, timeRemainingSeconds));
  const rawScore = MAX_POINTS_PER_QUESTION * (clampedTime / duration);
  // Round to 2 decimal places
  return Math.round(rawScore * 100) / 100;
}
