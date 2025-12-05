<script lang="ts">
  import { onMount } from 'svelte';
  import { addWord } from '$lib/utils/idb';
  import { fetchMeaning } from '$lib/utils/api';
  import { Loader, Save, X } from '@lucide/svelte';

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

  onMount(async () => {
    try {
      const result = await fetchMeaning(word);
      meaning = result;
      isLoading = false;
    } catch (err) {
      error = 'Failed to fetch meaning';
      isLoading = false;
    }
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
        synced: false
      });
      saved = true;
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to save word:', err);
      alert('Failed to save word');
    } finally {
      isSaving = false;
    }
  }
</script>

<div
  class="overlay-popup"
  style="left: {x}px; top: {y}px; transform: translateX(-50%) translateY(-100%);"
>
  <div class="overlay-content">
    <button onclick={onClose} class="overlay-close">
      <X class="w-3 h-3" />
    </button>

    <div class="overlay-word">{word}</div>

    {#if isLoading}
      <div class="overlay-loading">
        <Loader class="w-4 h-4 animate-spin" />
        <span>Loading...</span>
      </div>
    {:else if error}
      <div class="overlay-error">{error}</div>
    {:else if meaning}
      <div class="overlay-meaning">{meaning}</div>

      <button
        onclick={handleSave}
        disabled={isSaving || saved}
        class="overlay-save-btn"
        class:saved
      >
        {#if saved}
          <span>✓ Saved</span>
        {:else if isSaving}
          <Loader class="w-4 h-4 animate-spin" />
          <span>Saving...</span>
        {:else}
          <Save class="w-4 h-4" />
          <span>Save</span>
        {/if}
      </button>
    {/if}
  </div>
</div>

<style>
  .overlay-popup {
    position: absolute;
    pointer-events: auto;
    z-index: 2147483647;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-100%) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(-100%) scale(1);
    }
  }

  .overlay-content {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    min-width: 250px;
    max-width: 350px;
    position: relative;
  }

  @media (prefers-color-scheme: dark) {
    .overlay-content {
      background: #1f2937;
      border-color: #374151;
      color: #f9fafb;
    }
  }

  .overlay-close {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
  }

  .overlay-close:hover {
    background: #f3f4f6;
    color: #111827;
  }

  @media (prefers-color-scheme: dark) {
    .overlay-close:hover {
      background: #374151;
      color: #f9fafb;
    }
  }

  .overlay-word {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
    color: #2563eb;
  }

  @media (prefers-color-scheme: dark) {
    .overlay-word {
      color: #60a5fa;
    }
  }

  .overlay-loading,
  .overlay-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    font-size: 14px;
    color: #6b7280;
  }

  .overlay-error {
    color: #dc2626;
  }

  .overlay-meaning {
    font-size: 14px;
    line-height: 1.5;
    color: #374151;
    margin-bottom: 12px;
  }

  @media (prefers-color-scheme: dark) {
    .overlay-meaning {
      color: #d1d5db;
    }
  }

  .overlay-save-btn {
    width: 100%;
    padding: 8px 12px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: background 0.2s;
  }

  .overlay-save-btn:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .overlay-save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .overlay-save-btn.saved {
    background: #10b981;
  }
</style>
