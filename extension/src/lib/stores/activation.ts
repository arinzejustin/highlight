import { writable } from "svelte/store";
import {
  getChromeStorage,
  setChromeStorage,
  chromeBroadcast,
  Notification,
} from "$lib/utils/chromeWrap";
import type { User, ActivationState } from '$lib/types'

interface StorageData {
  user?: Partial<User>;
}

const BROADCAST_EVENTS = {
  ACTIVATED: "EXTENSION_ACTIVATED",
  DEACTIVATED: "EXTENSION_DEACTIVATED",
};

const NOTIFICATION_MESSAGES = {
  ACTIVATED: "Extension activated",
  DEACTIVATED: "Extension deactivated",
};

function createActivationStore() {
  const { subscribe, set } = writable<ActivationState>({ isActivated: false });
  let current = false;

  subscribe((state) => (current = state.isActivated));

  async function init() {
    try {
      const data = await getChromeStorage<StorageData>(["user"]);

      const isFirstRun =
        !data.user || typeof data.user.extensionMode !== "boolean";

      if (isFirstRun) {
        const user: Partial<User> = {
          ...(data.user || {}),
          extensionMode: true,
        };

        await setChromeStorage({ user });
        set({ isActivated: true });

        await chromeBroadcast({
          type: BROADCAST_EVENTS.ACTIVATED,
          isActivated: true,
        });

        Notification(NOTIFICATION_MESSAGES.ACTIVATED);
        return;
      }

      set({ isActivated: data.user?.extensionMode! });
    } catch (error) {
      console.error("[Highlight Extension] Init failed:", error);
      set({ isActivated: false });
    }
  }

  async function setActivation(isActivated: boolean) {
    if (current === isActivated) return;

    try {
      const stored = await getChromeStorage<StorageData>(["user"]);
      const updatedUser = { ...(stored.user || {}), extensionMode: isActivated };

      await setChromeStorage({ user: updatedUser });
      set({ isActivated });

      await chromeBroadcast({
        type: isActivated ? BROADCAST_EVENTS.ACTIVATED : BROADCAST_EVENTS.DEACTIVATED,
        isActivated,
      });

      Notification(
        isActivated ? NOTIFICATION_MESSAGES.ACTIVATED : NOTIFICATION_MESSAGES.DEACTIVATED
      );
    } catch (error) {
      console.error("[Highlight Extension] Failed to update state:", error);
      throw error;
    }
  }

  const activate = () => setActivation(true);
  const deactivate = () => setActivation(false);
  const toggle = () => setActivation(!current);

  return { subscribe, init, activate, deactivate, toggle };
}

export const activationStore = createActivationStore();

activationStore.init().catch((e) => {
  console.error("[Highlight Extension] Critical init failure:", e);
});
