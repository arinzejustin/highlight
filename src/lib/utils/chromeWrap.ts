export async function getChromeStorage<T = Record<string, any>>(
  keys: string | string[] | null = null,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!chrome.storage?.sync) {
      reject(new Error("chrome.storage.sync is not available"));
      return;
    }

    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result as T);
      }
    });
  });
}

export async function setChromeStorage(
  items: Record<string, any>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!chrome.storage?.sync) {
      reject(new Error("chrome.storage.sync is not available"));
      return;
    }

    chrome.storage.sync.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export async function removeChromeStorage(
  keys: string | string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!chrome.storage?.sync) {
      reject(new Error("chrome.storage.sync is not available"));
      return;
    }

    chrome.storage.sync.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export async function getLocalStorage<T>(keys: string | string[]): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result as T);
    });
  });
}

export async function setLocalStorage(
  items: Record<string, any>,
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => {
      resolve();
    });
  });
}

export function sendMessage<T = any>(message: any): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

export function Notification(message: string): void {
  if (!chrome.notifications) {
    console.warn(
      "chrome.notifications API is not available (maybe missing permission or not in extension context)",
    );
    return;
  }

  chrome.permissions.contains({ permissions: ["notifications"] }, (granted) => {
    if (!granted) {
      console.warn("Notifications permission not granted");
      return;
    }

    chrome.notifications.create(
      {
        type: "basic",
        iconUrl: chrome.runtime.getURL("/icons/57.png"),
        title: "Highlight Notification",
        message: message,
      },
      (notificationId) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Notification failed:",
            chrome.runtime.lastError.message,
          );
        } else {
          console.log("Notification shown:", notificationId);
        }
      },
    );
  });
}

export async function chromeBroadcast(message: any) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      tab.id && chrome.tabs.sendMessage(tab.id, message).catch(() => { });
    }
  } catch (e) {
    console.error("[Broadcast error]", e);
  }
}
