import { useState, useEffect, useRef, useCallback } from "react";
import { GameState, LeaderboardEntry, Player } from "../types";
import {
  getLocalGameState,
  registerLocalPlayer,
  submitLocalAnswer,
  getLocalLeaderboard,
  saveLocalGameState,
  clearAllLocalQuizData,
  clearLocalPlayerSession,
} from "../lib/quizStorage";
import {
  getOrCreateDeviceId,
  getDeviceFingerprint,
  markDeviceQuizCompleted,
  isDeviceCompletedQuiz,
  clearDeviceTracking,
} from "../lib/deviceTracker";

export function useRealtimeQuiz(
  playerId?: string | null,
  onPlayerUpdated?: (player: Player | null) => void,
  onSystemReset?: () => void
) {
  const [gameState, setGameState] = useState<GameState>(() => getLocalGameState());

  const [isConnected, setIsConnected] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(20);
  const wsRef = useRef<WebSocket | null>(null);
  const playerIdRef = useRef<string | null>(playerId || null);
  playerIdRef.current = playerId || null;

  // Fetch initial REST state with local storage fallback
  const fetchRestState = useCallback(async () => {
    try {
      const res = await fetch("/api/game/state");
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setGameState(data);
        return;
      }
    } catch (e) {
      // Server not available (static host)
    }

    // Local fallback
    const localState = getLocalGameState();
    setGameState(localState);
  }, []);

  // WebSocket Connection Lifecycle
  useEffect(() => {
    fetchRestState();

    let isUnmounted = false;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWS = () => {
      if (isUnmounted) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}`;

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (isUnmounted) return;
        setIsConnected(true);

        if (playerIdRef.current) {
          socket.send(
            JSON.stringify({
              type: "REGISTER_CLIENT",
              playerId: playerIdRef.current,
            })
          );
        }
      };

      socket.onmessage = (event) => {
        if (isUnmounted) return;
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "SYSTEM_RESET") {
            clearAllLocalQuizData();
            if (onPlayerUpdated) onPlayerUpdated(null);
            if (onSystemReset) onSystemReset();
            return;
          }

          if (msg.type === "CLEAR_DEVICE_LOCKS") {
            clearDeviceTracking();
            return;
          }

          if (msg.type === "GAME_STATE_UPDATE" || msg.type === "INITIAL_STATE") {
            setGameState(msg.state);

            if (playerIdRef.current && msg.state.leaderboard) {
              const matched = msg.state.leaderboard.find(
                (entry: LeaderboardEntry) => entry.id === playerIdRef.current
              );
              if (matched && onPlayerUpdated) {
                onPlayerUpdated({
                  id: matched.id,
                  name: matched.name,
                  totalScore: matched.totalScore,
                  correctCount: matched.correctCount,
                  answeredCount: matched.answeredCount,
                  answers: matched.answers || {},
                  joinedAt: matched.joinedAt || Date.now(),
                });
              } else if (!matched && msg.state.leaderboard.length === 0 && onPlayerUpdated) {
                // If leaderboard was wiped, clear the player
                clearLocalPlayerSession();
                onPlayerUpdated(null);
              }
            }
          }
        } catch (err) {
          console.error("WS message parse error:", err);
        }
      };

      socket.onclose = () => {
        if (isUnmounted) return;
        setIsConnected(false);
        reconnectTimeout = setTimeout(connectWS, 2000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connectWS();

    const pollInterval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fetchRestState();
      }
    }, 4000);

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchRestState, onPlayerUpdated]);

  // Synchronize Player Registration whenever playerId changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && playerId) {
      wsRef.current.send(
        JSON.stringify({
          type: "REGISTER_CLIENT",
          playerId,
        })
      );
    }
  }, [playerId]);

  // Synchronous High-Precision Client Timer
  useEffect(() => {
    if (gameState.status !== "question_active") {
      setTimeRemaining(gameState.questionDuration || 20);
      return;
    }

    const computeRemaining = () => {
      const now = Date.now();
      const elapsedSeconds = (now - gameState.questionStartTime) / 1000;
      const remaining = Math.max(0, (gameState.questionDuration || 20) - elapsedSeconds);
      return Math.round(remaining * 10) / 10;
    };

    setTimeRemaining(computeRemaining());

    const timerInterval = setInterval(() => {
      const remaining = computeRemaining();
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timerInterval);
      }
    }, 100);

    return () => clearInterval(timerInterval);
  }, [gameState.status, gameState.questionStartTime, gameState.questionDuration]);

  // Actions with offline/static hosting fallback
  const registerPlayer = useCallback(async (name: string): Promise<Player | null> => {
    const deviceId = getOrCreateDeviceId();
    const deviceFingerprint = getDeviceFingerprint();

    // Check local device completion lock first
    if (isDeviceCompletedQuiz()) {
      throw new Error("This phone/device has already finished the 15-question quiz challenge. Only 1 attempt is permitted per device.");
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, deviceId, deviceFingerprint }),
      });
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (res.ok && data.player) {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: "REGISTER_CLIENT",
                playerId: data.player.id,
                playerName: data.player.name,
                deviceId,
              })
            );
          }
          return data.player;
        } else if (data.error) {
          throw new Error(data.message || data.error);
        }
      }
    } catch (err: any) {
      if (err.message && (err.message.includes("already") || err.message.includes("device") || err.message.includes("phone"))) {
        throw err;
      }
      // Offline fallback
    }

    // Local registration fallback for InfinityFree / static hosting
    const localPlayer = registerLocalPlayer(name);
    return localPlayer;
  }, []);

  const completeQuiz = useCallback(async (player: Player) => {
    const deviceId = getOrCreateDeviceId();
    const deviceFingerprint = getDeviceFingerprint();
    markDeviceQuizCompleted(player);

    try {
      await fetch("/api/player/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: player.id,
          deviceId,
          deviceFingerprint,
          totalScore: player.totalScore,
          correctCount: player.correctCount,
        }),
      });
    } catch (e) {}
  }, []);

  const submitAnswer = useCallback(
    async (selectedOption: number, timeLeft: number, questionId?: number) => {
      if (!playerIdRef.current) return { error: "No participant joined." };

      const targetQuestionId = questionId !== undefined ? questionId : gameState.currentQuestion?.id || 1;
      const deviceId = getOrCreateDeviceId();

      const payload = {
        type: "SUBMIT_ANSWER",
        playerId: playerIdRef.current,
        questionId: targetQuestionId,
        selectedOption,
        timeRemaining: timeLeft,
        deviceId,
      };

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }

      try {
        const res = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: playerIdRef.current,
            questionId: targetQuestionId,
            selectedOption,
            timeRemaining: timeLeft,
            deviceId,
          }),
        });
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          return await res.json();
        }
      } catch (err) {
        // Offline fallback
      }

      // Local submission fallback for InfinityFree / static hosting
      const localResult = submitLocalAnswer(
        playerIdRef.current,
        targetQuestionId,
        selectedOption,
        timeLeft
      );
      if (localResult.player && onPlayerUpdated) {
        onPlayerUpdated(localResult.player);
      }
      return localResult;
    },
    [gameState.currentQuestion, onPlayerUpdated]
  );

  return {
    gameState,
    isConnected,
    timeRemaining,
    registerPlayer,
    submitAnswer,
    completeQuiz,
    refreshState: fetchRestState,
  };
}
