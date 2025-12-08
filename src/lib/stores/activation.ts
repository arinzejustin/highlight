import { writable, get } from "svelte/store";
import {
  getChromeStorage,
  setChromeStorage,
  chromeBroadcast,
  Notification,
} from "$lib/utils/chromeWrap";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface ActivationState {
  isActivated: boolean;
}

interface StorageData {
  isExtensionActivated?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "isExtensionActivated" as const;

const BROADCAST_EVENTS = {
  ACTIVATED: "EXTENSION_ACTIVATED",
  DEACTIVATED: "EXTENSION_DEACTIVATED",
} as const;

const NOTIFICATION_MESSAGES = {
  ACTIVATED: "Extension activated",
  DEACTIVATED: "Extension deactivated",
} as const;

const LOG_PREFIX = "[ActivationStore]" as const;

// ============================================================================
// Initial State
// ============================================================================

const createInitialState = (): ActivationState => ({
  isActivated: true,
});

// ============================================================================
// Store Factory
// ============================================================================

function createActivationStore() {
  const { subscribe, set, update } =
    writable<ActivationState>(createInitialState());

  /**
   * Initializes the store from Chrome storage
   */
  async function init(): Promise<void> {
    try {
      const data = await getChromeStorage<StorageData>([STORAGE_KEY]);
      const isActivated = data[STORAGE_KEY] ?? false;

      set({ isActivated });

      console.info(`${LOG_PREFIX} Initialized with state:`, { isActivated });
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to initialize from storage:`, error);
      set(createInitialState());
    }
  }

  /**
   * Updates activation state in store, storage, and broadcasts the change
   */
  async function updateActivationState(isActivated: boolean): Promise<void> {
    try {
      // Update store
      set({ isActivated });

      // Update storage
      await setChromeStorage({ [STORAGE_KEY]: isActivated });

      // Broadcast to all extension contexts
      const eventType = isActivated
        ? BROADCAST_EVENTS.ACTIVATED
        : BROADCAST_EVENTS.DEACTIVATED;

      await chromeBroadcast({
        type: eventType,
        isActivated,
      });

      // Show notification
      const message = isActivated
        ? NOTIFICATION_MESSAGES.ACTIVATED
        : NOTIFICATION_MESSAGES.DEACTIVATED;

      Notification(message);

      console.info(
        `${LOG_PREFIX} Extension ${isActivated ? "activated" : "deactivated"}`,
      );
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to update activation state:`, error);
      throw error;
    }
  }

  /**
   * Activates the extension
   */
  async function activate(): Promise<void> {
    const currentState = get({ subscribe });

    if (currentState.isActivated) {
      console.info(`${LOG_PREFIX} Already activated, skipping`);
      return;
    }

    await updateActivationState(true);
  }

  /**
   * Deactivates the extension
   */
  async function deactivate(): Promise<void> {
    const currentState = get({ subscribe });

    if (!currentState.isActivated) {
      console.info(`${LOG_PREFIX} Already deactivated, skipping`);
      return;
    }

    await updateActivationState(false);
  }

  /**
   * Toggles the activation state
   */
  async function toggle(): Promise<void> {
    const currentState = get({ subscribe });
    const newState = !currentState.isActivated;

    console.info(
      `${LOG_PREFIX} Toggling from ${currentState.isActivated} to ${newState}`,
    );

    await updateActivationState(newState);
  }

  return {
    subscribe,
    activate,
    deactivate,
    toggle,
    init,
  };
}

// ============================================================================
// Export
// ============================================================================

export const activationStore = createActivationStore();

// Initialize store on module load
activationStore.init().catch((error) => {
  console.error(`${LOG_PREFIX} Critical: Failed to initialize:`, error);
});
