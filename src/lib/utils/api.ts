import type { SavedWord } from "$lib/types";

const API_BASE_URL = "https://api.yourapp.com";

export async function fetchMeaning(word: string): Promise<string> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/meaning?word=${encodeURIComponent(word)}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch meaning");
    }

    const data = await response.json();
    return data.meaning || "No meaning found";
  } catch (error) {
    console.error("Error fetching meaning:", error);
    return `A ${word} is a term that requires further definition.`;
  }
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ token: string; userId: string } | null> {
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
    const response = await fetch(`${API_BASE_URL}/words/sync`, {
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
    const response = await fetch(`${API_BASE_URL}/words`, {
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
