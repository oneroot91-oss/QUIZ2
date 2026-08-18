import React, { useState } from "react";
import {
  Trophy,
  Medal,
  Award,
  Users,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  Sparkles,
  Search,
  RefreshCw,
  UserCheck,
  Zap,
  CheckCircle2,
  XCircle,
  Flame
} from "lucide-react";
import { LeaderboardEntry, PlayerAnswer } from "../types";
import { PookkalamArt } from "./PookkalamArt";

interface LeaderboardPageProps {
  leaderboardData: LeaderboardEntry[];
  totalParticipants: number;
  onBackToQuiz: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
  leaderboardData,
  totalParticipants,
  onBackToQuiz,
  onRefresh,
  isRefreshing = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedPlayerId((prev) => (prev === id ? null : id));
  };

  const filteredData = leaderboardData.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topThree = leaderboardData.slice(0, 3);

  const handleExportData = () => {
    window.location.href = "/api/data-export";
  };

  const handleResetData = async (action: "seed" | "clear") => {
    if (!window.confirm("Are you sure you want to clear all participants from the leaderboard?")) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch("/api/reset-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to reset data:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-400 px-2.5 py-1 rounded-full font-bold text-xs shadow-sm">
          <span className="text-sm">🥇</span> 1st Place
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center gap-1 bg-slate-100 text-slate-800 border border-slate-300 px-2.5 py-1 rounded-full font-bold text-xs">
          <span className="text-sm">🥈</span> 2nd Place
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full font-bold text-xs">
          <span className="text-sm">🥉</span> 3rd Place
        </div>
      );
    }
    return (
      <span className="font-mono font-bold text-stone-500 text-sm px-2">
        #{rank}
      </span>
    );
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-amber-50/70 via-stone-50 to-amber-100/40 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-800 via-amber-900 to-amber-950 text-white p-6 sm:p-10 shadow-xl border-2 border-amber-500/40">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20 pointer-events-none">
            <PookkalamArt size={260} />
          </div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-300/40 px-3 py-1 rounded-full text-xs font-semibold tracking-wider text-amber-200 uppercase mb-3">
              <Trophy className="w-3.5 h-3.5 text-yellow-300" />
              <span>Real-Time Global Standings</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-amber-100 mb-2 flex items-center gap-2">
              <span>Grand Individual Leaderboard</span>
              <span className="text-amber-300">🏆</span>
            </h1>

            <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed mb-6 font-light">
              Rankings are calculated dynamically from cumulative speed scores across all 15 Onam questions (Max 75.00 Total Points).
            </p>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <div className="bg-amber-950/80 border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-300" />
                <span>
                  Total Registered Participants: <strong className="text-amber-200">{totalParticipants}</strong>
                </span>
              </div>
              <div className="bg-amber-950/80 border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-300" />
                <span>
                  Scoring Engine: <strong className="text-amber-200">5 × (Time Left / 20s)</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Podium Highlight (Top 3 Individual Players) */}
        {leaderboardData.length >= 3 && leaderboardData[0].totalScore > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="leaderboard-podium">
            {/* Rank 2 */}
            {topThree[1] && (
              <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-md flex flex-col justify-between order-2 md:order-1">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">🥈</span>
                    <span className="text-xs font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      2nd Place
                    </span>
                  </div>
                  <h3 className="font-bold text-stone-900 text-lg">{topThree[1].name}</h3>
                  <p className="text-xs text-stone-500">{topThree[1].correctCount} Correct / {topThree[1].answeredCount} Answered</p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-600">Total Score</span>
                  <span className="text-2xl font-black text-slate-800 font-mono">
                    {topThree[1].totalScore.toFixed(2)} pts
                  </span>
                </div>
              </div>
            )}

            {/* Rank 1 (Grand Leader) */}
            {topThree[0] && (
              <div className="bg-gradient-to-b from-amber-50 to-amber-100/60 rounded-2xl p-6 border-2 border-amber-400 shadow-lg flex flex-col justify-between order-1 md:order-2 transform md:-translate-y-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">👑 🥇</span>
                    <span className="text-xs font-extrabold uppercase text-amber-900 bg-amber-300/80 px-2.5 py-0.5 rounded-full border border-amber-400">
                      Championship Leader
                    </span>
                  </div>
                  <h3 className="font-extrabold text-amber-950 text-xl">{topThree[0].name}</h3>
                  <p className="text-xs text-amber-800 font-medium">{topThree[0].correctCount} Correct / {topThree[0].answeredCount} Answered</p>
                </div>
                <div className="mt-4 pt-3 border-t border-amber-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">Highest Score</span>
                  <span className="text-3xl font-black text-amber-900 font-mono">
                    {topThree[0].totalScore.toFixed(2)} <span className="text-xs font-normal">pts</span>
                  </span>
                </div>
              </div>
            )}

            {/* Rank 3 */}
            {topThree[2] && (
              <div className="bg-white rounded-2xl p-5 border-2 border-amber-200/80 shadow-md flex flex-col justify-between order-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">🥉</span>
                    <span className="text-xs font-bold uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                      3rd Place
                    </span>
                  </div>
                  <h3 className="font-bold text-stone-900 text-lg">{topThree[2].name}</h3>
                  <p className="text-xs text-stone-500">{topThree[2].correctCount} Correct / {topThree[2].answeredCount} Answered</p>
                </div>
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-600">Total Score</span>
                  <span className="text-2xl font-black text-amber-800 font-mono">
                    {topThree[2].totalScore.toFixed(2)} pts
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Standings Table Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-amber-200/80 overflow-hidden" id="leaderboard-table-card">
          {/* Table Controls Header */}
          <div className="p-4 sm:p-6 border-b border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-stone-50/50">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search participant name..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                id="refresh-leaderboard-btn"
                onClick={onRefresh}
                className="px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-white text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Refresh standings from server"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-amber-600" : ""}`} />
                <span>Refresh</span>
              </button>

              <button
                id="export-data-json-btn"
                onClick={handleExportData}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="Download data.json"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export data.json</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="individual-standings-table">
              <thead>
                <tr className="bg-stone-100/80 text-stone-600 text-xs font-bold uppercase tracking-wider border-b border-stone-200">
                  <th className="py-3.5 px-4 sm:px-6 w-24">Rank</th>
                  <th className="py-3.5 px-4 sm:px-6">Participant Name</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Correct / Answered</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Accuracy</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Cumulative Score</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center w-28">Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-500">
                      No participants registered yet or matching search query.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => {
                    const isExpanded = expandedPlayerId === item.id;
                    const accuracy =
                      item.answeredCount > 0 ? Math.round((item.correctCount / item.answeredCount) * 100) : 0;
                    const answersList = (item.answers ? Object.values(item.answers) : []) as PlayerAnswer[];

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className={`hover:bg-amber-50/40 transition-colors ${
                            item.rank === 1 ? "bg-amber-50/30 font-semibold" : ""
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-4 px-4 sm:px-6">{getRankBadge(item.rank)}</td>

                          {/* Participant Name */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900">{item.name}</span>
                              {item.isOnline && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-emerald-300">
                                  ● Live Online
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Correct / Answered */}
                          <td className="py-4 px-4 sm:px-6 text-center">
                            <div className="inline-flex items-center gap-1 font-mono font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                              <span>{item.correctCount}</span>
                              <span className="text-stone-400">/</span>
                              <span>{item.answeredCount}</span>
                            </div>
                          </td>

                          {/* Accuracy */}
                          <td className="py-4 px-4 sm:px-6 text-center font-mono font-bold text-stone-700">
                            {accuracy}%
                          </td>

                          {/* Total Score */}
                          <td className="py-4 px-4 sm:px-6 text-right">
                            <span className="font-mono font-black text-amber-900 text-base sm:text-lg">
                              {item.totalScore.toFixed(2)}
                            </span>
                            <span className="text-[11px] text-stone-400 ml-1">pts</span>
                          </td>

                          {/* Expand details */}
                          <td className="py-4 px-4 sm:px-6 text-center">
                            {answersList.length > 0 ? (
                              <button
                                onClick={() => toggleExpand(item.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-800 bg-amber-100/70 hover:bg-amber-200/80 transition flex items-center gap-1 mx-auto cursor-pointer"
                                title="View individual question scores"
                              >
                                <span>{isExpanded ? "Hide" : "View"}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ) : (
                              <span className="text-stone-400 text-xs">No answers</span>
                            )}
                          </td>
                        </tr>

                        {/* Question-by-Question Breakdown Drawer */}
                        {isExpanded && answersList.length > 0 && (
                          <tr className="bg-stone-50/90 border-b border-stone-200">
                            <td colSpan={6} className="py-4 px-4 sm:px-8">
                              <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-inner">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3 flex items-center gap-1.5">
                                  <Zap className="w-4 h-4 text-amber-600" />
                                  <span>
                                    {item.name}'s Question-by-Question Speed Score Breakdown
                                  </span>
                                </h4>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                                  {answersList.map((ans, aIdx) => (
                                    <div
                                      key={aIdx}
                                      className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                                        ans.isCorrect
                                          ? "bg-emerald-50/60 border-emerald-200"
                                          : "bg-red-50/60 border-red-200"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-stone-700">Q{ans.questionId}</span>
                                        {ans.isCorrect ? (
                                          <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-1.5 py-0.2 rounded">
                                            +{ans.score.toFixed(2)} pts
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-red-800 bg-red-100 font-bold px-1.5 py-0.2 rounded">
                                            0.00 pts
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-stone-500 font-mono flex items-center justify-between">
                                        <span>Time Left: {ans.timeRemaining.toFixed(1)}s</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
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

          {/* Footer Controls & Reset */}
          <div className="bg-stone-50 p-4 sm:p-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              id="leaderboard-back-to-quiz-btn"
              onClick={onBackToQuiz}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Take Quiz / Join Arena</span>
            </button>

            {/* Quick reset */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-500 font-medium">Reset Options:</span>
              <button
                onClick={() => handleResetData("clear")}
                disabled={isResetting}
                className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                Clear Leaderboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
