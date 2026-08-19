import { useState, useEffect, useRef, useCallback } from "react";
import { GameState, LeaderboardEntry, Player } from "../types";
import {
  getLocalGameState,
  registerLocalPlayer,
  submitLocalAnswer,
  getLocalLeaderboard,
  saveLocalGameState,
} from "../lib/quizStorage";

export function useRealtimeQuiz(playerId?: string | null, onPlayerUpdated?: (player: Player) => void) {
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
          if (msg.type === "GAME_STATE_UPDATE" || msg.type === "INITIAL_STATE") {
            setGameState(msg.state);

            if (playerIdRef.current && msg.state.leaderboard && onPlayerUpdated) {
              const matched = msg.state.leaderboard.find(
                (entry: LeaderboardEntry) => entry.id === playerIdRef.current
              );
              if (matched) {
                onPlayerUpdated({
                  id: matched.id,
                  name: matched.name,
                  totalScore: matched.totalScore,
                  correctCount: matched.correctCount,
                  answeredCount: matched.answeredCount,
                  answers: matched.answers || {},
                  joinedAt: matched.joinedAt || Date.now(),
                });
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
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.player) {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: "REGISTER_CLIENT",
                playerId: data.player.id,
                playerName: data.player.name,
              })
            );
          }
          return data.player;
        }
      }
    } catch (err) {
      // Offline fallback
    }

    // Local registration fallback for InfinityFree / static hosting
    const localPlayer = registerLocalPlayer(name);
    return localPlayer;
  }, []);

  const submitAnswer = useCallback(
    async (selectedOption: number, timeLeft: number) => {
      if (!playerIdRef.current) return { error: "No participant joined." };

      const currentQ = gameState.currentQuestion;
      if (!currentQ) return { error: "No active question." };

      const payload = {
        type: "SUBMIT_ANSWER",
        playerId: playerIdRef.current,
        questionId: currentQ.id,
        selectedOption,
        timeRemaining: timeLeft,
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
            questionId: currentQ.id,
            selectedOption,
            timeRemaining: timeLeft,
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
        currentQ.id,
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
    refreshState: fetchRestState,
  };
}
