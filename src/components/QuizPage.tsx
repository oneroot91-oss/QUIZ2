import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Timer,
  Zap,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Lock,
  Tag,
  Trophy,
  ArrowRight,
  Flame,
  Ban,
  Sparkles,
  Award,
  ChevronRight,
  HelpCircle
} from "lucide-react";
import {
  GameState,
  Player,
  Question,
  calculateSpeedScore,
  DEFAULT_QUESTION_DURATION,
  MAX_POINTS_PER_QUESTION,
} from "../types";
import { PookkalamArt } from "./PookkalamArt";
import { getLocalQuestions } from "../lib/quizStorage";
import { DEFAULT_QUESTIONS } from "../data/defaultQuestions";

interface QuizPageProps {
  currentPlayer: Player;
  gameState: GameState;
  timeRemaining: number;
  onSubmitAnswer: (selectedOption: number, timeRemaining: number) => Promise<any>;
  onFinishQuiz: () => void;
  onExitToLobby: () => void;
}

export const QuizPage: React.FC<QuizPageProps> = ({
  currentPlayer,
  gameState,
  onSubmitAnswer,
  onFinishQuiz,
  onExitToLobby,
}) => {
  // 1. Load questions list
  const [questionsList, setQuestionsList] = useState<Question[]>(() => {
    const local = getLocalQuestions();
    return local && local.length > 0 ? local : DEFAULT_QUESTIONS;
  });

  // Try to fetch updated questions from server
  useEffect(() => {
    fetch("/api/questions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setQuestionsList(data);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Sequential Question Index
  // Check if player has already answered some questions to resume properly
  const [currentQIndex, setCurrentQIndex] = useState<number>(() => {
    if (!currentPlayer.answers) return 0;
    const answeredCount = Object.keys(currentPlayer.answers).length;
    return Math.min(answeredCount, Math.max(0, questionsList.length - 1));
  });

  const currentQ = questionsList[currentQIndex] || questionsList[0];
  const currentQId = currentQ?.id ?? 1;
  const totalQuestions = questionsList.length;
  const questionNumber = currentQIndex + 1;
  const isLastQuestion = currentQIndex >= totalQuestions - 1;

  // 3. Precision Countdown Timer State
  const duration = gameState.questionDuration || DEFAULT_QUESTION_DURATION;
  const [localTimeRemaining, setLocalTimeRemaining] = useState<number>(duration);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(true);
  const startTimeRef = useRef<number>(performance.now());
  const timerFrameRef = useRef<number | null>(null);

  // 4. Player Selection and Review State
  const existingAnswer = currentPlayer.answers?.[currentQId];
  const [selectedOption, setSelectedOption] = useState<number | null>(
    existingAnswer !== undefined ? existingAnswer.selectedOption : null
  );
  const [isReviewMode, setIsReviewMode] = useState<boolean>(existingAnswer !== undefined);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [roundFeedback, setRoundFeedback] = useState<{
    score: number;
    isCorrect: boolean;
    timeRemaining: number;
  } | null>(
    existingAnswer
      ? {
          score: existingAnswer.score,
          isCorrect: existingAnswer.isCorrect,
          timeRemaining: existingAnswer.timeRemaining,
        }
      : null
  );

  // Auto-advance countdown after answering
  const [autoAdvanceSeconds, setAutoAdvanceSeconds] = useState<number>(4);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Anti-Cheat State
  const [violations, setViolations] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showDisqualifiedModal, setShowDisqualifiedModal] = useState(false);
  const [securityToast, setSecurityToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastViolationTimeRef = useRef(0);
  const isFinishedRef = useRef(false);

  const showSecurityNotice = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setSecurityToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setSecurityToast(null), 2800;
    });
  };

  // -------------------------------------------------------------
  // High-Precision per-question Timer
  // -------------------------------------------------------------
  const handleTimeout = useCallback(async () => {
    if (selectedOption !== null || isReviewMode || isSubmitting) return;

    setIsTimerActive(false);
    setSelectedOption(-1);
    setIsReviewMode(true);
    setRoundFeedback({
      score: 0,
      isCorrect: false,
      timeRemaining: 0,
    });

    try {
      setIsSubmitting(true);
      await onSubmitAnswer(-1, 0);
    } catch (e) {
      // offline fallback handled
    } finally {
      setIsSubmitting(false);
    }

    // Start auto advance
    startAutoAdvanceTimer();
  }, [selectedOption, isReviewMode, isSubmitting, onSubmitAnswer]);

  const startAutoAdvanceTimer = () => {
    setAutoAdvanceSeconds(4);
    if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);

    autoAdvanceTimerRef.current = setInterval(() => {
      setAutoAdvanceSeconds((prev) => {
        if (prev <= 1) {
          if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
          handleNextQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Run precision timer when current question changes or resets
  useEffect(() => {
    if (existingAnswer !== undefined) {
      setSelectedOption(existingAnswer.selectedOption);
      setIsReviewMode(true);
      setIsTimerActive(false);
      setLocalTimeRemaining(existingAnswer.timeRemaining);
      setRoundFeedback({
        score: existingAnswer.score,
        isCorrect: existingAnswer.isCorrect,
        timeRemaining: existingAnswer.timeRemaining,
      });
      return;
    }

    // Start clean timer for new question
    setSelectedOption(null);
    setIsReviewMode(false);
    setRoundFeedback(null);
    setLocalTimeRemaining(duration);
    setIsTimerActive(true);
    startTimeRef.current = performance.now();

    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
    }

    const interval = setInterval(() => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      const rounded = Math.round(remaining * 10) / 10;
      setLocalTimeRemaining(rounded);

      if (remaining <= 0) {
        clearInterval(interval);
        handleTimeout();
      }
    }, 50);

    return () => {
      clearInterval(interval);
      if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
    };
  }, [currentQIndex, duration, existingAnswer, handleTimeout]);

  // -------------------------------------------------------------
  // Option Selection & Speed Score Submission
  // -------------------------------------------------------------
  const handleSelectOption = async (index: number) => {
    if (selectedOption !== null || isReviewMode || isSubmitting) return;

    // Freeze timer instantly
    setIsTimerActive(false);
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const exactRemaining = Math.max(0, Math.min(duration, duration - elapsed));
    const roundedTime = Math.round(exactRemaining * 10) / 10;
    setLocalTimeRemaining(roundedTime);

    setSelectedOption(index);
    setIsReviewMode(true);
    setIsSubmitting(true);

    const isCorrect = index === currentQ.correctIndex;
    const speedScore = isCorrect
      ? Math.round((MAX_POINTS_PER_QUESTION * (exactRemaining / duration)) * 100) / 100
      : 0;

    setRoundFeedback({
      score: speedScore,
      isCorrect,
      timeRemaining: roundedTime,
    });

    try {
      await onSubmitAnswer(index, roundedTime);
    } catch (err) {
      console.error("Answer submission error:", err);
    } finally {
      setIsSubmitting(false);
    }

    // Trigger auto-advance countdown
    startAutoAdvanceTimer();
  };

  // -------------------------------------------------------------
  // Move to Next Question or Complete Quiz
  // -------------------------------------------------------------
  const handleNextQuestion = () => {
    if (autoAdvanceTimerRef.current) {
      clearInterval(autoAdvanceTimerRef.current);
    }

    if (currentQIndex < totalQuestions - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      // Completed all questions!
      isFinishedRef.current = true;
      onFinishQuiz();
    }
  };

  // -------------------------------------------------------------
  // Anti-Cheat & Security
  // -------------------------------------------------------------
  useEffect(() => {
    const handleVisibility = () => {
      if (isFinishedRef.current) return;
      if (document.hidden || document.visibilityState === "hidden") {
        const now = Date.now();
        if (now - lastViolationTimeRef.current < 1500) return;
        lastViolationTimeRef.current = now;

        setViolations((prev) => {
          const next = prev + 1;
          if (next === 1) {
            setShowWarningModal(true);
          } else if (next >= 2) {
            setShowWarningModal(false);
            setShowDisqualifiedModal(true);
            setTimeout(() => {
              onFinishQuiz();
            }, 2500);
          }
          return next;
        });
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showSecurityNotice("🔒 Right-click and context menu are disabled during the quiz.");
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      showSecurityNotice("🔒 Copying question content is prohibited.");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12" || ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "u", "a", "s", "p"].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        showSecurityNotice("🔒 Inspection shortcuts and copying are disabled.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("copy", handleCopy);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onFinishQuiz]);

  // Visual Timer Ring Metrics
  const isTimeExpiring = localTimeRemaining <= 5 && isTimerActive;
  const isTimeWarning = localTimeRemaining <= 10 && !isTimeExpiring && isTimerActive;
  const timerRadius = 20;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const progressRatio = Math.max(0, Math.min(1, localTimeRemaining / duration));
  const timerStrokeOffset = timerCircumference - progressRatio * timerCircumference;

  // Potential Speed Score Preview
  const potentialScore = calculateSpeedScore(true, localTimeRemaining, duration);
  const optionLetters = ["A", "B", "C", "D"];
  const progressPercent = (questionNumber / totalQuestions) * 100;

  // Rank in live leaderboard
  const myRankEntry = gameState.leaderboard.find((entry) => entry.id === currentPlayer.id);
  const myRank = myRankEntry?.rank ?? 1;

  return (
    <div
      className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-amber-50/70 via-stone-50 to-amber-100/40 py-6 px-4 sm:px-6 select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Anti-Cheat Toast Banner */}
        {securityToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
            <div className="bg-red-900 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-2xl border-2 border-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-300 animate-pulse" />
              <span>{securityToast}</span>
            </div>
          </div>
        )}

        {/* Top Player HUD */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white font-bold flex items-center justify-center shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-stone-900 text-sm sm:text-base">{currentPlayer.name}</span>
                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  Rank #{myRank}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono">
                Total Points: <strong className="text-amber-800 font-bold">{currentPlayer.totalScore.toFixed(2)} pts</strong>
                <span className="ml-2 text-stone-400">({currentPlayer.correctCount} Correct)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
            {/* Anti-Cheat Monitor */}
            <div className="flex items-center gap-1.5 bg-stone-100 text-stone-700 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span>Anti-Cheat Guard Active</span>
            </div>

            {/* Current Question Badge */}
            <div className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-300">
              Q{questionNumber} of {totalQuestions}
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200/80 p-4">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium mb-2">
            <span className="font-bold text-stone-700 flex items-center gap-1.5">
              <span>Question {questionNumber} of {totalQuestions}</span>
              <span className="text-stone-400">• Precision Speed Round</span>
            </span>
            <span className="font-bold text-amber-800">{Math.round(progressPercent)}% Completed</span>
          </div>

          <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          {/* Sequential Step Dots */}
          <div className="grid grid-cols-15 gap-1">
            {Array.from({ length: totalQuestions }).map((_, idx) => {
              const isCurrent = idx === currentQIndex;
              const isPast = idx < currentQIndex;
              const ans = currentPlayer.answers?.[questionsList[idx]?.id];
              const wasCorrect = ans?.isCorrect;

              return (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    isCurrent
                      ? "bg-amber-600 ring-2 ring-amber-400 shadow scale-110"
                      : isPast
                      ? wasCorrect
                        ? "bg-emerald-600"
                        : "bg-red-400"
                      : "bg-stone-200"
                  }`}
                  title={`Question ${idx + 1}`}
                ></div>
              );
            })}
          </div>
        </div>

        {/* Main Question Card */}
        {currentQ && (
          <div
            className="bg-white rounded-3xl shadow-xl border-2 border-amber-200/90 overflow-hidden relative"
            id="active-question-card"
          >
            {/* Decorative Pookkalam Background */}
            <div className="absolute top-0 right-0 -mt-16 -mr-16 opacity-10 pointer-events-none">
              <PookkalamArt size={220} />
            </div>

            {/* Header: Question Badge, Category & Synchronized Timer */}
            <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-amber-50 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <span className="bg-amber-400 text-amber-950 font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-sm">
                  Question {questionNumber} of {totalQuestions}
                </span>
                {currentQ.category && (
                  <span className="inline-flex items-center text-xs text-amber-200 bg-amber-950/80 px-2.5 py-1 rounded-md border border-amber-500/30">
                    <Tag className="w-3 h-3 mr-1 text-amber-400" />
                    {currentQ.category}
                  </span>
                )}
              </div>

              {/* 20s High-Precision Countdown Timer */}
              <div className="flex items-center gap-3">
                {!isReviewMode && (
                  <div className="hidden sm:flex items-center gap-1.5 bg-amber-950/80 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-yellow-300">
                    <Zap className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                    <span>Speed Value: +{potentialScore.toFixed(2)} pts</span>
                  </div>
                )}

                <div
                  className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl border-2 transition-all ${
                    isTimeExpiring
                      ? "bg-red-950/90 border-red-500 text-red-100 animate-pulse shadow-lg"
                      : isTimeWarning
                      ? "bg-amber-950/90 border-amber-400 text-amber-100"
                      : "bg-stone-900/90 border-amber-500/40 text-amber-100"
                  }`}
                >
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    <svg className="w-9 h-9 -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r={timerRadius - 6}
                        className="stroke-stone-700/60 fill-none"
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r={timerRadius - 6}
                        className={`fill-none transition-all duration-150 ${
                          isTimeExpiring
                            ? "stroke-red-400"
                            : isTimeWarning
                            ? "stroke-amber-400"
                            : "stroke-emerald-400"
                        }`}
                        strokeWidth="3.5"
                        strokeDasharray={timerCircumference}
                        strokeDashoffset={timerStrokeOffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <Timer
                      className={`w-4 h-4 absolute ${isTimeExpiring ? "text-red-400" : "text-amber-300"}`}
                    />
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                      {isTimeExpiring ? "Hurry!" : "Countdown"}
                    </div>
                    <div className="font-mono font-black text-base sm:text-lg leading-none">
                      {localTimeRemaining.toFixed(1)}s
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Question Text */}
            <div className="p-6 sm:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 leading-relaxed mb-6 select-none">
                {currentQ.question}
              </h2>

              {/* Options List */}
              <div className="space-y-3.5">
                {currentQ.options.map((optText, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  const isLocked = isReviewMode || selectedOption !== null;
                  const letter = optionLetters[optIdx];
                  const isCorrectAnswer = currentQ.correctIndex === optIdx;

                  let cardStyle = "bg-white hover:bg-stone-50 border-stone-200 text-stone-800 hover:border-amber-300";
                  let badgeStyle = "bg-stone-100 text-stone-700 group-hover:bg-amber-100 group-hover:text-amber-900";

                  if (isReviewMode) {
                    if (isCorrectAnswer) {
                      cardStyle = "bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-400/40 shadow-sm";
                      badgeStyle = "bg-emerald-600 text-white";
                    } else if (isSelected && !isCorrectAnswer) {
                      cardStyle = "bg-red-50 border-red-500 text-red-950 font-bold line-through";
                      badgeStyle = "bg-red-600 text-white";
                    } else {
                      cardStyle = "bg-stone-50 border-stone-200 text-stone-400 opacity-60";
                    }
                  } else if (isSelected) {
                    cardStyle = "bg-amber-50/95 border-amber-500 text-amber-950 shadow-md ring-2 ring-amber-400/40";
                    badgeStyle = "bg-amber-500 text-white shadow-xs";
                  }

                  return (
                    <button
                      key={optIdx}
                      id={`opt-${questionNumber}-${letter}`}
                      onClick={() => handleSelectOption(optIdx)}
                      disabled={isLocked}
                      className={`w-full p-4 rounded-2xl text-left transition-all border-2 flex items-center justify-between select-none ${cardStyle} ${
                        !isLocked ? "cursor-pointer group hover:scale-[1.008]" : "cursor-default"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${badgeStyle}`}>
                          {letter}
                        </span>
                        <span className="text-sm sm:text-base font-medium select-none">{optText}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isReviewMode && isCorrectAnswer && (
                          <span className="text-[11px] uppercase font-extrabold bg-emerald-600 text-white px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                          </span>
                        )}
                        {isReviewMode && isSelected && !isCorrectAnswer && (
                          <span className="text-[11px] uppercase font-extrabold bg-red-600 text-white px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                            <XCircle className="w-3.5 h-3.5" /> Your Choice
                          </span>
                        )}

                        {!isReviewMode && (
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected ? "border-amber-600 bg-amber-600" : "border-stone-300"
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Cultural Context & Explanation */}
              {isReviewMode && currentQ.explanation && (
                <div className="mt-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-300/80 text-xs text-stone-800 space-y-1 animate-fade-in">
                  <strong className="text-amber-900 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Cultural & Historical Context</span>
                  </strong>
                  <p className="leading-relaxed">{currentQ.explanation}</p>
                </div>
              )}
            </div>

            {/* Footer Actions & Round Score */}
            <div className="bg-stone-50 border-t border-stone-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
              {isReviewMode && roundFeedback ? (
                <div className="flex items-center gap-2 text-xs font-bold">
                  {roundFeedback.isCorrect ? (
                    <span className="text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs">
                      <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                      <span>Speed Points Earned: <strong>+{roundFeedback.score.toFixed(2)} pts</strong></span>
                      <span className="text-emerald-700 font-normal">({roundFeedback.timeRemaining.toFixed(1)}s left)</span>
                    </span>
                  ) : selectedOption === -1 ? (
                    <span className="text-red-800 bg-red-100 border border-red-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Timer className="w-4 h-4 text-red-600" />
                      <span>Time Expired (0.00 pts)</span>
                    </span>
                  ) : (
                    <span className="text-red-800 bg-red-100 border border-red-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>Incorrect Choice (0.00 pts)</span>
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-stone-500 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>⚡ Select fast to maximize your speed-decay points (up to 5.00 pts)</span>
                </div>
              )}

              {/* Navigation button */}
              {isReviewMode && (
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    id="next-question-btn"
                    onClick={handleNextQuestion}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer group"
                  >
                    <span>{isLastQuestion ? "View Final Results 🏆" : "Next Question"}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <span className="text-[11px] text-stone-400 font-mono">
                    (Auto in {autoAdvanceSeconds}s)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 1st Security Violation Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-red-500 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-7 h-7 animate-bounce text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-red-950">Security Violation Detected!</h3>
                <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full border border-red-300">
                  1st Warning (Final Warning)
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/80 rounded-2xl border border-red-200 text-xs text-red-900 leading-relaxed space-y-2">
              <p>
                <strong>Tab or Application Switch Identified:</strong> You minimized the browser or opened another application.
              </p>
              <p>
                To maintain fair play, <strong>external lookups are strictly prohibited</strong>.
              </p>
              <p className="font-bold text-red-700">
                ⚠️ A 2nd violation will terminate your session and submit your score.
              </p>
            </div>

            <div className="pt-2">
              <button
                id="acknowledge-warning-btn"
                onClick={() => setShowWarningModal(false)}
                className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>I Understand • Return to Quiz</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2nd Violation Termination Modal */}
      {showDisqualifiedModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-4 border-red-600 space-y-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-700 flex items-center justify-center mx-auto">
              <Ban className="w-9 h-9 text-red-600 animate-pulse" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-red-950">Session Terminated</h3>
              <p className="text-xs text-red-700 font-semibold mt-1">Multiple Tab Switch Violations</p>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              A second tab switch occurred. Your quiz has been submitted with your current score.
            </p>

            <div className="p-3 bg-stone-100 rounded-xl text-xs font-mono text-stone-700 flex items-center justify-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-red-600 border-t-transparent animate-spin"></div>
              <span>Submitting official score to leaderboard...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
