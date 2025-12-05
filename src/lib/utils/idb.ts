import { openDB, type IDBPDatabase } from "idb";
import type { SavedWord, highlight } from "$lib/types";

const DB_NAME = "highlight-db";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<highlight> | null = null;

async function getDB(): Promise<IDBPDatabase<highlight>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<highlight>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("words")) {
        const wordStore = db.createObjectStore("words", { keyPath: "id" });
        wordStore.createIndex("by-date", "createdAt");
        wordStore.createIndex("by-synced", "synced");
      }
    },
  });

  return dbInstance;
}

export async function addWord(word: Omit<SavedWord, "id">): Promise<string> {
  const db = await getDB();
  const id = `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const wordWithId: SavedWord = { ...word, id };
  await db.add("words", wordWithId);
  return id;
}

export async function getAllWords(): Promise<SavedWord[]> {
  const db = await getDB();
  const words = await db.getAllFromIndex("words", "by-date");
  return words.reverse();
}

export async function getWordById(id: string): Promise<SavedWord | undefined> {
  const db = await getDB();
  return db.get("words", id);
}

export async function deleteWord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("words", id);
}

export async function updateWord(
  id: string,
  updates: Partial<SavedWord>,
): Promise<void> {
  const db = await getDB();
  const word = await db.get("words", id);
  if (word) {
    await db.put("words", { ...word, ...updates });
  }
}

export async function markWordAsSynced(id: string): Promise<void> {
  await updateWord(id, { synced: true });
}

export async function getUnsyncedWords(): Promise<SavedWord[]> {
  const db = await getDB();
  const allWords = await db.getAllFromIndex("words", "by-synced");
  return allWords.filter((word) => !word.synced);
}

export async function exportWords(): Promise<SavedWord[]> {
  return getAllWords();
}

export async function clearAllWords(): Promise<void> {
  const db = await getDB();
  await db.clear("words");
}
