<script lang="ts">
  import { onMount } from "svelte";
  import { addWord } from "$lib/utils/idb";
  import { fetchMeaning } from "$lib/utils/api";
  import { authStore } from "$lib/stores/auth";
  import { retriveId } from "$lib/utils/Device";
  import { Loader, Save, X } from "@lucide/svelte";

  interface Props {
    word: string;
    x: number;
    y: number;
    onClose: () => void;
  }

  let { word, x, y, onClose }: Props = $props();

  let meaning = $state<string | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let isSaving = $state(false);
  let saved = $state(false);
  let deviceId = $state(undefined) as string | undefined;

  let authToken = $derived($authStore.authToken);

  let alive = true;
  let closeTimeout: number | null = null;

  onMount(() => {
    (async () => {
      deviceId = await retriveId();
      try {
        const result = await fetchMeaning(word, authToken, deviceId);
        if (!alive) return;
        meaning = result;
      } catch {
        if (!alive) return;
        error = "Failed to fetch meaning";
      } finally {
        if (alive) isLoading = false;
      }
    })();

    return () => {
      alive = false;
      if (closeTimeout) clearTimeout(closeTimeout);
    };
  });

  async function handleSave() {
    if (!meaning || isSaving || saved) return;

    isSaving = true;
    try {
      await addWord({
        word,
        meaning,
        url: window.location.href,
        createdAt: Date.now(),
        synced: false,
      });
      saved = true;
      closeTimeout = window.setTimeout(onClose, 1200);
    } catch {
      error = "Failed to save word";
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="overlay-popup" style="left:{x}px; top:{y}px">
  <div class="overlay-content">
    <button class="overlay-close" onclick={onClose}>
      <X class="w-3 h-3" />
    </button>

    <div class="overlay-word">{word}</div>

    {#if isLoading}
      <div class="overlay-row">
        <Loader class="w-4 h-4 animate-spin" />
        <span>Loading…</span>
      </div>
    {:else if error}
      <div class="overlay-error">{error}</div>
    {:else}
      <div class="overlay-meaning">{meaning}</div>

      <button
        class="overlay-save-btn"
        class:saved
        disabled={saved || isSaving}
        onclick={handleSave}
      >
        {#if saved}
          ✓ Saved
        {:else if isSaving}
          <Loader class="w-4 h-4 animate-spin" />
          Saving…
        {:else}
          <Save class="w-4 h-4" />
          Save
        {/if}
      </button>
    {/if}
  </div>
</div>

<style>
  .overlay-popup {
    position: fixed;
    transform: translate(-50%, -100%);
    pointer-events: auto;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translate(-50%, -105%) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -100%) scale(1);
    }
  }

  .overlay-content {
    background: white;
    border-radius: 8px;
    padding: 12px;
    min-width: 260px;
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.15);
    position: relative;
  }

  .overlay-close {
    position: absolute;
    top: 6px;
    right: 6px;
    background: none;
    border: none;
    cursor: pointer;
  }

  .overlay-word {
    font-weight: 600;
    margin-bottom: 8px;
    color: #2563eb;
  }

  .overlay-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }

  .overlay-error {
    color: #dc2626;
    font-size: 14px;
  }

  .overlay-meaning {
    font-size: 14px;
    margin-bottom: 10px;
  }

  .overlay-save-btn {
    width: 100%;
    padding: 8px;
    border-radius: 6px;
    background: #2563eb;
    color: white;
    border: none;
    cursor: pointer;
  }

  .overlay-save-btn.saved {
    background: #10b981;
  }

  .overlay-save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (prefers-color-scheme: dark) {
    .overlay-content {
      background: #1f2937;
      color: #f9fafb;
    }
  }
</style>
