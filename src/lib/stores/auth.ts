// src/lib/stores/authStore.ts
import { writable } from "svelte/store";
import {
  getChromeStorage,
  setChromeStorage,
  removeChromeStorage,
} from "$lib/utils/chromeWrap";
import { loginUser } from "$lib/utils/api";

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  authToken: string | null;
  hasCompletedOnboarding: boolean;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    isAuthenticated: false,
    userId: null,
    authToken: null,
    hasCompletedOnboarding: false,
  });

  return {
    subscribe,

    // Initialize from storage
    async init() {
      const data = await getChromeStorage<{
        authToken?: string;
        userId?: string;
        hasCompletedOnboarding?: boolean;
      }>(["authToken", "userId", "hasCompletedOnboarding"]);

      if (data.authToken && data.userId) {
        set({
          isAuthenticated: true,
          authToken: data.authToken,
          userId: data.userId,
          hasCompletedOnboarding: data.hasCompletedOnboarding ?? false,
        });
      }
    },

    async login(email: string, password: string): Promise<boolean> {
      const result = await loginUser(email, password);

      if (result?.token && result?.userId) {
        const newState: AuthState = {
          isAuthenticated: true,
          authToken: result.token,
          userId: result.userId,
          hasCompletedOnboarding: false, // or load from storage if needed
        };

        set(newState);

        await setChromeStorage({
          authToken: result.token,
          userId: result.userId,
        });

        return true;
      }
      return false;
    },

    async logout() {
      set({
        isAuthenticated: false,
        userId: null,
        authToken: null,
        hasCompletedOnboarding: false,
      });

      await removeChromeStorage(["authToken", "userId", "hasCompletedOnboarding"]);
    },

    async completeOnboarding() {
      update((state) => ({
        ...state,
        hasCompletedOnboarding: true,
      }));
      await setChromeStorage({ hasCompletedOnboarding: true });
    },
  };
}

export const authStore = createAuthStore();

// Auto-init on load (safe in background/popup)
authStore.init();