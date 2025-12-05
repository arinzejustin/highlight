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
  token: string;
  userId: string;
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
