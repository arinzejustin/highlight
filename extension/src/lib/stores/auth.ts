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
  USER: "user", // Contains the full profile + usage records
} as const;

const LOGOUT_REASONS = {
  MANUAL: "You have been logged out successfully",
  INVALID_USER_DATA: "Session expired due to invalid user data",
  FETCH_USER_FAILED: "Unable to retrieve user information. Please log in again",
  INVALID_USER_STRUCTURE: "Authentication error. Please log in again",
} as LogoutReason;

const BROADCAST_EVENTS = {
  LOGGED_OUT: "USER_LOGGED_OUT",
} as const;

function isValidUser(user: any): user is User {
  return (
    user &&
    typeof user === "object" &&
    typeof user.userId === "string" &&
    user.userId.length > 0 &&
    'records' in user
  );
}

function createInitialState(): AuthState {
  return {
    isAuthenticated: false,
    userId: null,
    authToken: null,
    hasCompletedOnboarding: false,
    user: null,
  };
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(createInitialState());

  async function performLogout(reason: string = LOGOUT_REASONS.MANUAL, silent: boolean = false) {
    try {
      const data = await getChromeStorage<{ user: User | null }>([STORAGE_KEYS.USER]);

      let preservedUser: Partial<User> | null = null;
      if (data.user) {
        preservedUser = {
          records: data.user.records,
          extensionMode: data.user.extensionMode,
          createdAt: data.user.createdAt,
        };
      }

      await removeChromeStorage([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.USER_ID]);
      await setChromeStorage({ [STORAGE_KEYS.USER]: preservedUser });

      update(state => ({
        ...createInitialState(),
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        user: preservedUser as User | null,
      }));

      await chromeBroadcast({ type: BROADCAST_EVENTS.LOGGED_OUT, reason });

      if (!silent) Notification(reason);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return {
    subscribe,

    async init() {
      try {
        const data = await getChromeStorage<{
          authToken?: string;
          userId?: string;
          hasCompletedOnboarding?: boolean;
          user?: User;
        }>(Object.values(STORAGE_KEYS));

        const hasOnboarded = data.hasCompletedOnboarding ?? false;

        if (!data.authToken || !data.userId) {
          set({ ...createInitialState(), hasCompletedOnboarding: hasOnboarded, user: data.user || null });
          return;
        }

        try {
          const freshUser = await getUserById(data.userId, data.authToken);
          if (isValidUser(freshUser)) {
            const newState = {
              isAuthenticated: true,
              authToken: data.authToken,
              userId: data.userId,
              hasCompletedOnboarding: hasOnboarded,
              user: freshUser,
            };
            set(newState);
            await setChromeStorage({ [STORAGE_KEYS.USER]: freshUser });
          } else {
            await performLogout(LOGOUT_REASONS.INVALID_USER_STRUCTURE, true);
          }
        } catch (apiError) {
          if (data.user) {
            set({
              isAuthenticated: true,
              authToken: data.authToken,
              userId: data.userId,
              hasCompletedOnboarding: hasOnboarded,
              user: data.user,
            });
          } else {
            await performLogout(LOGOUT_REASONS.FETCH_USER_FAILED);
          }
        }
      } catch (error) {
        console.error("AuthStore Init Error:", error);
        set(createInitialState());
      }
    },

    async login(token: string, userId: string, user: User) {
      if (!token || !userId || !isValidUser(user)) return false;

      const newState: AuthState = {
        isAuthenticated: true,
        authToken: token,
        userId,
        hasCompletedOnboarding: false,
        user,
      };

      set(newState);
      await setChromeStorage({
        [STORAGE_KEYS.AUTH_TOKEN]: token,
        [STORAGE_KEYS.USER_ID]: userId,
        [STORAGE_KEYS.USER]: user,
        [STORAGE_KEYS.ONBOARDING]: true,
      });
      return true;
    },

    async logout(silent = false) {
      await performLogout(LOGOUT_REASONS.MANUAL, silent);
    },

    async completeOnboarding() {
      update(s => ({ ...s, hasCompletedOnboarding: true }));
      await setChromeStorage({ [STORAGE_KEYS.ONBOARDING]: true });
    },

    async updateUser(partialUser: Partial<User>) {
      update(state => {
        const newUser = state.user ? { ...state.user, ...partialUser } : null;
        if (newUser) setChromeStorage({ [STORAGE_KEYS.USER]: newUser });
        return { ...state, user: newUser as User };
      });
    }
  };
}

export const authStore = createAuthStore();
authStore.init().catch(console.error);