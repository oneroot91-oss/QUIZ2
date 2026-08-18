import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Award,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Zap,
  User,
  Clock,
  Flame,
  FileCheck
} from "lucide-react";
import { Player, LeaderboardEntry, PlayerAnswer } from "../types";
import { PookkalamArt } from "./PookkalamArt";

interface CompletionPageProps {
  player: Player;
  leaderboard: LeaderboardEntry[];
  totalQuestions: number;
  onViewLeaderboard: () => void;
  onBackToHome: () => void;
}

export const CompletionPage: React.FC<CompletionPageProps> = ({
  player,
  leaderboard,
  totalQuestions,
  onViewLeaderboard,
  onBackToHome,
}) => {
  const maxPossibleScore = totalQuestions * 5; // 75.00 max points
  const playerRankEntry = leaderboard.find((e) => e.id === player.id);
  const rank = playerRankEntry?.rank ?? 1;

  // Trigger grand festive confetti on load
  useEffect(() => {
    try {
      const end = Date.now() + 2.5 * 1000;
      const colors = ["#F59E0B", "#DC2626", "#059669", "#FBBF24", "#FFFFFF"];

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } catch (e) {
      console.log("Confetti trigger skipped:", e);
    }
  }, []);

  const getScoreTitle = (score: number) => {
    if (score >= 65) return "👑 Grand King Mahabali Champion";
    if (score >= 50) return "🌟 Speed Master of Thiruvonam";
    if (score >= 35) return "🌼 Onam Cultural Scholar";
    if (score >= 20) return "✨ Festive Spirit Achiever";
    return "🌴 Dedicated Onam Participant";
  };

  const answersList = (Object.values(player.answers || {}) as PlayerAnswer[]).sort(
    (a, b) => a.questionId - b.questionId
  );

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-amber-50/70 via-stone-50 to-amber-100/40 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Grand Score Display Hero Banner */}
        <div
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-800 via-amber-900 to-amber-950 text-white p-6 sm:p-10 shadow-2xl border-2 border-amber-400/50 text-center"
          id="score-celebration-card"
        >
          <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20 pointer-events-none">
            <PookkalamArt size={260} />
          </div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 opacity-20 pointer-events-none">
            <PookkalamArt size={220} />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-300/40 px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider text-amber-200 uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>Match Completed • Official Speed Result</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-100 mb-2">
              {getScoreTitle(player.totalScore)}
            </h1>

            {/* Score Highlight Box */}
            <div className="my-6 inline-block bg-amber-950/80 border-2 border-amber-400/60 rounded-3xl px-8 py-5 shadow-inner backdrop-blur-sm">
              <p className="text-xs text-amber-300 font-semibold tracking-wider uppercase mb-1">
                Final Cumulative Speed Score
              </p>
              <div className="text-4xl sm:text-6xl font-black text-yellow-300 tracking-tight font-mono" id="score-display">
                {player.totalScore.toFixed(2)} <span className="text-lg font-normal text-amber-200">/ {maxPossibleScore} pts</span>
              </div>
              <p className="text-xs text-amber-200 mt-1 font-medium">
                {player.correctCount} Correct out of {totalQuestions} Questions • Current Rank: <strong>#{rank}</strong>
              </p>
            </div>

            {/* Participant Details Summary */}
            <div className="bg-amber-950/60 border border-amber-500/30 rounded-2xl p-4 text-xs sm:text-sm grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-stone-400 block text-[11px]">Participant</span>
                  <strong className="text-amber-100">{player.name}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />
                <div>
                  <span className="text-stone-400 block text-[11px]">Leaderboard Rank</span>
                  <strong className="text-amber-100">#{rank} on Global Board</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-stone-400 block text-[11px]">Status</span>
                  <strong className="text-emerald-300">Recorded in data.json</strong>
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="completion-view-leaderboard-btn"
                onClick={onViewLeaderboard}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-amber-950 font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-950" />
                <span>View Full Live Leaderboard</span>
                <ArrowRight className="w-4 h-4 text-amber-950" />
              </button>

              <button
                id="completion-back-home-btn"
                onClick={onBackToHome}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-500/40 text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-300" />
                <span>Return to Lobby / Register</span>
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Speed & Answer Breakdown */}
        <div className="bg-white rounded-3xl shadow-lg border border-amber-200/80 p-6 sm:p-8" id="quiz-breakdown-section">
          <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                <span>Speed Score Round Breakdown</span>
                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full border border-amber-300">
                  {answersList.length} Questions
                </span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Calculated using the speed decay formula: 5 × (Time Remaining / 20s)
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {player.correctCount} Correct
              </span>
              <span className="flex items-center gap-1 text-red-700">
                <XCircle className="w-4 h-4 text-red-600" /> {answersList.length - player.correctCount} Incorrect
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {answersList.map((ans) => {
              const isCorrect = ans.isCorrect;
              return (
                <div
                  key={ans.questionId}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    isCorrect
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                      : "bg-red-50/50 border-red-200 text-red-950"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-stone-800">Question {ans.questionId}</span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-extrabold px-2 py-0.5 rounded-full ${
                        isCorrect
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-red-100 text-red-800 border border-red-300"
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <Zap className="w-3 h-3 text-emerald-600" /> +{ans.score.toFixed(2)} pts
                        </>
                      ) : (
                        "0.00 pts"
                      )}
                    </span>
                  </div>

                  <div className="text-xs text-stone-600 space-y-1 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Time Left:</span>
                      <strong className="text-stone-800">{ans.timeRemaining.toFixed(1)}s / 20s</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Result:</span>
                      <strong className={isCorrect ? "text-emerald-700" : "text-red-700"}>
                        {isCorrect ? "Correct Response" : ans.selectedOption === -1 ? "Timed Out" : "Incorrect"}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
