import { syncWords } from "$lib/utils/api";
import { getAllWords, markWordAsSynced } from "$lib/utils/idb";

chrome.runtime.onInstalled.addListener(() => {
  console.log("Word Saver extension installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SYNC_WORDS") {
    handleSync()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error("Sync failed:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function handleSync() {
  try {
    const authData = await chrome.storage.sync.get(["authToken", "userId"]);

    if (!authData.authToken) {
      console.log("No auth token, skipping sync");
      return;
    }

    const words = await getAllWords();
    const unsyncedWords = words.filter((w) => !w.synced);

    if (unsyncedWords.length === 0) {
      console.log("No unsynced words");
      return;
    }

    console.log(`Syncing ${unsyncedWords.length} words...`);

    const result = await syncWords(unsyncedWords, authData.authToken);

    if (result.success) {
      for (const word of unsyncedWords) {
        await markWordAsSynced(word.id);
      }

      await chrome.storage.local.set({
        lastSyncTime: Date.now(),
      });

      console.log("Sync completed successfully");
    }
  } catch (error) {
    console.error("Sync error:", error);
    throw error;
  }
}

setInterval(
  () => {
    handleSync().catch(console.error);
  },
  5 * 60 * 1000,
);

export {};
