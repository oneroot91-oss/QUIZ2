import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "data.json");
const SETTINGS_FILE = path.join(process.cwd(), "settings.json");
const QUESTIONS_FILE = path.join(process.cwd(), "questions.json");
const DEVICES_FILE = path.join(process.cwd(), "devices.json");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@1965#IT";
const ADMIN_RECOVERY_PASSCODE = process.env.ADMIN_RECOVERY_PASSCODE || "0099887766";

app.use(express.json());

// Canonical 15 questions with correct answers (ordered sequentially - NO SHUFFLING)
const DEFAULT_QUESTIONS = [
  {
    id: 1,
    question: "In which year was Onam officially declared as the state festival of Kerala?",
    options: ["1956", "1961", "1965", "1970"],
    correctIndex: 1, // 1961
    explanation: "The Government of Kerala officially declared Onam as the National Festival of Kerala in 1961.",
    category: "History & Heritage"
  },
  {
    id: 2,
    question: "Which historic town in Kerala is famous for launching Onam with the \"Athachamayam\" street parade?",
    options: ["Thrikkakara", "Thripunithura", "Thrissur", "Aranmula"],
    correctIndex: 1, // Thripunithura
    explanation: "Athachamayam at Thripunithura (Kochi) marks the royal beginning of the 10-day Onam festival.",
    category: "Festivals & Royalty"
  },
  {
    id: 3,
    question: "Which flower is mandatory for building the first layer of Pookkalam on Atham day?",
    options: ["Chetti Poovu", "Thumba Poovu", "Arali", "Chemparathi"],
    correctIndex: 1, // Thumba Poovu
    explanation: "Thumba Poovu (Lucas aspera), a small white wildflower, is sacred and traditionally placed at the center on Atham.",
    category: "Traditions & Botany"
  },
  {
    id: 4,
    question: "Which temple in Kerala is dedicated to Lord Vamana and considered the epicenter of Onam?",
    options: ["Guruvayur", "Thrikkakara", "Ambalappuzha", "Sabarimala"],
    correctIndex: 1, // Thrikkakara
    explanation: "Thrikkakara Temple near Kochi is dedicated to Vamana Murthi and linked to King Mahabali.",
    category: "Mythology & Temples"
  },
  {
    id: 5,
    question: "On which star day is the famous Aranmula Snake Boat Race held?",
    options: ["Atham", "Uthradam", "Uthrattathi", "Thiruvonam"],
    correctIndex: 2, // Uthrattathi
    explanation: "The famous Aranmula Uthrattathi Vallamkali is held on the Uthrattathi asterism in Chingam on the Pampa River.",
    category: "Sports & River Culture"
  },
  {
    id: 6,
    question: "What is the pyramid-shaped clay figure worshipped in homes during Onam called?",
    options: ["Thrikkakara Appan / Onathappan", "Kummatti", "Kathakali Kolam", "Pulikali Appan"],
    correctIndex: 0, // Thrikkakara Appan
    explanation: "Thrikkakara Appan (or Onathappan) are clay pyramids representing Lord Vamana and King Mahabali.",
    category: "Rituals & Customs"
  },
  {
    id: 7,
    question: "What ceremonial painted wooden bow is offered at Padmanabhaswamy Temple during Onam?",
    options: ["Onapillai", "Onavillu", "Onavallam", "Onakodi"],
    correctIndex: 1, // Onavillu
    explanation: "Onavillu is a ceremonial broad painted wooden bow offered at the Sree Padmanabhaswamy Temple on Thiruvonam.",
    category: "Temple Arts"
  },
  {
    id: 8,
    question: "Complete the proverb: \"_____ vittum Onam unnanam\"?",
    options: ["Ari", "Kanam", "Veedu", "Ponn"],
    correctIndex: 1, // Kanam
    explanation: "\"Kanam vittum Onam unnanam\" means \"One must feast on Onam even if one has to sell one's landed property (Kanam)\".",
    category: "Literature & Folklore"
  },
  {
    id: 9,
    question: "Pulikali (Tiger Dance) in Thrissur Swaraj Round is performed on which day of Onam?",
    options: ["Atham", "First Onam", "Fourth Onam", "Thiruvonam"],
    correctIndex: 2, // Fourth Onam
    explanation: "Pulikali is performed in Thrissur Swaraj Round on the 4th Onam day (Nalaam Onam).",
    category: "Folk Arts & Spectacles"
  },
  {
    id: 10,
    question: "In the 10-day sequence from Atham, which star represents the 5th day?",
    options: ["Chodi", "Visakam", "Anizham", "Pooradam"],
    correctIndex: 2, // Anizham
    explanation: "The 10 stars in sequence are Atham, Chithira, Chodhi, Vishakam, Anizham, Thrikketa, Moolam, Pooradam, Uthradam, Thiruvonam.",
    category: "Astronomy & Calendar"
  },
  {
    id: 11,
    question: "What is the traditional bare-chested martial duel played during Onam called?",
    options: ["Kalari Payattu", "Onathallu / Kayyankali", "Vadamvali", "Kambathallu"],
    correctIndex: 1, // Onathallu / Kayyankali
    explanation: "Onathallu (Kayyankali) is a traditional bare-handed combat sport played during Onam.",
    category: "Martial Arts & Games"
  },
  {
    id: 12,
    question: "When serving Onam Sadya, which way should the narrow end of the banana leaf face?",
    options: ["Right of guest", "Left of guest", "Towards guest", "Away from guest"],
    correctIndex: 1, // Left of guest
    explanation: "In traditional Kerala Sadya etiquette, the plantain leaf's narrow tip points towards the diner's left.",
    category: "Gastronomy & Etiquette"
  },
  {
    id: 13,
    question: "Which traditional women's folk dance performed in a circle during Onam is named after a dragonfly?",
    options: ["Thiruvathirakali", "Thumbi Thullal", "Margamkali", "Oppana"],
    correctIndex: 1, // Thumbi Thullal
    explanation: "Thumbi Thullal is an ancient dance performed by women seated in a circle around a lead dancer.",
    category: "Dance & Music"
  },
  {
    id: 14,
    question: "What is the 9th day of Onam (Uthradam) popularly known as?",
    options: ["First Onam", "Main Onam", "Third Onam", "Rendam Onam"],
    correctIndex: 0, // First Onam
    explanation: "Uthradam is celebrated as 'Onnam Onam' (First Onam), while Thiruvonam is the main celebration.",
    category: "Calendar Traditions"
  },
  {
    id: 15,
    question: "What is the traditional wooden swing decorated with flowers set up during Onam called?",
    options: ["Pookkalam", "Oonjal", "Onavillu", "Vallam"],
    correctIndex: 1, // Oonjal
    explanation: "Oonjal (Ona-oonjal) is the traditional flower-decked rope swing suspended during Onam.",
    category: "Celebrations & Play"
  }
];

// Helper to read players/submissions from data.json
interface PlayerRecord {
  id: string;
  name: string;
  totalScore: number;
  correctCount: number;
  answeredCount: number;
  deviceId?: string;
  deviceFingerprint?: string;
  isCompleted?: boolean;
  completedAt?: string;
  answers: Record<number, {
    questionId: number;
    selectedOption: number;
    timeRemaining: number;
    score: number;
    isCorrect: boolean;
    answeredAt: string;
  }>;
  joinedAt: string;
  lastActive?: string;
}

interface DeviceRecord {
  deviceId: string;
  deviceFingerprint?: string;
  playerId: string;
  playerName: string;
  totalScore: number;
  correctCount: number;
  answeredCount: number;
  registeredAt: string;
  completedAt?: string;
  isCompleted: boolean;
}

function readDevices(): DeviceRecord[] {
  try {
    if (!fs.existsSync(DEVICES_FILE)) {
      fs.writeFileSync(DEVICES_FILE, JSON.stringify([], null, 2), "utf-8");
      return [];
    }
    const raw = fs.readFileSync(DEVICES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading devices.json:", err);
    return [];
  }
}

function writeDevices(data: DeviceRecord[]): boolean {
  try {
    fs.writeFileSync(DEVICES_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing devices.json:", err);
    return false;
  }
}

function readPlayers(): PlayerRecord[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Normalize existing records if any old schema exists
    return parsed.map((item: any) => ({
      id: item.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: item.name || "Anonymous Player",
      totalScore: typeof item.totalScore === "number" ? item.totalScore : (item.score || 0),
      correctCount: typeof item.correctCount === "number" ? item.correctCount : 0,
      answeredCount: typeof item.answeredCount === "number" ? item.answeredCount : (item.totalQuestions || 0),
      deviceId: item.deviceId,
      deviceFingerprint: item.deviceFingerprint,
      isCompleted: item.isCompleted || false,
      completedAt: item.completedAt,
      answers: item.answers || {},
      joinedAt: item.joinedAt || item.timestamp || new Date().toISOString(),
      lastActive: item.lastActive || item.timestamp || new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Error reading data.json:", err);
    return [];
  }
}

function writePlayers(data: PlayerRecord[]): boolean {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing data.json:", err);
    return false;
  }
}

// Helper to read settings
interface AppSettingsData {
  quizEnabled: boolean;
  allowSubmissions: boolean;
  adminEntryEnabled: boolean;
  adminPassword?: string;
  questionDuration: number; // default 20s
  maxPointsPerQuestion: number; // default 5 pts
  autoAdvance: boolean;
  autoAdvanceDelay: number; // default 5s
}

function readSettings(): AppSettingsData {
  const defaultSettings: AppSettingsData = {
    quizEnabled: true,
    allowSubmissions: true,
    adminEntryEnabled: true,
    adminPassword: ADMIN_PASSWORD,
    questionDuration: 20, // 20s
    maxPointsPerQuestion: 5, // 5 points max
    autoAdvance: true,
    autoAdvanceDelay: 6, // 6 seconds in review screen
  };

  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), "utf-8");
      return defaultSettings;
    }
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...defaultSettings,
      ...parsed,
      questionDuration: Number(parsed.questionDuration) || 20,
      maxPointsPerQuestion: Number(parsed.maxPointsPerQuestion) || 5,
    };
  } catch (err) {
    console.error("Error reading settings.json:", err);
    return defaultSettings;
  }
}

function writeSettings(settings: any): boolean {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing settings.json:", err);
    return false;
  }
}

function getAdminPassword(): string {
  const settings = readSettings();
  return settings.adminPassword || ADMIN_PASSWORD;
}

// Helper to read questions
function readQuestions(): any[] {
  try {
    if (!fs.existsSync(QUESTIONS_FILE)) {
      fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(DEFAULT_QUESTIONS, null, 2), "utf-8");
      return DEFAULT_QUESTIONS;
    }
    const raw = fs.readFileSync(QUESTIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_QUESTIONS;
  } catch (err) {
    console.error("Error reading questions.json:", err);
    return DEFAULT_QUESTIONS;
  }
}

function writeQuestions(questions: any[]): boolean {
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing questions.json:", err);
    return false;
  }
}

// --- Speed Scoring Calculation ---
/**
 * Maximum score = 5 points
 * Speed-decay formula:
 * Correct Score = 5 * (Time Remaining / 20)
 * Incorrect or timeout = 0
 */
function calculateSpeedScore(isCorrect: boolean, timeRemaining: number, maxPoints = 5, duration = 20): number {
  if (!isCorrect) return 0;
  const clampedTime = Math.max(0, Math.min(duration, timeRemaining));
  const score = maxPoints * (clampedTime / duration);
  return Math.round(score * 100) / 100;
}

// =========================================================================
// REAL-TIME SYNCHRONOUS GAME ENGINE & STATE
// =========================================================================

type GameStatus = "lobby" | "question_active" | "question_review" | "game_over";

interface GameEngineState {
  status: GameStatus;
  currentQuestionIndex: number;
  questionStartTime: number; // ms
  questionDuration: number; // 20s
  answersForCurrentQ: Record<string, {
    playerId: string;
    playerName: string;
    selectedOption: number;
    timeRemaining: number;
    score: number;
    isCorrect: boolean;
    submittedAt: number;
  }>;
  roundTimer: NodeJS.Timeout | null;
  reviewTimer: NodeJS.Timeout | null;
}

const gameEngine: GameEngineState = {
  status: "lobby",
  currentQuestionIndex: 0,
  questionStartTime: 0,
  questionDuration: 20,
  answersForCurrentQ: {},
  roundTimer: null,
  reviewTimer: null,
};

// WebSocket connected clients tracking
interface ConnectedClient {
  ws: WebSocket;
  playerId?: string;
  playerName?: string;
  isAdmin?: boolean;
}

const clients = new Set<ConnectedClient>();

function getRankedLeaderboard() {
  const players = readPlayers();
  const sorted = [...players].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    if (b.correctCount !== a.correctCount) {
      return b.correctCount - a.correctCount;
    }
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  });

  const onlinePlayerIds = new Set<string>();
  clients.forEach(c => {
    if (c.playerId) onlinePlayerIds.add(c.playerId);
  });

  return sorted.map((p, idx) => {
    const currentQ = readQuestions()[gameEngine.currentQuestionIndex];
    const currentQAnswer = currentQ ? p.answers?.[currentQ.id] : undefined;

    return {
      rank: idx + 1,
      id: p.id,
      name: p.name,
      totalScore: p.totalScore,
      correctCount: p.correctCount,
      answeredCount: p.answeredCount,
      lastQuestionScore: currentQAnswer?.score,
      lastQuestionCorrect: currentQAnswer?.isCorrect,
      answers: p.answers,
      joinedAt: p.joinedAt,
      isOnline: onlinePlayerIds.has(p.id),
    };
  });
}

function broadcastGameState() {
  const questions = readQuestions();
  const settings = readSettings();
  const currentQ = questions[gameEngine.currentQuestionIndex];
  const leaderboard = getRankedLeaderboard();

  // Find top speed player for current question if any
  let topSpeedPlayer: { name: string; timeRemaining: number; score: number } | undefined = undefined;
  const currentQAnswers = Object.values(gameEngine.answersForCurrentQ).filter(a => a.isCorrect);
  if (currentQAnswers.length > 0) {
    currentQAnswers.sort((a, b) => b.timeRemaining - a.timeRemaining || b.score - a.score);
    const top = currentQAnswers[0];
    topSpeedPlayer = {
      name: top.playerName,
      timeRemaining: top.timeRemaining,
      score: top.score,
    };
  }

  const payload = {
    type: "GAME_STATE_UPDATE",
    state: {
      status: gameEngine.status,
      currentQuestionIndex: gameEngine.currentQuestionIndex,
      totalQuestions: questions.length,
      currentQuestion: currentQ
        ? {
            id: currentQ.id,
            question: currentQ.question,
            options: currentQ.options,
            category: currentQ.category,
            // Reveal correct answer & explanation ONLY in review or game_over mode
            ...(gameEngine.status === "question_review" || gameEngine.status === "game_over"
              ? {
                  correctIndex: currentQ.correctIndex,
                  explanation: currentQ.explanation,
                }
              : {}),
          }
        : null,
      questionStartTime: gameEngine.questionStartTime,
      questionDuration: settings.questionDuration || 20,
      serverTime: Date.now(),
      connectedPlayersCount: clients.size,
      answeredThisRoundCount: Object.keys(gameEngine.answersForCurrentQ).length,
      leaderboard,
      lastRoundResults:
        gameEngine.status === "question_review" && currentQ
          ? {
              questionId: currentQ.id,
              correctIndex: currentQ.correctIndex,
              question: currentQ.question,
              explanation: currentQ.explanation,
              topSpeedPlayer,
            }
          : undefined,
    },
  };

  const json = JSON.stringify(payload);
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(json);
    }
  });
}

function clearGameTimers() {
  if (gameEngine.roundTimer) {
    clearTimeout(gameEngine.roundTimer);
    gameEngine.roundTimer = null;
  }
  if (gameEngine.reviewTimer) {
    clearTimeout(gameEngine.reviewTimer);
    gameEngine.reviewTimer = null;
  }
}

function startQuestionRound(questionIndex: number) {
  clearGameTimers();
  const questions = readQuestions();
  const settings = readSettings();

  if (questionIndex >= questions.length) {
    // End of quiz -> Game Over
    gameEngine.status = "game_over";
    broadcastGameState();
    return;
  }

  gameEngine.status = "question_active";
  gameEngine.currentQuestionIndex = questionIndex;
  gameEngine.questionStartTime = Date.now();
  gameEngine.questionDuration = settings.questionDuration || 20;
  gameEngine.answersForCurrentQ = {};

  broadcastGameState();

  // Strict 20s server countdown timer
  const durationMs = (settings.questionDuration || 20) * 1000;
  gameEngine.roundTimer = setTimeout(() => {
    finishQuestionRound();
  }, durationMs + 200); // 200ms grace for network latency
}

function finishQuestionRound() {
  clearGameTimers();
  if (gameEngine.status !== "question_active") return;

  const questions = readQuestions();
  const settings = readSettings();
  const currentQ = questions[gameEngine.currentQuestionIndex];
  const players = readPlayers();

  // If some connected players didn't answer before 0s, mark them with 0 points
  if (currentQ) {
    players.forEach((p) => {
      if (!p.answers[currentQ.id]) {
        p.answers[currentQ.id] = {
          questionId: currentQ.id,
          selectedOption: -1, // Timed out
          timeRemaining: 0,
          score: 0,
          isCorrect: false,
          answeredAt: new Date().toISOString(),
        };
        p.answeredCount = Object.keys(p.answers).length;
      }
    });
    writePlayers(players);
  }

  gameEngine.status = "question_review";
  broadcastGameState();

  // Auto advance if configured
  if (settings.autoAdvance) {
    const delayMs = (settings.autoAdvanceDelay || 6) * 1000;
    gameEngine.reviewTimer = setTimeout(() => {
      const nextIdx = gameEngine.currentQuestionIndex + 1;
      if (nextIdx < questions.length) {
        startQuestionRound(nextIdx);
      } else {
        gameEngine.status = "game_over";
        broadcastGameState();
      }
    }, delayMs);
  }
}

function submitPlayerAnswer(playerId: string, questionId: number, selectedOption: number, clientTimeRemaining?: number) {
  const questions = readQuestions();
  const settings = readSettings();
  const currentQ = questions[gameEngine.currentQuestionIndex];

  if (!currentQ || currentQ.id !== questionId) {
    return { error: "Question not currently active." };
  }

  if (gameEngine.status !== "question_active") {
    return { error: "Question round has closed." };
  }

  const players = readPlayers();
  const playerIndex = players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return { error: "Player not found." };
  }

  const player = players[playerIndex];

  // Calculate actual remaining time based on server timestamp
  const duration = settings.questionDuration || 20;
  const elapsedSeconds = (Date.now() - gameEngine.questionStartTime) / 1000;
  const serverTimeRemaining = Math.max(0, Math.min(duration, duration - elapsedSeconds));
  
  // Use client time remaining if provided and reasonably close to server time (within 1.5s tolerance)
  let effectiveTimeRemaining = serverTimeRemaining;
  if (typeof clientTimeRemaining === "number" && !isNaN(clientTimeRemaining)) {
    if (Math.abs(clientTimeRemaining - serverTimeRemaining) < 2.0) {
      effectiveTimeRemaining = Math.max(0, Math.min(duration, clientTimeRemaining));
    }
  }

  const isCorrect = selectedOption === currentQ.correctIndex;
  const speedScore = calculateSpeedScore(
    isCorrect,
    effectiveTimeRemaining,
    settings.maxPointsPerQuestion || 5,
    duration
  );

  const answerRecord = {
    questionId: currentQ.id,
    selectedOption,
    timeRemaining: Math.round(effectiveTimeRemaining * 100) / 100,
    score: speedScore,
    isCorrect,
    answeredAt: new Date().toISOString(),
  };

  player.answers[currentQ.id] = answerRecord;
  
  // Recompute player cumulative totals
  let totalScore = 0;
  let correctCount = 0;
  Object.values(player.answers).forEach((ans: any) => {
    totalScore += ans.score || 0;
    if (ans.isCorrect) correctCount++;
  });

  player.totalScore = Math.round(totalScore * 100) / 100;
  player.correctCount = correctCount;
  player.answeredCount = Object.keys(player.answers).length;
  player.lastActive = new Date().toISOString();

  // If player answered all questions, mark completed
  if (player.answeredCount >= questions.length) {
    player.isCompleted = true;
    player.completedAt = new Date().toISOString();
  }

  players[playerIndex] = player;
  writePlayers(players);

  // Update device record if deviceId is linked
  if (player.deviceId) {
    const devices = readDevices();
    const dIdx = devices.findIndex((d) => d.deviceId === player.deviceId);
    if (dIdx !== -1) {
      devices[dIdx].totalScore = player.totalScore;
      devices[dIdx].correctCount = player.correctCount;
      devices[dIdx].answeredCount = player.answeredCount;
      if (player.isCompleted) {
        devices[dIdx].isCompleted = true;
        devices[dIdx].completedAt = player.completedAt;
      }
      writeDevices(devices);
    }
  }

  // Store in round engine answers
  gameEngine.answersForCurrentQ[playerId] = {
    playerId,
    playerName: player.name,
    selectedOption,
    timeRemaining: answerRecord.timeRemaining,
    score: speedScore,
    isCorrect,
    submittedAt: Date.now(),
  };

  broadcastGameState();

  // If ALL connected online players have answered, conclude round early
  const onlineNonAdminPlayers = Array.from(clients).filter(c => c.playerId && !c.isAdmin);
  if (onlineNonAdminPlayers.length > 0 && onlineNonAdminPlayers.every(c => c.playerId && gameEngine.answersForCurrentQ[c.playerId])) {
    setTimeout(() => {
      finishQuestionRound();
    }, 600);
  }

  return {
    success: true,
    score: speedScore,
    timeRemaining: answerRecord.timeRemaining,
    isCorrect,
    totalScore: player.totalScore,
  };
}

// Middleware: Admin Auth Check
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const pwd = req.headers["x-admin-password"] || req.body?.password || (req.query?.password as string);
  const currentAdminPassword = getAdminPassword();
  if (pwd && (pwd === currentAdminPassword || pwd === ADMIN_PASSWORD || pwd === ADMIN_RECOVERY_PASSCODE)) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized. Incorrect admin password." });
  }
}

// =========================================================================
// PUBLIC REST API ENDPOINTS
// =========================================================================

// 1. Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 2. Questions endpoint (Canonical sequential order)
app.get("/api/questions", (_req, res) => {
  const questions = readQuestions();
  res.json({ questions });
});

// 3. Register or Join as Individual Player with Anti-Duplicate Device Tracking
const handlePlayerJoin = (req: express.Request, res: express.Response) => {
  const { name, playerId, deviceId, deviceFingerprint } = req.body;
  const settings = readSettings();

  if (!settings.quizEnabled || !settings.allowSubmissions) {
    res.status(403).json({ error: "Quiz entry is currently paused by hospital administration." });
    return;
  }

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Participant Name is required." });
    return;
  }

  const trimmedName = name.trim();
  const players = readPlayers();
  const devices = readDevices();

  // 1. Check if this device has already completed 15 questions
  if (deviceId) {
    const existingDevice = devices.find((d) => d.deviceId === deviceId || (deviceFingerprint && d.deviceFingerprint === deviceFingerprint));
    if (existingDevice && existingDevice.isCompleted) {
      res.status(403).json({
        error: "DEVICE_ALREADY_COMPLETED",
        message: `This phone has already finished all 15 questions as "${existingDevice.playerName}". Each device is strictly limited to 1 attempt to ensure leaderboard integrity.`,
        record: existingDevice,
        completed: true,
      });
      return;
    }
  }

  // 2. Check if a player with this ID, deviceId, or exact Name already exists
  let player: PlayerRecord;
  const existingIdx = players.findIndex(
    (p) => (playerId && p.id === playerId) || (deviceId && p.deviceId === deviceId) || p.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (existingIdx !== -1) {
    player = players[existingIdx];
    // If player already completed 15 questions
    if (player.isCompleted || player.answeredCount >= readQuestions().length) {
      res.status(403).json({
        error: "DEVICE_ALREADY_COMPLETED",
        message: `You have already completed all 15 questions as "${player.name}" (Score: ${player.totalScore.toFixed(2)} pts). Re-entering is locked.`,
        player,
        completed: true,
      });
      return;
    }
    player.lastActive = new Date().toISOString();
    if (deviceId) player.deviceId = deviceId;
    if (deviceFingerprint) player.deviceFingerprint = deviceFingerprint;
    players[existingIdx] = player;
  } else {
    player = {
      id: playerId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      totalScore: 0,
      correctCount: 0,
      answeredCount: 0,
      deviceId: deviceId || undefined,
      deviceFingerprint: deviceFingerprint || undefined,
      isCompleted: false,
      answers: {},
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };
    players.push(player);
  }

  writePlayers(players);

  // Update or insert device tracking record
  if (deviceId) {
    const devIdx = devices.findIndex((d) => d.deviceId === deviceId);
    const devRecord: DeviceRecord = {
      deviceId,
      deviceFingerprint: deviceFingerprint || undefined,
      playerId: player.id,
      playerName: player.name,
      totalScore: player.totalScore,
      correctCount: player.correctCount,
      answeredCount: player.answeredCount,
      registeredAt: player.joinedAt,
      isCompleted: player.isCompleted || false,
    };
    if (devIdx !== -1) {
      devices[devIdx] = devRecord;
    } else {
      devices.push(devRecord);
    }
    writeDevices(devices);
  }

  broadcastGameState();

  res.json({
    success: true,
    player,
    leaderboard: getRankedLeaderboard(),
  });
};

app.post("/api/players/join", handlePlayerJoin);
app.post("/api/register", handlePlayerJoin);

// 4. Mark Player & Device as Completed (Explicit Finalization)
app.post("/api/player/complete", (req, res) => {
  const { playerId, deviceId, deviceFingerprint, totalScore, correctCount } = req.body;
  const players = readPlayers();
  const devices = readDevices();

  if (playerId) {
    const pIdx = players.findIndex((p) => p.id === playerId);
    if (pIdx !== -1) {
      players[pIdx].isCompleted = true;
      players[pIdx].completedAt = new Date().toISOString();
      if (typeof totalScore === "number") players[pIdx].totalScore = totalScore;
      if (typeof correctCount === "number") players[pIdx].correctCount = correctCount;
      writePlayers(players);
    }
  }

  if (deviceId) {
    const devIdx = devices.findIndex((d) => d.deviceId === deviceId);
    const matchedPlayer = players.find((p) => p.id === playerId);
    const devRecord: DeviceRecord = {
      deviceId,
      deviceFingerprint: deviceFingerprint || undefined,
      playerId: playerId || (matchedPlayer ? matchedPlayer.id : "unknown"),
      playerName: matchedPlayer ? matchedPlayer.name : "Participant",
      totalScore: typeof totalScore === "number" ? totalScore : (matchedPlayer?.totalScore || 0),
      correctCount: typeof correctCount === "number" ? correctCount : (matchedPlayer?.correctCount || 0),
      answeredCount: matchedPlayer?.answeredCount || 15,
      registeredAt: matchedPlayer?.joinedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      isCompleted: true,
    };
    if (devIdx !== -1) {
      devices[devIdx] = devRecord;
    } else {
      devices.push(devRecord);
    }
    writeDevices(devices);
  }

  broadcastGameState();
  res.json({ success: true, message: "Player attempt officially recorded and sealed." });
});

// 4. Settings endpoint (Public)
app.get("/api/settings", (_req, res) => {
  const settings = readSettings();
  res.json({
    settings: {
      questionDuration: settings.questionDuration || 20,
      maxPointsPerQuestion: settings.maxPointsPerQuestion || 5,
      quizEnabled: settings.quizEnabled !== false,
      allowSubmissions: settings.allowSubmissions !== false,
      adminEntryEnabled: settings.adminEntryEnabled !== false,
      autoAdvance: settings.autoAdvance !== false,
      autoAdvanceDelay: settings.autoAdvanceDelay || 6,
    },
  });
});

// 4. Submit Answer via REST (fallback or client direct)
app.post("/api/submissions", (req, res) => {
  const { playerId, questionId, selectedOption, timeRemaining } = req.body;

  if (!playerId) {
    res.status(400).json({ error: "Player ID is required." });
    return;
  }

  const result = submitPlayerAnswer(playerId, Number(questionId), Number(selectedOption), Number(timeRemaining));
  if (result.error) {
    res.status(400).json(result);
  } else {
    res.json(result);
  }
});

// 5. Leaderboard endpoint
app.get("/api/leaderboard", (_req, res) => {
  const leaderboard = getRankedLeaderboard();
  const players = readPlayers();
  const questions = readQuestions();
  const settings = readSettings();

  res.json({
    totalParticipants: players.length,
    totalQuestions: questions.length,
    leaderboard,
    settings: {
      questionDuration: settings.questionDuration,
      maxPointsPerQuestion: settings.maxPointsPerQuestion,
      quizEnabled: settings.quizEnabled,
      allowSubmissions: settings.allowSubmissions,
      adminEntryEnabled: settings.adminEntryEnabled,
    },
  });
});

// 6. Current Game State endpoint
app.get("/api/game/state", (_req, res) => {
  const questions = readQuestions();
  const settings = readSettings();
  const currentQ = questions[gameEngine.currentQuestionIndex];
  const leaderboard = getRankedLeaderboard();

  res.json({
    status: gameEngine.status,
    currentQuestionIndex: gameEngine.currentQuestionIndex,
    totalQuestions: questions.length,
    currentQuestion: currentQ
      ? {
          id: currentQ.id,
          question: currentQ.question,
          options: currentQ.options,
          category: currentQ.category,
          ...(gameEngine.status === "question_review" || gameEngine.status === "game_over"
            ? {
                correctIndex: currentQ.correctIndex,
                explanation: currentQ.explanation,
              }
            : {}),
        }
      : null,
    questionStartTime: gameEngine.questionStartTime,
    questionDuration: settings.questionDuration || 20,
    serverTime: Date.now(),
    connectedPlayersCount: clients.size,
    answeredThisRoundCount: Object.keys(gameEngine.answersForCurrentQ).length,
    leaderboard,
  });
});

// 7. Data Export
app.get("/api/data-export", (_req, res) => {
  const players = readPlayers();
  res.setHeader("Content-Disposition", "attachment; filename=onam-quiz-players-leaderboard.json");
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(players, null, 2));
});

// 8. Reset Data
app.post("/api/reset-data", (_req, res) => {
  writePlayers([]);
  gameEngine.status = "lobby";
  gameEngine.currentQuestionIndex = 0;
  gameEngine.answersForCurrentQ = {};
  clearGameTimers();
  broadcastGameState();
  res.json({ success: true, message: "Cleared all player entries and reset leaderboard to 0." });
});

// =========================================================================
// ADMIN CONTROL REST API ENDPOINTS
// =========================================================================

// Admin Login Verification
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  const currentAdminPassword = getAdminPassword();
  const settings = readSettings();

  if (password === currentAdminPassword) {
    res.json({
      success: true,
      message: "Admin access granted.",
      adminEntryEnabled: settings.adminEntryEnabled !== false,
    });
  } else {
    res.status(401).json({ success: false, error: "Incorrect admin password. Please try again." });
  }
});

// Admin Recovery Passcode Verification
app.post("/api/admin/verify-passcode", (req, res) => {
  const { passcode } = req.body;
  if (passcode !== undefined && String(passcode).trim() === ADMIN_RECOVERY_PASSCODE) {
    res.json({
      success: true,
      message: "Master recovery passcode verified successfully.",
    });
  } else {
    res.status(401).json({
      success: false,
      error: "Invalid passcode. Please enter the correct master recovery passcode.",
    });
  }
});

// Admin Reset Password Using Recovery Passcode
app.post("/api/admin/reset-password-with-passcode", (req, res) => {
  const { passcode, newPassword } = req.body;

  if (passcode === undefined || String(passcode).trim() !== ADMIN_RECOVERY_PASSCODE) {
    res.status(401).json({
      success: false,
      error: "Invalid master recovery passcode. Password reset denied.",
    });
    return;
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 4) {
    res.status(400).json({
      success: false,
      error: "New password must be at least 4 characters long.",
    });
    return;
  }

  const settings = readSettings();
  const sanitizedNewPwd = newPassword.trim();
  settings.adminPassword = sanitizedNewPwd;
  writeSettings(settings);

  res.json({
    success: true,
    message: "Admin password successfully reset and updated.",
    newPassword: sanitizedNewPwd,
  });
});

// Admin Change Password
app.post("/api/admin/change-password", requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const activePassword = getAdminPassword();

  if (currentPassword !== activePassword) {
    res.status(400).json({ success: false, error: "Current admin password verification failed." });
    return;
  }

  if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 4) {
    res.status(400).json({ success: false, error: "New password must be at least 4 characters long." });
    return;
  }

  const settings = readSettings();
  const sanitizedNewPwd = newPassword.trim();
  settings.adminPassword = sanitizedNewPwd;
  writeSettings(settings);

  res.json({
    success: true,
    message: "Admin password successfully updated.",
    newPassword: sanitizedNewPwd,
  });
});

// Admin Toggle Entry Page Status
app.post("/api/admin/toggle-entry", requireAdmin, (req, res) => {
  const { enabled } = req.body;
  const settings = readSettings();
  settings.adminEntryEnabled = Boolean(enabled);
  writeSettings(settings);

  res.json({
    success: true,
    message: `Admin entry page is now ${settings.adminEntryEnabled ? "ACTIVE (Visible)" : "HIDDEN"}.`,
    adminEntryEnabled: settings.adminEntryEnabled,
  });
});

// Admin Overview
app.get("/api/admin/overview", requireAdmin, (_req, res) => {
  const players = readPlayers();
  const questions = readQuestions();
  const settings = readSettings();
  const leaderboard = getRankedLeaderboard();

  res.json({
    success: true,
    players,
    questions,
    settings,
    gameState: {
      status: gameEngine.status,
      currentQuestionIndex: gameEngine.currentQuestionIndex,
      connectedPlayersCount: clients.size,
      answeredThisRoundCount: Object.keys(gameEngine.answersForCurrentQ).length,
    },
    leaderboard,
  });
});

// Admin Game Master Controls
// 1. Start Quiz / Jump to question
app.post("/api/admin/game/start", requireAdmin, (req, res) => {
  const { questionIndex } = req.body;
  const startIdx = typeof questionIndex === "number" ? questionIndex : 0;
  startQuestionRound(startIdx);
  res.json({ success: true, message: `Started Question ${startIdx + 1}`, status: gameEngine.status });
});

// 2. Next Question
app.post("/api/admin/game/next", requireAdmin, (_req, res) => {
  const questions = readQuestions();
  const nextIdx = gameEngine.currentQuestionIndex + 1;
  if (nextIdx < questions.length) {
    startQuestionRound(nextIdx);
    res.json({ success: true, message: `Advanced to Question ${nextIdx + 1}` });
  } else {
    gameEngine.status = "game_over";
    clearGameTimers();
    broadcastGameState();
    res.json({ success: true, message: "Quiz completed. Reached final results." });
  }
});

// 3. Previous Question
app.post("/api/admin/game/previous", requireAdmin, (_req, res) => {
  const prevIdx = Math.max(0, gameEngine.currentQuestionIndex - 1);
  startQuestionRound(prevIdx);
  res.json({ success: true, message: `Returned to Question ${prevIdx + 1}` });
});

// 4. Force End / Reveal Round Review
app.post("/api/admin/game/reveal", requireAdmin, (_req, res) => {
  finishQuestionRound();
  res.json({ success: true, message: "Question closed. Round results revealed." });
});

// 5. Reset to Lobby
app.post("/api/admin/game/reset", requireAdmin, (_req, res) => {
  clearGameTimers();
  gameEngine.status = "lobby";
  gameEngine.currentQuestionIndex = 0;
  gameEngine.answersForCurrentQ = {};
  broadcastGameState();
  res.json({ success: true, message: "Game reset to Lobby mode." });
});

// Admin Edit Individual Player
app.put("/api/admin/players/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  const { name, totalScore } = req.body;

  const players = readPlayers();
  const index = players.findIndex((p) => p.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Participant not found." });
    return;
  }

  players[index] = {
    ...players[index],
    name: name !== undefined ? name.trim() : players[index].name,
    totalScore: totalScore !== undefined ? Math.round(Number(totalScore) * 100) / 100 : players[index].totalScore,
  };

  writePlayers(players);
  broadcastGameState();
  res.json({ success: true, message: "Participant updated.", player: players[index] });
});

// Admin Delete Individual Player
app.delete("/api/admin/players/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  const players = readPlayers();
  const filtered = players.filter((p) => p.id !== id);

  if (filtered.length === players.length) {
    res.status(404).json({ error: "Participant not found." });
    return;
  }

  writePlayers(filtered);
  broadcastGameState();
  res.json({ success: true, message: "Participant removed from leaderboard." });
});

// Admin Manual Player Registration
app.post("/api/admin/players/manual", requireAdmin, (req, res) => {
  const { name, totalScore } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: "Participant Name is required." });
    return;
  }

  const players = readPlayers();
  const newPlayer: PlayerRecord = {
    id: `p_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    totalScore: Math.max(0, Math.round((Number(totalScore) || 0) * 100) / 100),
    correctCount: 0,
    answeredCount: 0,
    answers: {},
    joinedAt: new Date().toISOString(),
  };

  players.push(newPlayer);
  writePlayers(players);
  broadcastGameState();

  res.json({ success: true, message: "Manual player added to leaderboard.", player: newPlayer });
});

// Admin Update Questions List
app.put("/api/admin/questions", requireAdmin, (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({ error: "Invalid questions payload." });
    return;
  }

  writeQuestions(questions);
  broadcastGameState();
  res.json({ success: true, message: "Questions updated successfully.", questions });
});

// Admin Restore Default Questions
app.post("/api/admin/questions/restore-default", requireAdmin, (_req, res) => {
  writeQuestions(DEFAULT_QUESTIONS);
  broadcastGameState();
  res.json({ success: true, message: "Restored default 15 Onam questions.", questions: DEFAULT_QUESTIONS });
});

// Admin Update Game Settings
app.put("/api/admin/settings", requireAdmin, (req, res) => {
  const currentSettings = readSettings();
  const updatedSettings = {
    ...currentSettings,
    ...req.body,
  };

  writeSettings(updatedSettings);
  broadcastGameState();
  res.json({ success: true, message: "Game settings updated.", settings: updatedSettings });
});

// Admin System Reset
app.post("/api/admin/reset-system", requireAdmin, (req, res) => {
  const { target } = req.body;

  if (target === "all-participants") {
    writePlayers([]);
    writeDevices([]);
    gameEngine.status = "lobby";
    gameEngine.currentQuestionIndex = 0;
    gameEngine.answersForCurrentQ = {};
    clearGameTimers();
    
    // Explicit reset broadcast to all clients
    const resetMsg = JSON.stringify({ type: "SYSTEM_RESET", target: "all-participants", timestamp: Date.now() });
    clients.forEach(c => {
      if (c.ws.readyState === WebSocket.OPEN) {
        try { c.ws.send(resetMsg); } catch (e) {}
      }
    });

    broadcastGameState();
    res.json({ success: true, message: "All leaderboard records, participants, and device locks cleared." });
  } else if (target === "factory-reset") {
    writePlayers([]);
    writeDevices([]);
    writeQuestions(DEFAULT_QUESTIONS);
    const defaultSettings: AppSettingsData = {
      quizEnabled: true,
      allowSubmissions: true,
      adminEntryEnabled: true,
      adminPassword: ADMIN_PASSWORD,
      questionDuration: 20,
      maxPointsPerQuestion: 5,
      autoAdvance: true,
      autoAdvanceDelay: 6,
    };
    writeSettings(defaultSettings);
    gameEngine.status = "lobby";
    gameEngine.currentQuestionIndex = 0;
    gameEngine.answersForCurrentQ = {};
    clearGameTimers();

    // Explicit reset broadcast to all clients
    const resetMsg = JSON.stringify({ type: "SYSTEM_RESET", target: "factory-reset", timestamp: Date.now() });
    clients.forEach(c => {
      if (c.ws.readyState === WebSocket.OPEN) {
        try { c.ws.send(resetMsg); } catch (e) {}
      }
    });

    broadcastGameState();
    res.json({ success: true, message: "Complete factory reset successful. Canonical 15 questions, 20s speed scoring, and all device locks restored to defaults." });
  } else if (target === "clear-device-locks") {
    writeDevices([]);
    const players = readPlayers().map(p => ({ ...p, isCompleted: false }));
    writePlayers(players);

    const resetMsg = JSON.stringify({ type: "CLEAR_DEVICE_LOCKS", timestamp: Date.now() });
    clients.forEach(c => {
      if (c.ws.readyState === WebSocket.OPEN) {
        try { c.ws.send(resetMsg); } catch (e) {}
      }
    });

    res.json({ success: true, message: "All phone/device attempt locks have been cleared." });
  } else {
    res.status(400).json({ error: "Invalid reset target." });
  }
});

// =========================================================================
// HTTP & WEBSOCKET SERVER INITIALIZATION
// =========================================================================

async function startServer() {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    const client: ConnectedClient = { ws };
    clients.add(client);

    // Send immediate current state
    const questions = readQuestions();
    const settings = readSettings();
    const currentQ = questions[gameEngine.currentQuestionIndex];
    const leaderboard = getRankedLeaderboard();

    ws.send(
      JSON.stringify({
        type: "INITIAL_STATE",
        state: {
          status: gameEngine.status,
          currentQuestionIndex: gameEngine.currentQuestionIndex,
          totalQuestions: questions.length,
          currentQuestion: currentQ
            ? {
                id: currentQ.id,
                question: currentQ.question,
                options: currentQ.options,
                category: currentQ.category,
                ...(gameEngine.status === "question_review" || gameEngine.status === "game_over"
                  ? {
                      correctIndex: currentQ.correctIndex,
                      explanation: currentQ.explanation,
                    }
                  : {}),
              }
            : null,
          questionStartTime: gameEngine.questionStartTime,
          questionDuration: settings.questionDuration || 20,
          serverTime: Date.now(),
          connectedPlayersCount: clients.size,
          answeredThisRoundCount: Object.keys(gameEngine.answersForCurrentQ).length,
          leaderboard,
        },
      })
    );

    // Broadcast connected count change
    broadcastGameState();

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case "REGISTER_CLIENT": {
            if (data.playerId) client.playerId = data.playerId;
            if (data.playerName) client.playerName = data.playerName;
            if (data.isAdmin) client.isAdmin = true;
            broadcastGameState();
            break;
          }

          case "SUBMIT_ANSWER": {
            if (data.playerId && data.questionId !== undefined) {
              const res = submitPlayerAnswer(
                data.playerId,
                Number(data.questionId),
                Number(data.selectedOption),
                Number(data.timeRemaining)
              );
              ws.send(JSON.stringify({ type: "ANSWER_RESULT", result: res }));
            }
            break;
          }

          case "ADMIN_GAME_START": {
            if (data.password === getAdminPassword()) {
              startQuestionRound(data.questionIndex || 0);
            }
            break;
          }

          case "ADMIN_GAME_NEXT": {
            if (data.password === getAdminPassword()) {
              const questions = readQuestions();
              const nextIdx = gameEngine.currentQuestionIndex + 1;
              if (nextIdx < questions.length) {
                startQuestionRound(nextIdx);
              } else {
                gameEngine.status = "game_over";
                clearGameTimers();
                broadcastGameState();
              }
            }
            break;
          }

          case "ADMIN_GAME_RESET": {
            if (data.password === getAdminPassword()) {
              clearGameTimers();
              gameEngine.status = "lobby";
              gameEngine.currentQuestionIndex = 0;
              gameEngine.answersForCurrentQ = {};
              broadcastGameState();
            }
            break;
          }

          case "PING": {
            ws.send(JSON.stringify({ type: "PONG", serverTime: Date.now() }));
            break;
          }
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    });

    ws.on("close", () => {
      clients.delete(client);
      broadcastGameState();
    });

    ws.on("error", () => {
      clients.delete(client);
    });
  });

  // Vite middleware & Static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌿 Dr. P. Alikutty's Hospital Real-Time Onam Quiz Server running on http://localhost:${PORT}`);
  });
}

startServer();
