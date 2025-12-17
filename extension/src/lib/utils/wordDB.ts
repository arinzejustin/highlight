import { getLocalStorage, setLocalStorage } from "$lib/utils/chromeWrap";
import type { SavedWord, RequestedWord } from "$lib/types";

const KEYS = {
  SAVED: "saved_words",
  REQUESTED: "requested_words"
} as const;

async function storageGet<T>(key: string): Promise<T[]> {
  const data = await getLocalStorage<{ [key: string]: T[] }>([key]);
  return data[key] || [];
}

async function storageSet<T>(key: string, value: T[]): Promise<void> {
  await setLocalStorage({ [key]: value });
}

export const addWord = async (word: Omit<SavedWord, "id">): Promise<string> => {
  const words = await storageGet<SavedWord>(KEYS.SAVED);
  const id = crypto.randomUUID();
  const wordWithId: SavedWord = { ...word, id };
  await storageSet(KEYS.SAVED, [...words, wordWithId]);
  return id;
};

export const getAllWords = async (): Promise<SavedWord[]> => {
  const words = await storageGet<SavedWord>(KEYS.SAVED);
  return words.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const getWordById = async (id: string): Promise<SavedWord | undefined> => {
  const words = await storageGet<SavedWord>(KEYS.SAVED);
  return words.find(w => w.id === id);
};

export const deleteWord = async (id: string): Promise<void> => {
  const words = await storageGet<SavedWord>(KEYS.SAVED);
  await storageSet(KEYS.SAVED, words.filter(w => w.id !== id));
};

export const updateWord = async (id: string, updates: Partial<SavedWord>): Promise<void> => {
  const words = await storageGet<SavedWord>(KEYS.SAVED);
  const index = words.findIndex(w => w.id === id);
  if (index !== -1) {
    const updatedWords = [...words];
    updatedWords[index] = { ...updatedWords[index], ...updates };
    await storageSet(KEYS.SAVED, updatedWords);
  }
};

export const markWordAsSynced = async (id: string): Promise<void> => {
  await updateWord(id, { synced: true });
};

export const getUnsyncedWords = async (): Promise<SavedWord[]> => {
  const words = await storageGet<SavedWord>(KEYS.SAVED);
  return words.filter(w => !w.synced);
};

export const getUnsyncLength = async (): Promise<number> => {
  const words = await getUnsyncedWords();
  return words.length;
};

export const clearAllWords = async (): Promise<void> => {
  await storageSet(KEYS.SAVED, []);
};

export const addRequestedWord = async (word: string, responseType: RequestedWord["responseType"]): Promise<void> => {
  const requested = await storageGet<RequestedWord>(KEYS.REQUESTED);
  const newEntry: RequestedWord = {
    word,
    requestedAt: new Date().toISOString(),
    responseType
  };
  await storageSet(KEYS.REQUESTED, [...requested, newEntry]);
};

export const getRequestedWords = async (): Promise<RequestedWord[]> => {
  return storageGet<RequestedWord>(KEYS.REQUESTED);
};

export const clearRequestedWords = async (): Promise<void> => {
  await storageSet(KEYS.REQUESTED, []);
};