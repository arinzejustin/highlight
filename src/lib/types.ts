import type { DBSchema } from "idb";

export interface SavedWord {
  id: string;
  word: string;
  meaning: string;
  url: string;
  createdAt: number;
  synced: boolean;
}

export interface AuthData {
  authToken: string | null;
  userId: string | null;
  user: User | null;
  deviceId?: string | null;
}

export interface SyncResponse {
  success: boolean;
  syncedCount?: number;
  error?: string;
}

export interface highlight extends DBSchema {
  words: {
    key: string;
    value: SavedWord;
    indexes: {
      "by-date": number;
      "by-synced": number;
    };
  };
}

export interface User {
  userId: string;
  email: string;
  plan: "free" | "premium";
  expiryDate: Date;
  username: string;
  createdAt: string;
  status: "active" | "suspended" | "deleted";
  allowedList?: string[],
  extensionMode?: boolean;
  records?: {
    requestCount: number;
    lastRequestDate: string;
    failedRequestCount: number;
    successfulRequestCount: number;
  };
}

export interface AuthState extends AuthData {
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
}

export interface LogoutReason {
  MANUAL: string;
  INVALID_USER_DATA: string;
  FETCH_USER_FAILED: string;
  INVALID_USER_STRUCTURE: string;
}

export interface ActivationState {
  isActivated: boolean;
  user?: User;
}

export interface DeviceInfo {
  deviceId: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  platform: string;
  engine: string;
}