<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { addWord } from "$lib/utils/wordDB";
  import { fetchMeaning } from "$lib/utils/api";
  import { authStore } from "$lib/stores/auth";
  import { recordsStore } from "$lib/stores/records";
  import { retriveId } from "$lib/utils/Device";
  import { Loader, Bookmark, Volume2, ChevronDown, X } from "@lucide/svelte";

  interface Props {
    word: string;
    x: number;
    y: number;
    onClose: () => void;
  }

  let { word, x, y, onClose }: Props = $props();

  let meaning = $state<string | null>(null);
  let phonetics = $state<string | null>(null);
  let audioUrl = $state<string | null>(null);
  let examples = $state<string[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let isSaving = $state(false);
  let saved = $state(false);
  let showExamples = $state(false);

  const authToken = $derived($authStore.authToken);

  let isMounted = true;
  let closeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  onMount(async () => {
    try {
      const deviceId = await retriveId();
      const result = await fetchMeaning(word, authToken, deviceId);

      if (!isMounted) return;

      if (typeof result === "string") {
        error = result;
        return;
      }

      if (result.error) {
        recordsStore.incrementFailure();
        error =
          result.errorType === "not_found"
            ? "Meaning not found"
            : result.errorType === "exceed_limit"
              ? "Usage limit exceeded"
              : "Failed to fetch meaning";
      } else {
        meaning = result.meaning;
        phonetics = result.phonetics || null;
        audioUrl = result.audioUrl || null;
        examples = result.examples || [];
        recordsStore.incrementSuccess();
      }
    } catch {
      if (isMounted) error = "Failed to fetch meaning";
    } finally {
      if (isMounted) isLoading = false;
    }
  });

  onDestroy(() => {
    isMounted = false;
    if (closeTimeoutId) clearTimeout(closeTimeoutId);
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
      closeTimeoutId = setTimeout(onClose, 1200);
    } catch {
      error = "Failed to save word";
    } finally {
      isSaving = false;
    }
  }

  function playAudio() {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  }
</script>

<div class="overlay-popup" style="left:{x}px; top:{y}px">
  <div class="overlay-content">
    <button class="overlay-close" onclick={onClose} aria-label="Close">
      <X />
    </button>

    <div class="overlay-header">
      <div class="overlay-word-section">
        <div class="overlay-word">{word}</div>
        {#if phonetics && !error && !isLoading}
          <div class="overlay-phonetics">{phonetics}</div>
        {/if}
      </div>
    </div>

    {#if isLoading}
      <div class="overlay-loading">
        <Loader class="spinner" />
        <span>Loading…</span>
      </div>
    {:else if error}
      <div class="overlay-error">{error}</div>
    {:else}
      <div class="overlay-meaning">{meaning}</div>

      {#if examples.length > 0}
        <button
          class="overlay-examples-toggle"
          onclick={() => (showExamples = !showExamples)}
        >
          <span>Examples</span>
          <ChevronDown class="chevron {showExamples ? 'expanded' : ''}" />
        </button>

        {#if showExamples}
          <div class="overlay-examples">
            {#each examples as example}
              <div class="overlay-example">• {example}</div>
            {/each}
          </div>
        {/if}
      {/if}

      <div class="overlay-actions">
        {#if audioUrl}
          <button
            class="overlay-action-btn audio-btn"
            onclick={playAudio}
            aria-label="Play audio"
          >
            <Volume2 />
          </button>
        {:else}
          <div></div>
        {/if}

        <button
          class="overlay-action-btn bookmark-btn"
          class:saved
          disabled={saved || isSaving}
          onclick={handleSave}
          aria-label={saved ? "Saved" : "Save word"}
        >
          {#if isSaving}
            <Loader class="spinner" />
          {:else}
            <Bookmark class={saved ? "filled" : ""} />
          {/if}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  :root {
    --highlight-extension-radius: 12px;
    --highlight-extension-card: oklch(1 0 0 / 79%);
    --highlight-extension-border: oklch(0.922 0 0);
    --highlight-extension-hover: oklch(0.97 0 0);
    --highlight-extension-foreground: oklch(0.145 0 0);
    --highlight-extension-muted: oklch(0.97 0 0);
    --highlight-extension-primary: oklch(0.205 0 0);
    --highlight-extension-success: #10b981;
    --highlight-extension-error: oklch(0.577 0.245 27.325);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --highlight-extension-card: oklch(0.205 0 0 / 79%);
      --highlight-extension-border: oklch(1 0 0 / 10%);
      --highlight-extension-hover: oklch(0.269 0 0);
      --highlight-extension-foreground: oklch(0.985 0 0);
      --highlight-extension-muted: oklch(0.269 0 0);
      --highlight-extension-primary: oklch(0.922 0 0);
      --highlight-extension-success: #34d399;
      --highlight-extension-error: oklch(0.704 0.191 22.216);
    }
  }

  @keyframes fadeInBackdrop {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .overlay-popup {
    position: fixed;
    transform: translate(-50%, calc(-100% - 16px));
    pointer-events: auto;
    z-index: 9999;
    animation: slideIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translate(-50%, calc(-100% - 32px)) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translate(-50%, calc(-100% - 16px)) scale(1);
    }
  }

  .overlay-content {
    background: var(--highlight-extension-card);
    border-radius: var(--highlight-extension-radius);
    padding: 20px;
    min-width: 320px;
    max-width: 400px;
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
    position: relative;
    border: 1px solid var(--highlight-extension-border);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  .overlay-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: calc(999 * 1px);
    padding: 6px;
    color: var(--highlight-extension-primary);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--highlight-extension-border);
  }

  .overlay-close:hover {
    background: var(--highlight-extension-hover);
    color: var(--highlight-extension-foreground);
  }

  .overlay-header {
    margin-bottom: 16px;
    padding-right: 32px;
  }

  .overlay-word-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-transform: capitalize;
  }

  .overlay-word {
    font-size: 20px;
    font-weight: 600;
    color: var(--highlight-extension-foreground);
    line-height: 1.2;
  }

  .overlay-phonetics {
    font-size: 14px;
    color: var(--highlight-extension-muted);
    font-style: italic;
  }

  .overlay-loading {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: var(--highlight-extension-muted);
    padding: 12px 0;
  }

  .spinner {
    width: 16px;
    height: 16px;
    color: var(--highlight-extension-foreground);
    animation: spin 1.5s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .overlay-error {
    color: var(--highlight-extension-error);
    font-size: 14px;
    padding: 12px 0;
  }

  .overlay-meaning {
    font-size: 15px;
    line-height: 1.6;
    color: var(--highlight-extension-foreground);
    margin-bottom: 16px;
  }

  .overlay-examples-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 12px;
    background: var(--highlight-extension-hover);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: var(--highlight-extension-foreground);
    margin-bottom: 8px;
    transition: background 0.2s ease;
  }

  .overlay-examples-toggle:hover {
    background: var(--highlight-extension-border);
  }

  .chevron {
    width: 16px;
    height: 16px;
    color: var(--highlight-extension-foreground);
    transition: transform 0.2s ease;
  }

  .chevron.expanded {
    transform: rotate(180deg);
  }

  .overlay-examples {
    margin-bottom: 16px;
    padding: 12px;
    background: var(--highlight-extension-hover);
    border-radius: 6px;
    animation: expandIn 0.2s ease-out;
  }

  @keyframes expandIn {
    from {
      opacity: 0;
      max-height: 0;
    }
    to {
      opacity: 1;
      max-height: 500px;
    }
  }

  .overlay-example {
    font-size: 14px;
    line-height: 1.5;
    color: var(--highlight-extension-primary);
    padding: 4px 0;
  }

  .overlay-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 8px;
    border-top: 1px solid var(--highlight-extension-border);
  }

  .overlay-action-btn {
    padding: 10px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    background: transparent;
    color: var(--highlight-extension-muted);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .overlay-action-btn:hover:not(:disabled) {
    background: var(--highlight-extension-hover);
    color: var(--highlight-extension-foreground);
  }

  .audio-btn:hover:not(:disabled) {
    color: var(--highlight-extension-primary);
  }

  .bookmark-btn:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .bookmark-btn.saved {
    color: var(--highlight-extension-success);
  }

  .bookmark-btn.saved:hover {
    color: var(--highlight-extension-success);
  }

  .filled {
    fill: currentColor;
  }
</style>
