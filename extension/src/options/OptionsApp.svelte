<script lang="ts">
    import { onMount } from "svelte";
    import { wordsStore } from "$lib/stores/words";
    import { authStore } from "$lib/stores/auth";
    import { deleteWord, getAllWords } from "$lib/utils/wordDB";
    import { Trash2, Download, RefreshCw, Search } from "@lucide/svelte";

    let searchQuery = $state("");
    let isDeleting = $state<string | null>(null);
    let isSyncing = $state(false);
    let isDarkMode = $state(false);

    onMount(async () => {
        await authStore.init();
        await wordsStore.loadWords();

        // Check initial dark mode preference
        isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

        document.body.classList.toggle("dark", isDarkMode);
    });

    const filteredWords = $derived(
        $wordsStore.filter(
            (word) =>
                word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
                word.meaning.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    );

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this word?")) return;

        isDeleting = id;
        try {
            await deleteWord(id);
            await wordsStore.loadWords();
        } catch (error) {
            console.error("Failed to delete word:", error);
            alert("Failed to delete word");
        } finally {
            isDeleting = null;
        }
    }

    async function handleSync() {
        isSyncing = true;
        try {
            await chrome.runtime.sendMessage({ type: "SYNC_WORDS" });
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await wordsStore.loadWords();
        } catch (error) {
            console.error("Sync failed:", error);
            alert("Sync failed");
        } finally {
            isSyncing = false;
        }
    }

    async function handleExport() {
        try {
            const words = await getAllWords();
            const dataStr = JSON.stringify(words, null, 2);
            const dataBlob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `word-saver-export-${Date.now()}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Export failed");
        }
    }

    function toggleDarkMode() {
        isDarkMode = !isDarkMode;
    }

    const unsyncedCount = $derived($wordsStore.filter((w) => !w.synced).length);
</script>

<div class="min-h-screen bg-background">
    <header class="border-b border-border bg-card sticky top-0 z-10">
        <div class="max-w-6xl mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold">Word Saver</h1>
                    <p class="text-sm text-muted-foreground mt-1">
                        {$wordsStore.length} words saved
                        {#if unsyncedCount > 0}
                            <span class="text-primary"
                                >• {unsyncedCount} unsynced</span
                            >
                        {/if}
                    </p>
                </div>
                <div class="flex gap-2">
                    <button
                        onclick={handleSync}
                        disabled={isSyncing}
                        class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                    >
                        <RefreshCw
                            class="w-4 h-4 {isSyncing ? 'animate-spin' : ''}"
                        />
                        {isSyncing ? "Syncing..." : "Sync"}
                    </button>
                    <button
                        onclick={handleExport}
                        class="px-4 py-2 border border-border rounded-md hover:bg-accent flex items-center gap-2"
                    >
                        <Download class="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            <div class="mt-4 relative">
                <Search
                    class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                />
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search words or meanings..."
                    class="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
            </div>
        </div>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-8">
        {#if filteredWords.length === 0}
            <div class="text-center py-16">
                <p class="text-muted-foreground">
                    {searchQuery
                        ? "No words found matching your search."
                        : "No words saved yet. Start highlighting words on any webpage!"}
                </p>
            </div>
        {:else}
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {#each filteredWords as word (word.id)}
                    <div
                        class="p-4 bg-card border border-border rounded-lg space-y-3 hover:shadow-md transition-shadow"
                    >
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <h3 class="font-semibold text-lg">
                                    {word.word}
                                </h3>
                                <p class="text-sm text-muted-foreground mt-1">
                                    {word.meaning}
                                </p>
                            </div>
                            <button
                                onclick={() => handleDelete(word.id)}
                                disabled={isDeleting === word.id}
                                class="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors disabled:opacity-50"
                                title="Delete word"
                            >
                                <Trash2 class="w-4 h-4" />
                            </button>
                        </div>
                        <div
                            class="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border"
                        >
                            <span>
                                {new Date(word.createdAt).toLocaleDateString()}
                            </span>
                            <span class="flex items-center gap-1">
                                {#if word.synced}
                                    <span
                                        class="w-2 h-2 bg-green-500 rounded-full"
                                    ></span>
                                    Synced
                                {:else}
                                    <span
                                        class="w-2 h-2 bg-yellow-500 rounded-full"
                                    ></span>
                                    Not synced
                                {/if}
                            </span>
                        </div>
                        {#if word.url}
                            <a
                                href={word.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-xs text-primary hover:underline block truncate"
                            >
                                {word.url}
                            </a>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </main>
</div>
