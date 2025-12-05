<script lang="ts">
    import { onMount } from "svelte";
    import { wordsStore } from "$lib/stores/words";
    import { authStore } from "$lib/stores/auth";
    import { RefreshCw, Settings, LogOut, BookMarked } from "@lucide/svelte";

    interface Props {
        onOpenOptions: () => void;
    }

    let { onOpenOptions }: Props = $props();

    let isSyncing = $state(false);
    let lastSyncTime = $state<string | null>(null);

    onMount(() => {
        loadLastSyncTime();
    });

    async function loadLastSyncTime() {
        const result = await chrome.storage.local.get("lastSyncTime");
        if (result.lastSyncTime) {
            const date = new Date(result.lastSyncTime);
            lastSyncTime = date.toLocaleTimeString();
        }
    }

    async function handleSync() {
        isSyncing = true;

        try {
            await chrome.runtime.sendMessage({ type: "SYNC_WORDS" });
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await loadLastSyncTime();
        } catch (error) {
            console.error("Sync failed:", error);
        } finally {
            isSyncing = false;
        }
    }

    async function handleLogout() {
        await authStore.logout();
        window.location.reload();
    }

    const unsyncedCount = $derived($wordsStore.filter((w) => !w.synced).length);
    const totalCount = $derived($wordsStore.length);
</script>

<div class="flex flex-col h-full">
    <div class="border-b border-border p-4">
        <div class="flex items-center justify-between">
            <h1 class="text-lg font-semibold flex items-center gap-2">
                <BookMarked class="w-5 h-5 text-primary" />
                Word Saver
            </h1>
            <div class="flex gap-2">
                <button
                    onclick={onOpenOptions}
                    class="p-2 hover:bg-accent rounded-md transition-colors"
                    title="Settings"
                >
                    <Settings class="w-4 h-4" />
                </button>
                <button
                    onclick={handleLogout}
                    class="p-2 hover:bg-accent rounded-md transition-colors"
                    title="Logout"
                >
                    <LogOut class="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>

    <div class="flex-1 p-6 space-y-6">
        <div class="space-y-4">
            <div class="p-4 bg-card border border-border rounded-lg space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-muted-foreground"
                        >Total Words</span
                    >
                    <span class="text-2xl font-bold">{totalCount}</span>
                </div>
            </div>

            <div class="p-4 bg-card border border-border rounded-lg space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-sm text-muted-foreground">Unsynced</span>
                    <span class="text-2xl font-bold text-primary"
                        >{unsyncedCount}</span
                    >
                </div>
            </div>

            {#if lastSyncTime}
                <p class="text-xs text-center text-muted-foreground">
                    Last synced at {lastSyncTime}
                </p>
            {/if}
        </div>

        <button
            onclick={handleSync}
            disabled={isSyncing || unsyncedCount === 0}
            class="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
            <RefreshCw class="w-4 h-4 {isSyncing ? 'animate-spin' : ''}" />
            {isSyncing
                ? "Syncing..."
                : unsyncedCount > 0
                  ? `Sync ${unsyncedCount} Words`
                  : "All Synced"}
        </button>

        <button
            onclick={onOpenOptions}
            class="w-full px-4 py-2 border border-border rounded-md hover:bg-accent font-medium"
        >
            View All Words
        </button>
    </div>

    <div class="border-t border-border p-4">
        <p class="text-xs text-center text-muted-foreground">
            Highlight any word on a webpage to save it
        </p>
    </div>
</div>
