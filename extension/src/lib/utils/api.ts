import type { SavedWord, User, AuthData, DeviceInfo, WordResponse } from "$lib/types";

const API_BASE_URL = "http://localhost:3000";

export async function fetchMeaning(word: string, authToken: string | null, deviceId?: string): Promise<WordResponse | string> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/meaning`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
        ...(deviceId && { "Device-ID": deviceId }),

      },
      body: JSON.stringify({ word }),
    });

    if (!response.ok) {
      let message = "Failed to fetch meaning";
      try {
        const errorBody = await response.json();
        message = errorBody?.message ?? message;
      } catch { }

      return message;
    }

    const data: WordResponse = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching meaning:", error);
    if (error instanceof Error && error.message.includes("Failed to fetch")) {
      return `Network error while fetching meaning for ${word}.`;
    }

    return `A ${word} is a term that requires further definition.`;
  }
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ token: string; userId: string; user: User } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      token: data.token,
      userId: data.userId,
      user: data.user,
    };
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

export async function syncWords(
  words: SavedWord[],
  token: string,
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/words/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ words }),
    });

    if (!response.ok) {
      throw new Error("Sync failed");
    }

    return { success: true };
  } catch (error) {
    console.error("Sync error:", error);
    return { success: false };
  }
}

export async function fetchUserWords(token: string): Promise<SavedWord[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/words`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch words");
    }

    const data = await response.json();
    return data.words || [];
  } catch (error) {
    console.error("Error fetching words:", error);
    return [];
  }
}

export async function getUserById(userId: string, token: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user");
    }

    const data = await response.json();
    return data.user || null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export async function syncUser(
  authData: AuthData
): Promise<boolean> {
  try {
    if (!authData.userId) {
      return false;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/users/${authData.userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authData.authToken && { Authorization: `Bearer ${authData.authToken}` }),
          ...(authData.deviceId && { "Device-ID": authData.deviceId }),

        },
        body: JSON.stringify(authData.user),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return true;
  } catch (error) {
    return false;
  }
}

// export async function registerDevice(
//   userId: string,
//   deviceInfo: DeviceInfo,
//   token: string,
// ): Promise<boolean> {
//   try {
//     const response = await fetch(`${API_BASE_URL}/users/devices/${userId}`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//         "Device-ID": deviceInfo.deviceId,
//       },
//       body: JSON.stringify(deviceInfo),
//     });

//     if (!response.ok) {
//       throw new Error("Device registration failed");
//     }

//     return true;
//   } catch (error) {
//     console.error("Device registration error:", error);
//     return false;
//   }
// }

export async function InitDeviceId(deviceInfo: Omit<DeviceInfo, "deviceId">): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/devices/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deviceInfo),
    });

    if (!response.ok) {
      throw new Error("[Highlight Extension] Failed to initialize device ID");
    }

    const data: { deviceId: string } = await response.json();
    const deviceId = data.deviceId;

    if (typeof deviceId !== "string" || deviceId.length === 0) {
      throw new Error("Invalid deviceId received from server");
    }

    return deviceId;
  } catch (error) {
    console.error("[Highlight Extension] Error initializing device ID:", error);
    return "";
  }
}