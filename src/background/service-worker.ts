// background.ts
import { syncWords, getUserById } from "$lib/utils/api";
import { getAllWords, markWordAsSynced } from "$lib/utils/idb";
import {
  getChromeStorage,
  setChromeStorage,
  removeChromeStorage,
  getLocalStorage,
  setLocalStorage,
  chromeBroadcast,
  Notification,
} from "$lib/utils/chromeWrap";
import type { User, AuthData } from "$lib/types";

interface SyncState {
  lastSyncTime?: number;
  failedSyncAttempts?: number;
}

// ============================================================================
// Constants
// ============================================================================

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const USER_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes
const INITIAL_DELAY = 8000; // 8 seconds
const MAX_RETRY_ATTEMPTS = 3;

const STORAGE_KEYS = {
  AUTH_TOKEN: "authToken",
  USER_ID: "userId",
  USER: "user",
  ONBOARDING: "hasCompletedOnboarding",
} as const;

const LOCAL_STORAGE_KEYS = {
  LAST_SYNC_TIME: "lastSyncTime",
  FAILED_SYNC_ATTEMPTS: "failedSyncAttempts",
} as const;

const BROADCAST_EVENTS = {
  LOGGED_OUT: "USER_LOGGED_OUT",
  USER_UPDATED: "USER_UPDATED",
} as const;

const MESSAGE_TYPES = {
  SYNC_WORDS: "SYNC_WORDS",
  CHECK_USER_STATUS: "CHECK_USER_STATUS",
} as const;

const LOGOUT_REASONS = {
  SESSION_EXPIRED: "Your session has expired. Please log in again",
  ACCOUNT_SUSPENDED: "Your account has been suspended",
  ACCOUNT_DELETED: "Your account has been deleted",
  ACCOUNT_BANNED: "Your account has been banned",
  ACCOUNT_NOT_FOUND: "Account not found. Please log in again",
  SESSION_INVALID: "Your session is invalid. Please log in again",
  INVALID_USER_DATA: "Unable to verify user data. Please log in again",
} as const;

const NOTIFICATION_MESSAGES = {
  SYNC_SUCCESS: "Successfully synced your words",
  SYNC_FAILED: "Failed to sync words. Will retry later",
  USER_UPDATED: "Your account information has been updated",
} as const;

const BLOCKED_ACCOUNT_STATUSES = ["suspended", "deleted", "banned"] as const;
const USER_FIELDS_TO_MONITOR = ["expiryDate", "plan", "email", "username"] as const satisfies readonly (keyof User)[];

// ============================================================================
// State Management
// ============================================================================

let syncIntervalId: number | null = null;
let userCheckIntervalId: number | null = null;
let isSyncing = false;
let isCheckingUser = false;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates if user data has required fields
 */
function isValidUserData(user: any): user is User {
  return (
    user !== null &&
    typeof user === "object" &&
    typeof user.userId === "string" &&
    user.userId.length > 0
  );
}

/**
 * Checks if an error indicates an expired or invalid token
 */
function isAuthenticationError(error: any): boolean {
  if (!error) return false;

  const status = error.status || error.code;
  if ([401, 403].includes(status)) return true;

  const message = String(error.message || error.error || "").toLowerCase();
  return /token.*expired|expired.*token|jwt.*expired|unauthorized/i.test(
    message,
  );
}

/**
 * Determines logout reason based on error
 */
function getLogoutReason(error: any): string {
  if (!error) return LOGOUT_REASONS.SESSION_INVALID;

  const status = error.status || error.code;
  if (status === 404) return LOGOUT_REASONS.ACCOUNT_NOT_FOUND;
  if (isAuthenticationError(error)) return LOGOUT_REASONS.SESSION_EXPIRED;

  return LOGOUT_REASONS.SESSION_INVALID;
}

/**
 * Gets account status logout reason
 */
function getAccountStatusReason(status: string): string {
  switch (status) {
    case "suspended":
      return LOGOUT_REASONS.ACCOUNT_SUSPENDED;
    case "deleted":
      return LOGOUT_REASONS.ACCOUNT_DELETED;
    case "banned":
      return LOGOUT_REASONS.ACCOUNT_BANNED;
    default:
      return LOGOUT_REASONS.SESSION_INVALID;
  }
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Performs logout and notifies user
 */
async function performLogout(reason: string): Promise<void> {
  try {
    console.log(`[Logout] ${reason}`);

    // Clear all intervals to stop background tasks
    clearAllIntervals();

    // Remove auth data from storage
    await removeChromeStorage([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.ONBOARDING,
      STORAGE_KEYS.USER,
    ]);

    // Broadcast logout event to all extension pages
    await chromeBroadcast({
      type: BROADCAST_EVENTS.LOGGED_OUT,
      reason,
    });

    // Show notification to user
    Notification(reason);
  } catch (error) {
    console.error("[Logout] Failed to complete logout:", error);
    // Still notify user even if cleanup fails
    Notification(reason);
  }
}

/**
 * Clears all background task intervals
 */
function clearAllIntervals(): void {
  if (syncIntervalId !== null) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
  if (userCheckIntervalId !== null) {
    clearInterval(userCheckIntervalId);
    userCheckIntervalId = null;
  }
}

/**
 * Syncs unsynced words to the server
 */
async function syncWordsIfNeeded(): Promise<void> {
  // Guard clauses
  if (isSyncing) {
    console.log("[Highlight Sync] Already syncing, skipping...");
    return;
  }

  if (!navigator.onLine) {
    console.log("[Highlight Sync] Offline, skipping...");
    return;
  }

  isSyncing = true;

  try {
    // Get auth data
    const authData = await getChromeStorage<AuthData>([
      STORAGE_KEYS.AUTH_TOKEN,
    ]);

    if (!authData.authToken) {
      console.log("[Highlight Sync] No auth token, skipping sync");
      return;
    }

    // Get unsynced words
    const allWords = await getAllWords();
    const unsyncedWords = allWords.filter((word) => !word.synced);

    if (unsyncedWords.length === 0) {
      console.log("[Highlight Sync] No words to sync");
      return;
    }

    console.log(`[Highlight Sync] Syncing ${unsyncedWords.length} word(s)...`);

    // Attempt sync
    const result = await syncWords(unsyncedWords, authData.authToken);

    if (result.success) {
      // Mark words as synced
      await Promise.all(unsyncedWords.map((word) => markWordAsSynced(word.id)));

      // Update sync metadata
      await setLocalStorage({
        [LOCAL_STORAGE_KEYS.LAST_SYNC_TIME]: Date.now(),
        [LOCAL_STORAGE_KEYS.FAILED_SYNC_ATTEMPTS]: 0,
      });

      console.log(
        `[Highlight Sync] Successfully synced ${unsyncedWords.length} word(s)`,
      );
    } else {
      throw new Error("[Highlight Sync] Sync failed: server returned unsuccessful status");
    }
  } catch (error: any) {
    console.error("[Highlight Sync] Error:", error);

    // Handle authentication errors
    if (isAuthenticationError(error)) {
      await performLogout(getLogoutReason(error));
      return;
    }

    // Track failed attempts
    const syncState = await getLocalStorage<SyncState>([
      LOCAL_STORAGE_KEYS.FAILED_SYNC_ATTEMPTS,
    ]);
    const failedAttempts = (syncState.failedSyncAttempts || 0) + 1;

    await setLocalStorage({
      [LOCAL_STORAGE_KEYS.FAILED_SYNC_ATTEMPTS]: failedAttempts,
    });

    // Notify on repeated failures
    if (failedAttempts >= MAX_RETRY_ATTEMPTS) {
      Notification(NOTIFICATION_MESSAGES.SYNC_FAILED);
    }
  } finally {
    isSyncing = false;
  }
}

/**
 * Checks user status and updates if needed
 */
async function checkUserStatus(): Promise<void> {
  // Guard clauses
  if (isCheckingUser) {
    console.log("[Highlight UserCheck] Already checking, skipping...");
    return;
  }

  if (!navigator.onLine) {
    console.log("[Highlight UserCheck] Offline, skipping...");
    return;
  }

  isCheckingUser = true;

  try {
    // Get stored auth data
    const authData = await getChromeStorage<AuthData>([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.USER,
    ]);

    if (!authData.authToken || !authData.userId) {
      console.log("[Highlight UserCheck] No auth credentials, skipping");
      return;
    }

    // Fetch fresh user data from server
    const freshUser = await getUserById(authData.userId, authData.authToken);

    // Validate response
    if (!isValidUserData(freshUser)) {
      console.error(
        "[Highlight UserCheck] Invalid user data received from server",
      );
      await performLogout(LOGOUT_REASONS.INVALID_USER_DATA);
      return;
    }

    // Check if account is blocked
    const accountStatus = freshUser.status?.toLowerCase();
    if (
      accountStatus &&
      BLOCKED_ACCOUNT_STATUSES.includes(
        accountStatus as (typeof BLOCKED_ACCOUNT_STATUSES)[number],
      )
    ) {
      await performLogout(getAccountStatusReason(accountStatus));
      return;
    }

    // Check if user data has changed
    const currentUser: Partial<User> = authData.user || {};
    const hasChanged = USER_FIELDS_TO_MONITOR.some(
      (field) => currentUser[field] !== freshUser[field],
    );

    if (hasChanged) {
      console.log("[Highlight UserCheck] User data changed, updating...");

      await setChromeStorage({
        [STORAGE_KEYS.USER]: freshUser,
      });

      await chromeBroadcast({
        type: BROADCAST_EVENTS.USER_UPDATED,
        user: freshUser,
      });

      Notification(NOTIFICATION_MESSAGES.USER_UPDATED);
    } else {
      console.log("[Highlight UserCheck] User data unchanged");
    }
  } catch (error: any) {
    console.error("[Highlight UserCheck] Error:", error);

    // Handle authentication errors
    if (isAuthenticationError(error) || error.status === 404) {
      await performLogout(getLogoutReason(error));
    }
  } finally {
    isCheckingUser = false;
  }
}

// ============================================================================
// Message Handler
// ============================================================================

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handleAsync = async () => {
    try {
      if (message.type === MESSAGE_TYPES.SYNC_WORDS) {
        await syncWordsIfNeeded();
        return { success: true };
      }

      if (message.type === MESSAGE_TYPES.CHECK_USER_STATUS) {
        await checkUserStatus();
        return { success: true };
      }

      return { success: false, error: "Unknown message type" };
    } catch (error) {
      console.error("[Highlight MessageHandler] Error:", error);
      return { success: false, error: String(error) };
    }
  };

  handleAsync()
    .then(sendResponse)
    .catch((error) => {
      console.error("[Highlight MessageHandler] Unexpected error:", error);
      sendResponse({ success: false, error: String(error) });
    });

  return true;
});

// ============================================================================
// Task Scheduling
// ============================================================================

/**
 * Schedules background tasks
 */
function scheduleTasks(): void {
  // Clear existing intervals to prevent duplicates
  clearAllIntervals();

  console.log("[Highlight Scheduler] Starting background tasks...");

  // Schedule word sync
  syncIntervalId = setInterval(() => {
    syncWordsIfNeeded().catch((error) => {
      console.error("[Scheduler] Sync task failed:", error);
    });
  }, SYNC_INTERVAL) as unknown as number;

  // Schedule user check
  userCheckIntervalId = setInterval(() => {
    checkUserStatus().catch((error) => {
      console.error("[Highlight Scheduler] User check task failed:", error);
    });
  }, USER_CHECK_INTERVAL) as unknown as number;

  // Run initial checks after delay
  setTimeout(() => {
    console.log("[Highlight Scheduler] Running initial checks...");
    checkUserStatus().catch((error) => {
      console.error("[Highlight Scheduler] Initial user check failed:", error);
    });
    syncWordsIfNeeded().catch((error) => {
      console.error("[Highlight Scheduler] Initial sync failed:", error);
    });
  }, INITIAL_DELAY);
}

// ============================================================================
// Lifecycle Events
// ============================================================================

// Schedule tasks on extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[Highlight Lifecycle] Extension ${details.reason}`);
  scheduleTasks();
});

// Schedule tasks on browser startup
chrome.runtime.onStartup.addListener(() => {
  console.log("[Highlight Lifecycle] Browser started");
  scheduleTasks();
});

// Run checks when coming back online
addEventListener("online", () => {
  console.log("[Highlight Network] Back online, running checks...");
  checkUserStatus().catch((error) => {
    console.error("[Highlight Network] User check on reconnect failed:", error);
  });
  syncWordsIfNeeded().catch((error) => {
    console.error("[Highlight Network] Sync on reconnect failed:", error);
  });
});

// ============================================================================
// Initialize
// ============================================================================

// Start tasks immediately when script loads
scheduleTasks();

export { };
