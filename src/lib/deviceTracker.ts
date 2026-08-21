/**
 * Device Tracking & Anti-Duplicate Security System
 * Enforces strictly 1 quiz attempt per physical phone / device across sessions.
 * Synchronizes across localStorage, sessionStorage, and persistent cookies.
 */

export interface DeviceCompletionData {
  isCompleted: boolean;
  playerId?: string;
  playerName?: string;
  totalScore?: number;
  correctCount?: number;
  totalQuestions?: number;
  completedAt?: string;
  rank?: number;
}

const STORAGE_KEY_DEVICE_UUID = "onam_quiz_device_uuid";
const STORAGE_KEY_DEVICE_COMPLETED = "onam_quiz_device_completed";
const STORAGE_KEY_COMPLETED_DATA = "onam_quiz_device_completed_data";

// Cookie helper utilities
function getCookie(name: string): string | null {
  try {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function setCookie(name: string, value: string, days = 365): void {
  try {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = "; expires=" + date.toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
  } catch (e) {
    // ignore
  }
}

function deleteCookie(name: string): void {
  try {
    document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
  } catch (e) {
    // ignore
  }
}

/**
 * Generate or retrieve permanent unique Device UUID
 */
export function getOrCreateDeviceId(): string {
  let deviceId: string | null = null;

  // 1. Check localStorage
  try {
    deviceId = localStorage.getItem(STORAGE_KEY_DEVICE_UUID);
  } catch (e) {}

  // 2. Check sessionStorage
  if (!deviceId) {
    try {
      deviceId = sessionStorage.getItem(STORAGE_KEY_DEVICE_UUID);
    } catch (e) {}
  }

  // 3. Check Cookie
  if (!deviceId) {
    deviceId = getCookie(STORAGE_KEY_DEVICE_UUID);
  }

  // 4. Generate new Device UUID if missing
  if (!deviceId || deviceId.trim().length < 8) {
    const timestamp = Date.now().toString(36);
    const randomPartA = Math.random().toString(36).substring(2, 10);
    const randomPartB = Math.random().toString(36).substring(2, 10);
    deviceId = `dev_${timestamp}_${randomPartA}_${randomPartB}`;
  }

  // Persist across all storage vectors
  try {
    localStorage.setItem(STORAGE_KEY_DEVICE_UUID, deviceId);
    sessionStorage.setItem(STORAGE_KEY_DEVICE_UUID, deviceId);
    setCookie(STORAGE_KEY_DEVICE_UUID, deviceId);
  } catch (e) {}

  return deviceId;
}

/**
 * Generate a client hardware fingerprint token
 */
export function getDeviceFingerprint(): string {
  try {
    const screenRes = typeof window !== "undefined" && window.screen ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}` : "unknown_screen";
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "unknown_ua";
    const language = typeof navigator !== "undefined" ? navigator.language : "en";
    const timeZone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
    const concurrency = typeof navigator !== "undefined" && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : "unknown_cpu";

    // Simple deterministic hash
    const raw = `${screenRes}_${userAgent}_${language}_${timeZone}_${concurrency}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `fp_${Math.abs(hash).toString(36)}`;
  } catch (e) {
    return "fp_default";
  }
}

/**
 * Check if current device has already finished 15 questions
 */
export function isDeviceCompletedQuiz(): boolean {
  try {
    const localVal = localStorage.getItem(STORAGE_KEY_DEVICE_COMPLETED);
    if (localVal === "true") return true;

    const cookieVal = getCookie(STORAGE_KEY_DEVICE_COMPLETED);
    if (cookieVal === "true") return true;

    const sessionVal = sessionStorage.getItem(STORAGE_KEY_DEVICE_COMPLETED);
    if (sessionVal === "true") return true;
  } catch (e) {}
  return false;
}

/**
 * Retrieve saved completion details for locked state banner
 */
export function getDeviceCompletionDetails(): DeviceCompletionData {
  const isCompleted = isDeviceCompletedQuiz();
  let details: DeviceCompletionData = { isCompleted };

  if (isCompleted) {
    try {
      const savedStr = localStorage.getItem(STORAGE_KEY_COMPLETED_DATA) || getCookie(STORAGE_KEY_COMPLETED_DATA);
      if (savedStr) {
        const parsed = JSON.parse(savedStr);
        details = { ...details, ...parsed, isCompleted: true };
      }
    } catch (e) {}
  }

  return details;
}

/**
 * Mark device as permanently completed
 */
export function markDeviceQuizCompleted(
  playerOrName: { id?: string; name: string; totalScore: number; correctCount?: number; answeredCount?: number } | string,
  scoreOrRank?: number,
  correctCount?: number
): void {
  const isObject = typeof playerOrName === "object" && playerOrName !== null;
  const playerName = isObject ? playerOrName.name : String(playerOrName);
  const playerId = isObject ? playerOrName.id : undefined;
  const totalScore = isObject ? (playerOrName.totalScore || 0) : (scoreOrRank || 0);
  const correct = isObject ? (playerOrName.correctCount ?? 0) : (correctCount ?? 0);
  const totalQuestions = isObject ? (playerOrName.answeredCount ?? 15) : 15;

  const data: DeviceCompletionData = {
    isCompleted: true,
    playerId,
    playerName,
    totalScore: Math.round(totalScore * 100) / 100,
    correctCount: correct,
    totalQuestions,
    completedAt: new Date().toISOString(),
    rank: 1,
  };

  try {
    localStorage.setItem(STORAGE_KEY_DEVICE_COMPLETED, "true");
    localStorage.setItem(STORAGE_KEY_COMPLETED_DATA, JSON.stringify(data));

    sessionStorage.setItem(STORAGE_KEY_DEVICE_COMPLETED, "true");
    sessionStorage.setItem(STORAGE_KEY_COMPLETED_DATA, JSON.stringify(data));

    setCookie(STORAGE_KEY_DEVICE_COMPLETED, "true");
    setCookie(STORAGE_KEY_COMPLETED_DATA, JSON.stringify(data));
  } catch (e) {}
}

export const getDeviceId = getOrCreateDeviceId;
export const markDeviceCompletedQuiz = markDeviceQuizCompleted;

export function clearDeviceTracking(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_DEVICE_COMPLETED);
    localStorage.removeItem(STORAGE_KEY_COMPLETED_DATA);
    localStorage.removeItem("onam_quiz_player_id");
    localStorage.removeItem("onam_quiz_player_name");
    localStorage.removeItem("onam_quiz_saved_player_name");
    localStorage.removeItem("onam_quiz_device_registered_name");

    sessionStorage.removeItem(STORAGE_KEY_DEVICE_COMPLETED);
    sessionStorage.removeItem(STORAGE_KEY_COMPLETED_DATA);
    sessionStorage.removeItem("onam_quiz_player_id");
    sessionStorage.removeItem("onam_quiz_player_name");

    deleteCookie(STORAGE_KEY_DEVICE_COMPLETED);
    deleteCookie(STORAGE_KEY_COMPLETED_DATA);
  } catch (e) {}
}
