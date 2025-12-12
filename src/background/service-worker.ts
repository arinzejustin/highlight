import { syncWords, getUserById, syncUser, InitDeviceId } from "$lib/utils/api";
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
import { getDeviceInfo, retriveId, setDeviceId } from "$lib/utils/Device";
import type { User, AuthData, DeviceInfo } from "$lib/types";

interface SyncState {
  lastSyncTime?: number;
  failedSyncAttempts?: number;
}

const SYNC_INTERVAL = 5 * 60 * 1000;
const USER_CHECK_INTERVAL = 10 * 60 * 1000;

const STORAGE_KEYS = {
  AUTH_TOKEN: "authToken",
  USER_ID: "userId",
  USER: "user",
  ONBOARDING: "hasCompletedOnboarding",
  DEVICE_ID: "deviceId",
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
  SYNC_USER_TO_BACKEND: "SYNC_USER_TO_BACKEND",
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
  USER_SYNC_SUCCESS: "User data synced to backend",
  USER_SYNC_FAILED: "Failed to sync user data",
} as const;

const BLOCKED_ACCOUNT_STATUSES = ["suspended", "deleted", "banned"] as const;
const USER_FIELDS_TO_MONITOR = [
  "expiryDate",
  "plan",
  "email",
  "username",
  "records",
  "allowedList",
  "extensionMode",
] as const satisfies readonly (keyof User)[];

let syncIntervalId: number | null = null;
let userCheckIntervalId: number | null = null;
let isSyncing = false;
let isCheckingUser = false;
let isSyncingUser = false;

function isValidUserData(user: any): user is User {
  return (
    user !== null &&
    typeof user === "object" &&
    typeof user.userId === "string" &&
    user.userId.length > 0
  );
}

function isAuthenticationError(error: any): boolean {
  if (!error) return false;

  const status = error.status || error.code;
  if ([401, 403].includes(status)) return true;

  const message = String(error.message || error.error || "").toLowerCase();
  return /token.*expired|expired.*token|jwt.*expired|unauthorized/i.test(
    message,
  );
}

function getLogoutReason(error: any): string {
  if (!error) return LOGOUT_REASONS.SESSION_INVALID;

  const status = error.status || error.code;
  if (status === 404) return LOGOUT_REASONS.ACCOUNT_NOT_FOUND;
  if (isAuthenticationError(error)) return LOGOUT_REASONS.SESSION_EXPIRED;

  return LOGOUT_REASONS.SESSION_INVALID;
}

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

async function performLogout(reason: string): Promise<void> {
  try {
    clearAllIntervals();

    await removeChromeStorage([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.ONBOARDING,
      STORAGE_KEYS.USER,
    ]);

    await chromeBroadcast({
      type: BROADCAST_EVENTS.LOGGED_OUT,
      reason,
    });

    Notification(reason);
  } catch (error) {
    console.error("[Highlight] Logout failed:", error);
  }
}

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

async function registerDeviceIfNeeded(): Promise<void> {
  const deviceId = await retriveId();

  if (deviceId) {
    return;
  }

  const deviceInfo: Omit<DeviceInfo, "deviceId"> = getDeviceInfo();

  try {
    const deviceId = await InitDeviceId(deviceInfo);

    if (!deviceId) {
      throw new Error("Failed to initialize device ID");
    }

    await setDeviceId(deviceId);
  } catch (error) {
    console.error("[Highlight] Device registration failed:", error);
  }
}

async function syncWordsIfNeeded(): Promise<void> {
  if (isSyncing || !navigator.onLine) {
    return;
  }

  isSyncing = true;

  try {
    const authData = await getChromeStorage<AuthData>([
      STORAGE_KEYS.AUTH_TOKEN,
    ]);

    if (!authData.authToken) {
      return;
    }

    const allWords = await getAllWords();
    const unsyncedWords = allWords.filter((word) => !word.synced);

    if (unsyncedWords.length === 0) {
      return;
    }

    const result = await syncWords(unsyncedWords, authData.authToken);

    if (result.success) {
      await Promise.all(unsyncedWords.map((word) => markWordAsSynced(word.id)));

      await setLocalStorage({
        [LOCAL_STORAGE_KEYS.LAST_SYNC_TIME]: Date.now(),
        [LOCAL_STORAGE_KEYS.FAILED_SYNC_ATTEMPTS]: 0,
      });
    } else {
      throw new Error("Sync failed: server returned unsuccessful status");
    }
  } catch (error: any) {
    console.error("[Highlight] Sync error:", error);

    if (isAuthenticationError(error)) {
      await performLogout(getLogoutReason(error));
      return;
    }

    const syncState = await getLocalStorage<SyncState>([
      LOCAL_STORAGE_KEYS.FAILED_SYNC_ATTEMPTS,
    ]);
    const failedAttempts = (syncState.failedSyncAttempts || 0) + 1;

    await setLocalStorage({
      [LOCAL_STORAGE_KEYS.FAILED_SYNC_ATTEMPTS]: failedAttempts,
    });

    if (failedAttempts >= 3) {
      Notification(NOTIFICATION_MESSAGES.SYNC_FAILED);
    }
  } finally {
    isSyncing = false;
  }
}

async function checkUserStatus(): Promise<void> {
  if (isCheckingUser || !navigator.onLine) {
    return;
  }

  isCheckingUser = true;

  try {
    const authData = await getChromeStorage<AuthData>([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.USER,
    ]);

    if (!authData.authToken || !authData.userId) {
      return;
    }

    const freshUser = await getUserById(authData.userId, authData.authToken);

    if (!isValidUserData(freshUser)) {
      console.error("[Highlight] Invalid user data received");
      await performLogout(LOGOUT_REASONS.INVALID_USER_DATA);
      return;
    }

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

    const currentUser: Partial<User> = authData.user || {};
    const hasChanged = USER_FIELDS_TO_MONITOR.some(
      (field) => currentUser[field] !== freshUser[field],
    );

    if (hasChanged) {
      await setChromeStorage({
        [STORAGE_KEYS.USER]: freshUser,
      });

      await chromeBroadcast({
        type: BROADCAST_EVENTS.USER_UPDATED,
        user: freshUser,
      });

      Notification(NOTIFICATION_MESSAGES.USER_UPDATED);
    }
  } catch (error: any) {
    console.error("[Highlight] User check error:", error);

    if (isAuthenticationError(error) || error.status === 404) {
      await performLogout(getLogoutReason(error));
    }
  } finally {
    isCheckingUser = false;
  }
}

async function syncUserToBackend(): Promise<boolean> {
  if (isSyncingUser || !navigator.onLine) {
    return false;
  }

  isSyncingUser = true;

  try {
    const authData = await getChromeStorage<AuthData>([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.DEVICE_ID,
    ]);

    if (!authData.deviceId) {
      return false;
    }

    return await syncUser(authData);

  } catch (error: any) {
    console.error("[Highlight] User sync error:", error);

    if (isAuthenticationError(error)) {
      await performLogout(getLogoutReason(error));
    }

    return false;
  } finally {
    isSyncingUser = false;
  }
}

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

      if (message.type === MESSAGE_TYPES.SYNC_USER_TO_BACKEND) {
        const success = await syncUserToBackend();
        return { success };
      }

      return { success: false, error: "Unknown message type" };
    } catch (error) {
      console.error("[Highlight] Message handler error:", error);
      return { success: false, error: String(error) };
    }
  };

  handleAsync()
    .then(sendResponse)
    .catch((error) => {
      console.error("[Highlight] Unexpected error:", error);
      sendResponse({ success: false, error: String(error) });
    });

  return true;
});

function scheduleTasks(): void {
  clearAllIntervals();

  syncIntervalId = setInterval(() => {
    syncWordsIfNeeded().catch((error) => {
      console.error("[Highlight] Sync task failed:", error);
    });
  }, SYNC_INTERVAL) as unknown as number;

  userCheckIntervalId = setInterval(() => {
    checkUserStatus().catch((error) => {
      console.error("[Highlight] User check task failed:", error);
    });
  }, USER_CHECK_INTERVAL) as unknown as number;

  setTimeout(() => {
    checkUserStatus().catch((error) => {
      console.error("[Highlight] Initial user check failed:", error);
    });
    syncWordsIfNeeded().catch((error) => {
      console.error("[Highlight] Initial sync failed:", error);
    });
  }, 8000);
}

chrome.runtime.onInstalled.addListener((details) => {
  registerDeviceIfNeeded().catch((error) => {
    console.error("[Highlight] Device registration failed:", error);
  });
  scheduleTasks();
});

chrome.runtime.onStartup.addListener(() => {
  registerDeviceIfNeeded().catch((error) => {
    console.error("[Highlight] Device registration failed:", error);
  });
  scheduleTasks();
});

addEventListener("online", () => {
  checkUserStatus().catch((error) => {
    console.error("[Highlight] User check on reconnect failed:", error);
  });
  syncWordsIfNeeded().catch((error) => {
    console.error("[Highlight] Sync on reconnect failed:", error);
  });
});

scheduleTasks();

export { };