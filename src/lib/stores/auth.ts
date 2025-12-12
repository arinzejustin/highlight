// src/lib/stores/authStore.ts
import { writable } from "svelte/store";
import {
  getChromeStorage,
  setChromeStorage,
  removeChromeStorage,
  chromeBroadcast,
  Notification,
} from "$lib/utils/chromeWrap";
import { getUserById } from "$lib/utils/api";
import type { User, LogoutReason, AuthState } from "$lib/types";

const STORAGE_KEYS = {
  AUTH_TOKEN: "authToken",
  USER_ID: "userId",
  ONBOARDING: "hasCompletedOnboarding",
  USER: "user",
} as const;

const LOGOUT_REASONS: LogoutReason = {
  MANUAL: "You have been logged out successfully",
  INVALID_USER_DATA: "Session expired due to invalid user data",
  FETCH_USER_FAILED: "Unable to retrieve user information. Please log in again",
  INVALID_USER_STRUCTURE: "Authentication error. Please log in again",
};

const BROADCAST_EVENTS = {
  LOGGED_OUT: "USER_LOGGED_OUT",
} as const;


function isValidUser(user: unknown): user is User {
  return (
    user !== null &&
    typeof user === "object" &&
    !Array.isArray(user) &&
    typeof (user as User).userId === "string" &&
    (user as User).userId.length > 0
  );
}


function createInitialState(): AuthState {
  return {
    isAuthenticated: false,
    userId: null,
    authToken: null,
    hasCompletedOnboarding: false,
    user: null
  };
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(createInitialState());

  async function performLogout(
    reason: string = LOGOUT_REASONS.MANUAL,
    silent: boolean = false,
  ): Promise<void> {
    try {
      set(createInitialState());

      await removeChromeStorage([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.ONBOARDING,
        STORAGE_KEYS.USER,
      ]);

      await chromeBroadcast({
        type: BROADCAST_EVENTS.LOGGED_OUT,
        reason,
      });
      if (silent) return;
      Notification(reason);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }

  async function fetchAndValidateUser(
    userId: string,
    authToken: string,
  ): Promise<User | null> {
    try {
      const user = await getUserById(userId, authToken);

      if (!isValidUser(user)) {
        console.error("Invalid user data structure received from API");
        await performLogout(LOGOUT_REASONS.INVALID_USER_STRUCTURE);
        return null;
      }

      return user;
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      await performLogout(LOGOUT_REASONS.FETCH_USER_FAILED);
      return null;
    }
  }


  async function updateAuthState(
    authToken: string,
    userId: string,
    user: User,
    hasCompletedOnboarding: boolean = false,
  ): Promise<void> {
    const newState: AuthState = {
      isAuthenticated: true,
      authToken,
      userId,
      hasCompletedOnboarding,
      user,
    };

    set(newState);

    await setChromeStorage({
      [STORAGE_KEYS.AUTH_TOKEN]: authToken,
      [STORAGE_KEYS.USER_ID]: userId,
      [STORAGE_KEYS.USER]: user,
      [STORAGE_KEYS.ONBOARDING]: hasCompletedOnboarding,
    });
  }

  return {
    subscribe,


    async init(): Promise<void> {
      try {
        const data = await getChromeStorage<{
          authToken?: string;
          userId?: string;
          hasCompletedOnboarding?: boolean;
          user?: User;
        }>(Object.values(STORAGE_KEYS));

        if (!data.authToken || !data.userId) {
          set(createInitialState());
          return;
        }

        if (data.user && isValidUser(data.user)) {
          set({
            isAuthenticated: true,
            authToken: data.authToken,
            userId: data.userId,
            hasCompletedOnboarding: data.hasCompletedOnboarding ?? false,
            user: data.user,
          });
          return;
        }

        const user = await fetchAndValidateUser(data.userId, data.authToken);

        if (user) {
          await updateAuthState(
            data.authToken,
            data.userId,
            user,
            data.hasCompletedOnboarding ?? false,
          );
        }
      } catch (error) {
        console.error("Failed to initialize auth store:", error);
        set(createInitialState());
      }
    },

    async login(result: { token: string; userId: string; user: User } | null): Promise<boolean> {
      try {

        if (!result?.token || !result?.userId) {
          console.error("Invalid login response: missing token or userId");
          return false;
        }

        const userData = result.user ?? null;

        if (userData && !isValidUser(userData)) {
          console.error("Invalid user data in login response");
          return false;
        }

        const newState: AuthState = {
          isAuthenticated: true,
          authToken: result.token,
          userId: result.userId,
          hasCompletedOnboarding: false,
          user: userData,
        };

        set(newState);

        await setChromeStorage({
          [STORAGE_KEYS.AUTH_TOKEN]: result.token,
          [STORAGE_KEYS.USER_ID]: result.userId,
          [STORAGE_KEYS.USER]: userData,
          [STORAGE_KEYS.ONBOARDING]: false,
        });

        return true;
      } catch (error) {
        console.error("Login failed:", error);
        return false;
      }
    },

    /**
     * Logs out the current user
     */
    async logout(silent: boolean = false): Promise<void> {
      await performLogout(LOGOUT_REASONS.MANUAL, silent);
    },

    /**
     * Marks onboarding as completed
     */
    async completeOnboarding(): Promise<void> {
      let wasUpdated = false;

      update((state) => {
        if (!state.hasCompletedOnboarding) {
          wasUpdated = true;
          return { ...state, hasCompletedOnboarding: true };
        }
        return state;
      });

      if (wasUpdated) {
        await setChromeStorage({
          [STORAGE_KEYS.ONBOARDING]: true,
        });
      }
    },

    setUser(user: User): void {
      if (!isValidUser(user)) {
        console.error("Invalid user data provided to setUser");
        performLogout(LOGOUT_REASONS.INVALID_USER_DATA);
        return;
      }

      update((state) => ({ ...state, user }));
      setChromeStorage({ [STORAGE_KEYS.USER]: user });
    },
  };
}

export const authStore = createAuthStore();

authStore.init().catch((error) => {
  console.error("Critical: Failed to initialize auth store:", error);
});
