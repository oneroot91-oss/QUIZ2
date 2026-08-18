/**
 * Master Security and Admin Authentication Configuration
 * Supports both Full-Stack Server APIs and Client-Side/Static Hosting (Claude, GitHub Pages, etc.)
 */

export const MASTER_RECOVERY_PASSCODE = "0099887766";
export const DEFAULT_ADMIN_PASSWORD = "Admin@1965#IT";

const STORAGE_KEY_ADMIN_PASSWORD = "onam_quiz_admin_password";
const STORAGE_KEY_ADMIN_ENTRY_ENABLED = "onam_quiz_admin_entry_enabled";

/**
 * Get current stored admin password (fallback to default)
 */
export function getStoredAdminPassword(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ADMIN_PASSWORD);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (e) {
    // localStorage not accessible
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
 * Verify passcode locally
 */
export function verifyMasterPasscode(passcode: string): boolean {
  if (!passcode) return false;
  return passcode.trim() === MASTER_RECOVERY_PASSCODE;
}

/**
 * Verify password locally
 */
export function verifyAdminPasswordLocally(password: string): boolean {
  if (!password) return false;
  const trimmed = password.trim();
  const stored = getStoredAdminPassword();
  return trimmed === stored || trimmed === DEFAULT_ADMIN_PASSWORD;
}

/**
 * Robust API helper: Verify Passcode
 * Tries server first; if server is offline or fails (e.g. static hosting on Claude/GitHub Pages), falls back to local check.
 */
export async function verifyPasscodeWithFallback(passcode: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = (passcode || "").trim();
  if (!trimmed) {
    return { success: false, error: "Please enter the master recovery passcode." };
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

  // Local fallback (works offline and on Claude / GitHub Pages)
  if (verifyMasterPasscode(trimmed)) {
    return { success: true };
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

  // Always update local storage first so offline/static host retains credentials
  setStoredAdminPassword(trimmedNewPwd);

  try {
    const res = await fetch("/api/admin/reset-password-with-passcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passcode: trimmedPasscode,
        newPassword: trimmedNewPwd,
      }),
    });

    const contentType = res.headers.get("content-type");
    if (res.ok && contentType && contentType.includes("application/json")) {
      const data = await res.json();
      if (data.success) {
        return { success: true, newPassword: trimmedNewPwd };
      }
    }
  } catch (err) {
    // Network error or static server (Claude, GitHub Pages, etc.)
  }

  // Since passcode was validated locally and saved to localStorage, succeed!
  return {
    success: true,
    newPassword: trimmedNewPwd,
  };
}

/**
 * Robust API helper: Admin Login
 * Tries server first; if server is offline or fails (static host), validates against local storage.
 */
export async function loginAdminWithFallback(
  password: string
): Promise<{ success: boolean; error?: string; adminEntryEnabled?: boolean }> {
  const trimmed = (password || "").trim();
  if (!trimmed) {
    return { success: false, error: "Please enter the admin password." };
  }

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
      } else if (data?.error && res.status === 401) {
        // Explicit invalid password from active server
        if (!verifyAdminPasswordLocally(trimmed)) {
          return { success: false, error: data.error };
        }
      }
    }
  } catch (err) {
    // Server not available / static hosting
  }

  // Local fallback check
  if (verifyAdminPasswordLocally(trimmed)) {
    setStoredAdminPassword(trimmed);
    return { success: true, adminEntryEnabled: true };
  }

  return {
    success: false,
    error: "Incorrect admin password. Please try again or use 'Forgot password?'.",
  };
}
