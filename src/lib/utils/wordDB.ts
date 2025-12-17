import { getLocalStorage, setLocalStorage } from "$lib/utils/chromeWrap";
import type { SavedWord } from "$lib/types";

const WORDS_STORAGE_KEY = "highlight_words";

async function getWordsFromStorage(): Promise<SavedWord[]> {
  const data = await getLocalStorage<{ [WORDS_STORAGE_KEY]?: SavedWord[] }>([WORDS_STORAGE_KEY]);
  return data[WORDS_STORAGE_KEY] || [];
}

async function saveWordsToStorage(words: SavedWord[]): Promise<void> {
  await setLocalStorage({ [WORDS_STORAGE_KEY]: words });
}

export async function addWord(word: Omit<SavedWord, "id">): Promise<string> {
  const words = await getWordsFromStorage();
  const id = `word_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const wordWithId: SavedWord = { ...word, id };
  words.push(wordWithId);
  await saveWordsToStorage(words);
  return id;
}

export async function getAllWords(): Promise<SavedWord[]> {
  const words = await getWordsFromStorage();
  return words.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getWordById(id: string): Promise<SavedWord | undefined> {
  const words = await getWordsFromStorage();
  return words.find(word => word.id === id);
}

export async function deleteWord(id: string): Promise<void> {
  const words = await getWordsFromStorage();
  const filteredWords = words.filter(word => word.id !== id);
  await saveWordsToStorage(filteredWords);
}

export async function updateWord(
  id: string,
  updates: Partial<SavedWord>,
): Promise<void> {
  const words = await getWordsFromStorage();
  const index = words.findIndex(word => word.id === id);
  if (index !== -1) {
    words[index] = { ...words[index], ...updates };
    await saveWordsToStorage(words);
  }
}

export async function markWordAsSynced(id: string): Promise<void> {
  await updateWord(id, { synced: true });
}

export async function getUnsyncedWords(): Promise<SavedWord[]> {
  const words = await getWordsFromStorage();
  return words.filter(word => !word.synced);
}

export async function exportWords(): Promise<SavedWord[]> {
  return getAllWords();
}

export async function clearAllWords(): Promise<void> {
  await setLocalStorage({ [WORDS_STORAGE_KEY]: [] });
}

export async function getUnsyncLength(): Promise<number> {
  const words = await getUnsyncedWords();
  return words.length || 0;
}