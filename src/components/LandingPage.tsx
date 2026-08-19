import React, { useState } from "react";
import {
  Trophy,
  Zap,
  Clock,
  ShieldCheck,
  Sparkles,
  Users,
  ArrowRight,
  User,
  Play,
  Flame,
  CheckCircle2,
  Lock
} from "lucide-react";
import { GameState, Player } from "../types";
import { PookkalamArt } from "./PookkalamArt";

interface LandingPageProps {
  currentPlayer?: Player | null;
  gameState: GameState;
  onJoinGame?: (name: string) => Promise<void> | void;
  onJoinQuiz?: (name: string) => Promise<void> | void;
  onStartPlaying?: () => void;
  onViewLeaderboard: () => void;
  savedPlayerName?: string;
  isJoining?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  currentPlayer,
  gameState,
  onJoinGame,
  onJoinQuiz,
  onStartPlaying,
  onViewLeaderboard,
  savedPlayerName,
  isJoining = false,
}) => {
  const [name, setName] = useState(currentPlayer?.name || savedPlayerName || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name to register on the leaderboard.");
      return;
    }
    setError(null);
    try {
      const joinAction = onJoinGame || onJoinQuiz;
      if (typeof joinAction === "function") {
        await joinAction(name.trim());
      } else {
        console.warn("No join handler provided");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to register. Please try again.");
    }
  };

  const topPlayers = gameState.leaderboard.slice(0, 5);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-amber-50/70 via-stone-50 to-amber-100/40 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Festive Cultural Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white p-6 sm:p-10 shadow-2xl border-2 border-amber-500/40">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 opacity-25 pointer-events-none">
            <PookkalamArt size={280} />
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-300/40 px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider text-amber-200 uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              <span>Real-Time Individual Multiplayer Quiz</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-amber-100 mb-3 tracking-tight">
              Onam Grand Speed Challenge 🌼
            </h1>

            <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed mb-6 font-light">
              Experience the fast-paced cultural showdown of Kerala! Compete simultaneously with colleagues across 15 synchronized questions. 
              <strong> The faster you answer correctly, the higher your score!</strong>
            </p>

            {/* Core Game Mechanics Pill Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-amber-950/80 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-yellow-300 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-amber-300 uppercase tracking-wider font-semibold block">Timer</span>
                  <strong className="text-xs sm:text-sm text-white">20s Per Question</strong>
                </div>
              </div>

              <div className="bg-amber-950/80 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-emerald-300 uppercase tracking-wider font-semibold block">Speed Decay</span>
                  <strong className="text-xs sm:text-sm text-white">Max 5.00 Pts / Q</strong>
                </div>
              </div>

              <div className="bg-amber-950/80 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-amber-300 uppercase tracking-wider font-semibold block">Multiplayer</span>
                  <strong className="text-xs sm:text-sm text-white">{gameState.connectedPlayersCount} Live Players</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Registration & Game Entry Card (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-200/80" id="player-registration-card">
            {currentPlayer ? (
              // Already Registered State
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/60 border-2 border-amber-300 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white font-bold text-lg flex items-center justify-center shadow-sm">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">Registered Player</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      </div>
                      <h3 className="text-lg font-black text-stone-900">{currentPlayer.name}</h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Current Score: <strong className="text-amber-800 font-mono">{currentPlayer.totalScore.toFixed(2)} pts</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-300">
                      Active on Leaderboard
                    </span>
                  </div>
                </div>

                {/* Match Status & Enter Action */}
                <div className="p-5 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Live Match Status</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      gameState.status === "question_active"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse"
                        : gameState.status === "question_review"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-blue-100 text-blue-800 border border-blue-300"
                    }`}>
                      {gameState.status === "question_active"
                        ? `⚡ Question ${gameState.currentQuestionIndex + 1} In Progress`
                        : gameState.status === "question_review"
                        ? `⏱️ Reviewing Question ${gameState.currentQuestionIndex + 1}`
                        : gameState.status === "game_over"
                        ? "🏆 Match Completed"
                        : "🟢 Game Ready"}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    {gameState.status === "question_active"
                      ? `Question ${gameState.currentQuestionIndex + 1} of ${gameState.totalQuestions} is currently live. Jump in to submit your answer before time runs out!`
                      : "Questions are synchronized in real-time. Enter the live arena now to compete for the top podium!"}
                  </p>

                  <button
                    id="enter-live-arena-btn"
                    onClick={onStartPlaying}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-extrabold text-base shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2.5 cursor-pointer transform active:scale-98"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Enter Live Quiz Arena</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Change name option */}
                <div className="text-center pt-1">
                  <button
                    onClick={() => {
                      setName("");
                      setError(null);
                    }}
                    className="text-xs text-stone-500 hover:text-amber-800 underline transition cursor-pointer"
                  >
                    Change Name / Register as Different Player
                  </button>
                </div>
              </div>
            ) : (
              // Individual Entry Registration Form
              <div>
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-stone-900 flex items-center gap-2">
                    <span>Individual Player Entry</span>
                    <span className="text-amber-600">✍️</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Enter your name to automatically appear on the global leaderboard and participate in the real-time match.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                      <span className="font-bold">⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="participant-name-input" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                      Your Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        id="participant-name-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dr. Rahul Menon / Ananya Nair"
                        maxLength={50}
                        required
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-stone-300 hover:border-amber-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-500/20 text-sm sm:text-base font-medium outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Speed Scoring Formula Card */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <Zap className="w-4 h-4 text-amber-600" />
                      <span>Speed-Decay Scoring System</span>
                    </div>
                    <div className="font-mono bg-white p-2.5 rounded-xl border border-amber-300 text-amber-950 font-bold text-center">
                      Score = 5 × (Time Remaining in Seconds / 20)
                    </div>
                    <ul className="text-stone-600 text-[11px] space-y-1 pl-1">
                      <li>• Maximum <strong>5.00 points</strong> for instantaneous correct answer</li>
                      <li>• <strong>2.50 points</strong> if answered correctly with 10s remaining</li>
                      <li>• <strong>0 points</strong> for incorrect or timed-out responses</li>
                    </ul>
                  </div>

                  <button
                    id="join-quiz-btn"
                    type="submit"
                    disabled={isJoining || !name.trim()}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isJoining ? (
                      <span>Registering Player...</span>
                    ) : (
                      <>
                        <span>Join Competition & Enter Arena</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Real-time Global Leaderboard Quick Peek (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-xl border border-amber-200/80 space-y-4" id="live-standings-card">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-stone-900 text-base">Live Leaderboard</h3>
              </div>
              <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                {gameState.leaderboard.length} Players
              </span>
            </div>

            {topPlayers.length > 0 && topPlayers[0] && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white shadow-md flex items-center justify-between border border-amber-400/40">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">👑</span>
                  <div>
                    <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block">
                      Current Highest Scorer
                    </span>
                    <strong className="text-sm font-extrabold text-white block">
                      {topPlayers[0].name}
                    </strong>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-amber-200 block">Score</span>
                  <strong className="text-base font-black text-yellow-300 font-mono">
                    {topPlayers[0].totalScore.toFixed(2)} <span className="text-xs font-normal">pts</span>
                  </strong>
                </div>
              </div>
            )}

            {topPlayers.length === 0 ? (
              <div className="py-10 text-center text-stone-400 space-y-2">
                <Users className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">No registered participants yet.</p>
                <p className="text-[11px] text-stone-500">Be the first to join the leaderboard!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topPlayers.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition ${
                      currentPlayer?.id === entry.id
                        ? "bg-amber-50/90 border-amber-400 shadow-sm"
                        : "bg-stone-50/70 border-stone-200 hover:border-amber-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center ${
                        idx === 0
                          ? "bg-amber-400 text-amber-950 shadow-xs"
                          : idx === 1
                          ? "bg-slate-200 text-slate-800"
                          : idx === 2
                          ? "bg-amber-100 text-amber-900"
                          : "bg-stone-200 text-stone-600"
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
                          <span>{entry.name}</span>
                          {currentPlayer?.id === entry.id && (
                            <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 rounded">You</span>
                          )}
                        </p>
                        <p className="text-[10px] text-stone-500">
                          {entry.correctCount} Correct • {entry.answeredCount} Answered
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-black text-amber-800 text-sm sm:text-base">
                        {entry.totalScore.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-stone-400 block">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              id="view-full-leaderboard-btn"
              onClick={onViewLeaderboard}
              className="w-full py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <span>View Full Real-Time Standings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Anti-Cheat & Rules Highlights */}
        <div className="bg-stone-900 text-amber-100 rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-950 text-red-400 border border-red-500/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Competition Security & Fairness Protocols</h3>
              <p className="text-xs text-amber-200/80">Strict anti-cheating measures are enforced during gameplay</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-stone-300">
            <div className="p-3.5 rounded-2xl bg-stone-800/80 border border-stone-700">
              <strong className="text-amber-300 block mb-1">⏱️ Synchronized 20s Timer</strong>
              All players receive questions simultaneously with automatic lockout when the timer reaches 0s.
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-800/80 border border-stone-700">
              <strong className="text-amber-300 block mb-1">🔒 Tab & App Detection</strong>
              Switching tabs, minimizing Chrome, or opening external AI assistants triggers automatic warnings and disqualification.
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-800/80 border border-stone-700">
              <strong className="text-amber-300 block mb-1">⚡ Speed-Decay Points</strong>
              Maximum 5 points awarded based on answer speed. Unanswered questions receive 0 points.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
