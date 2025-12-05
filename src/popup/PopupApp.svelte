<script lang="ts">
    import { onMount } from "svelte";
    import { EllipsisVertical, LockKeyhole } from "@lucide/svelte";
    import { authStore } from "$lib/stores/auth";
    import { wordsStore } from "$lib/stores/words";
    import LoginView from "./views/LoginView.svelte";
    import OnboardingView from "./views/OnboardingView.svelte";
    import SyncingView from "./views/SyncingView.svelte";
    import Theme from "$lib/components/Theme.svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";

    let currentView: "login" | "onboarding" | "syncing" | "dashboard" =
        $state("login");
    let isLoading = $state(false);
    let showAccount = $state(false);

    onMount(async () => {
        await authStore.init();
        await wordsStore.loadWords();

        if ($authStore.isAuthenticated) {
            if ($authStore.hasCompletedOnboarding) {
                currentView = "syncing";
            } else {
                currentView = "onboarding";
            }
        } else {
            currentView = "login";
        }

        isLoading = false;
    });

    function handleLoginSuccess() {
        currentView = "onboarding";
    }

    function handleOnboardingComplete() {
        authStore.completeOnboarding();
        currentView = "syncing";
    }

    function handleOpenOptions() {
        chrome.runtime.openOptionsPage();
    }
</script>

<div class="w-full h-full bg-background text-foreground">
    <div
        class="grid grid-cols-5 justify-between align-middle items-center py-4 px-1"
    >
        <div class="col-span-4 bg-card h-24 shadow-lg curve"></div>
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                {#snippet child({ props })}
                    <EllipsisVertical {...props} class="size-5" />
                {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="w-48 text-sm" align="start">
                <DropdownMenu.Item onclick={() => console.log("hello")}>
                    <span>What's new</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                    class="cursor-pointer"
                    onclick={() => {
                        currentView = "dashboard";
                        showAccount = true;
                    }}
                >
                    <span>Account</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item>
                    <a href="https://highlight." target="_blank">Support</a>
                </DropdownMenu.Item>
                <DropdownMenu.Item>
                    <span>Allow list</span>
                    <DropdownMenu.Shortcut class="text-amber-600">
                        <LockKeyhole class="size-3 text-amber-600" />
                    </DropdownMenu.Shortcut>
                </DropdownMenu.Item>
                <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger
                        >Share extension</DropdownMenu.SubTrigger
                    >
                    <DropdownMenu.SubContent>
                        <DropdownMenu.Item>Share on Facebook</DropdownMenu.Item>
                        <DropdownMenu.Item
                            >Share on X (Twitter)</DropdownMenu.Item
                        >
                        <DropdownMenu.Item>Share on Linkedin</DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item>Copy link</DropdownMenu.Item>
                    </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
                <DropdownMenu.Separator />
                <DropdownMenu.Item>Log out</DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </div>
    {#if isLoading}
        <div class="flex items-center justify-center h-full">
            <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
            ></div>
        </div>
    {:else if currentView === "login"}
        <LoginView onLoginSuccess={handleLoginSuccess} />
    {:else if currentView === "onboarding"}
        <OnboardingView onComplete={handleOnboardingComplete} />
    {:else if currentView === "syncing"}
        <SyncingView onOpenOptions={handleOpenOptions} />
    {:else if currentView === "dashboard"}
        <!-- <DashboardView /> -->
    {/if}
    <div class="flex flex-row justify-between mt-4 mb-1 items-center">
        <div
            class="flex flex-row justify-between align-middle items-center w-3/4"
        ></div>
        <div
            class="flex flex-row justify-between align-middle items-center w-1/4"
        ></div>
    </div>
</div>

<style>
    .curve {
        clip-path: path("M0,0 H100% V60 Q50% 100% 0 60 Z");
        border-bottom-right-radius: 1rem;
    }
</style>
