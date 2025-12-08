<script lang="ts">
    import { onMount } from "svelte";
    import {
        EllipsisVertical,
        LockKeyhole,
        UserStar,
        MessageCircleQuestionMark,
        RefreshCcw,
        LogIn,
        LogOut,
        ChevronLeft,
    } from "@lucide/svelte";
    import { authStore } from "$lib/stores/auth";
    import { wordsStore } from "$lib/stores/words";
    import LoginView from "./views/LoginView.svelte";
    import OnboardingView from "./views/OnboardingView.svelte";
    import SyncingView from "./views/SyncingView.svelte";
    import DashBoardView from "./views/DashBoardView.svelte";
    import Theme from "$lib/components/Theme.svelte";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";

    let currentView: "login" | "onboarding" | "syncing" | "dashboard" =
        $state("dashboard");
    let isLoading = $state(false);
    let showAccount = $state(false);
    let loggedIn = $derived($authStore.isAuthenticated);
    let user = $derived($authStore.user);

    const triggerSync = () => {
        currentView = loggedIn ? "syncing" : "login";
    };

    onMount(async () => {
        await authStore.init();
        await wordsStore.loadWords();

        // if ($authStore.isAuthenticated) {
        //     if ($authStore.hasCompletedOnboarding) {
        //         currentView = "syncing";
        //     } else {
        //         currentView = "onboarding";
        //     }
        // } else {
        //     currentView = "login";
        // }

        isLoading = false;
    });

    function handleLoginSuccess() {
        currentView = "onboarding";
    }

    function handleOnboardingComplete() {
        authStore.completeOnboarding();
        currentView = "dashboard";
    }

    function handleOpenOptions() {
        chrome.runtime.openOptionsPage();
    }
</script>

<div class="w-full h-full bg-background text-foreground px-1">
    {#if showAccount}
        <div class="flex justify-between align-middle items-center py-4">
            <button class="icons" onclick={() => (showAccount = false)}>
                <ChevronLeft class="size-5" />
            </button>
            <div></div>
        </div>
    {:else}
        <div class="flex items-center justify-between py-4 px-1 gap-x-5">
            <div class="bg-card h-24 shadow-lg curve flex-1"></div>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    {#snippet child({ props })}
                        <button
                            class="icons flex items-center"
                            aria-label="Menu"
                        >
                            <EllipsisVertical {...props} class="size-6" />
                        </button>
                    {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content
                    class="w-48 text-sm font-extension"
                    align="start"
                >
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
                            <DropdownMenu.Item
                                >Share on Facebook</DropdownMenu.Item
                            >
                            <DropdownMenu.Item
                                >Share on X (Twitter)</DropdownMenu.Item
                            >
                            <DropdownMenu.Item
                                >Share on Linkedin</DropdownMenu.Item
                            >
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item>Copy link</DropdownMenu.Item>
                        </DropdownMenu.SubContent>
                    </DropdownMenu.Sub>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item>Log out</DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </div>
    {/if}
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
        <DashBoardView
            {showAccount}
            {loggedIn}
            {user}
            onSignIn={() => {
                currentView = "login";
            }}
        />
    {/if}
    <div class="flex flex-row justify-between items-center mt-4 mb-1 w-full">
        <div class="flex flex-row gap-6 gap-x-3 items-center">
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Theme />
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <p>Change Theme</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>

            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <button
                            onclick={() => {
                                currentView = "dashboard";
                                showAccount = true;
                            }}
                            class="icons"
                        >
                            <UserStar class="size-4" />
                        </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <p>View Account</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>

            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <button onclick={() => triggerSync()} class="icons">
                            <RefreshCcw class="size-4" />
                        </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <p>Synchronize Words</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>

            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <button class="icons">
                            <MessageCircleQuestionMark class="size-4" />
                        </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <p>Get Help</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>
        <div>
            {#if loggedIn}
                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <button
                                onclick={() => authStore.logout()}
                                class="icons"
                            >
                                <LogOut class="size-4 text-destructive" />
                            </button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p>Log Out</p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
            {:else}
                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <button
                                onclick={() => (currentView = "login")}
                                class="icons"
                            >
                                <LogIn class="size-4 text-teal-500" />
                            </button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p>Log In</p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
            {/if}
        </div>
    </div>
</div>

<style>
    .curve {
        clip-path: path("M0,0 H100% V60 Q50% 100% 0 60 Z");
        border-bottom-right-radius: 1rem;
    }
</style>
