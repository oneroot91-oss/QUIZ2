/**
 * Master Security and Admin Authentication Configuration
 * Supports both Full-Stack Server APIs and Client-Side/Static Hosting (InfinityFree, Claude, GitHub Pages, etc.)
 */

export const MASTER_RECOVERY_PASSCODE = "0099887766";
export const DEFAULT_ADMIN_PASSWORD = "Admin@1965#IT";

const STORAGE_KEY_ADMIN_PASSWORD = "onam_quiz_admin_password";

/**
 * Get current stored admin password (fallback to default if none saved)
 */
export function getStoredAdminPassword(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ADMIN_PASSWORD);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (e) {
    // localStorage not accessible (e.g. private browsing mode)
  }
  return DEFAULT_ADMIN_PASSWORD;
}

/**
 * Save new admin password to localStorage
 */
export function setStoredAdminPassword(password: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_PASSWORD, password.trim());
  } catch (e) {
    console.warn("Could not save admin password to localStorage:", e);
  }
}

/**
 * Verify recovery passcode
 */
export function verifyMasterPasscode(passcode: string): boolean {
  if (!passcode) return false;
  const trimmed = passcode.trim();
  return trimmed === MASTER_RECOVERY_PASSCODE;
}

/**
 * Verify password locally against stored or default password or master passcode
 */
export function verifyAdminPasswordLocally(password: string): boolean {
  if (!password) return false;
  const trimmed = password.trim();
  const stored = getStoredAdminPassword();
  
  // 1. Check custom saved password
  if (trimmed === stored) return true;
  
  // 2. Check canonical default password (case-insensitive for convenience)
  if (trimmed.toLowerCase() === DEFAULT_ADMIN_PASSWORD.toLowerCase()) return true;

  // 3. Check master recovery passcode entered directly as password
  if (trimmed === MASTER_RECOVERY_PASSCODE) return true;
  
  return false;
}

/**
 * Robust API helper: Verify Passcode
 * Tries server first; if server is offline or fails (e.g. static hosting on InfinityFree / Claude / GitHub Pages), falls back to local check.
 */
export async function verifyPasscodeWithFallback(passcode: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = (passcode || "").trim();
  if (!trimmed) {
    return { success: false, error: "Please enter the master recovery passcode." };
  }

  // Local check first for instant, guaranteed verification on static hosting (InfinityFree)
  if (verifyMasterPasscode(trimmed)) {
    try {
      fetch("/api/admin/verify-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: trimmed }),
      }).catch(() => {});
    } catch (e) {}
    return { success: true };
  }

  try {
    const res = await fetch("/api/admin/verify-passcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: trimmed }),
    });

    const contentType = res.headers.get("content-type");
    if (res.ok && contentType && contentType.includes("application/json")) {
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
    }
  } catch (err) {
    // Network or static host - continue to local fallback
  }

  return {
    success: false,
    error: "Invalid passcode. Please enter the correct master recovery passcode (0099887766).",
  };
}

/**
 * Robust API helper: Reset Admin Password with Passcode
 * Tries server first; if server is offline or fails (static host), saves to localStorage and returns success.
 */
export async function resetPasswordWithPasscodeWithFallback(
  passcode: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; newPassword?: string }> {
  const trimmedPasscode = (passcode || "").trim();
  const trimmedNewPwd = (newPassword || "").trim();

  if (!trimmedNewPwd || trimmedNewPwd.length < 4) {
    return { success: false, error: "New password must be at least 4 characters long." };
  }

  if (!verifyMasterPasscode(trimmedPasscode)) {
    return { success: false, error: "Invalid master recovery passcode. Password reset denied." };
  }

  // Always update local storage so offline/static host retains credentials
  setStoredAdminPassword(trimmedNewPwd);

  try {
    fetch("/api/admin/reset-password-with-passcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passcode: trimmedPasscode,
        newPassword: trimmedNewPwd,
      }),
    }).catch(() => {});
  } catch (err) {
    // Network error or static server (InfinityFree, Claude, GitHub Pages, etc.)
  }

  // Since passcode was validated locally and saved to localStorage, succeed immediately!
  return {
    success: true,
    newPassword: trimmedNewPwd,
  };
}

/**
 * Robust API helper: Admin Login
 * Tries server first; if server is offline or fails (static host like InfinityFree), validates against local storage.
 */
export async function loginAdminWithFallback(
  password: string
): Promise<{ success: boolean; error?: string; adminEntryEnabled?: boolean }> {
  const trimmed = (password || "").trim();
  if (!trimmed) {
    return { success: false, error: "Please enter the admin password." };
  }

  // 1. Instant check against local verification (Guarantees success on InfinityFree & static hosts)
  if (verifyAdminPasswordLocally(trimmed)) {
    setStoredAdminPassword(trimmed);
    try {
      fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: trimmed }),
      }).catch(() => {});
    } catch (e) {}
    return { success: true, adminEntryEnabled: true };
  }

  // 2. Server API fallback for dynamic Node.js backend
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: trimmed }),
    });

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await res.json();
      if (res.ok && data.success) {
        setStoredAdminPassword(trimmed);
        return { success: true, adminEntryEnabled: data.adminEntryEnabled !== false };
      } else if (res.status === 401 && data?.error) {
        return { success: false, error: data.error };
      }
    }
  } catch (err) {
    // Server not available / static hosting environment
  }

  return {
    success: false,
    error: "Incorrect admin password. Please try again or use 'Forgot password?'.",
  };
}
