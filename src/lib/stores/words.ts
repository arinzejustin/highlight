import { writable } from "svelte/store";
import { getAllWords, deleteWord } from "$lib/utils/idb";
import { Notification } from "$lib/utils/chromeWrap";
import type { SavedWord } from "$lib/types";

async function getWord(id: string) {
  const word = await getAllWords().then((words) =>
    words.find((w) => w.id === id),
  );
  if (!word) return "";
  return word;
}

function createWordsStore() {
  const { subscribe, set, update } = writable<SavedWord[]>([]);

  return {
    subscribe,

    // Load all words from IndexedDB
    async loadWords() {
      const words = await getAllWords();
      set(words);
    },

    async refresh() {
      await this.loadWords();
    },

    addWord(word: SavedWord) {
      update((words) => [word, ...words]);
    },

    async removeWord(id: string) {
      const word = await getWord(id);
      try {
        await deleteWord(id);
        update((words) => words.filter((w) => w.id !== id));
      } catch (error) {
        Notification(`Error deleting ${word}`);
      }
    },

    updateWord(id: string, updates: Partial<SavedWord>) {
      update((words) =>
        words.map((w) => (w.id === id ? { ...w, ...updates } : w)),
      );
    },
  };
}

export const wordsStore = createWordsStore();
