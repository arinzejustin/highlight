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
    import { Toaster } from "$lib/components/ui/sonner/index.js";
    import { toast } from "svelte-sonner";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";

    let currentView:
        | "login"
        | "onboarding"
        | "syncing"
        | "dashboard" = $state("onboarding");
    let isLoading = $state(false);
    let showAccount = $state(false);
    let allowList = $state(false);
    let themeToast = $state<"light" | "dark" | "system">("system");

    let loggedIn = $derived($authStore.isAuthenticated);
    let user = $derived($authStore.user);
    let unsyncedCount = $derived($wordsStore.filter((w) => !w.synced).length);

    const triggerSync = () => {
        currentView = loggedIn ? "syncing" : "login"; //983
    };

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(
                "https://highlight.io/download?src=ext&utm_source=BEXshare&utm_medium=freeform",
            );
            toast.success("Link Copied!");
        } catch (e) {
            console.error("Clipboard permission denied", e);
            toast.error("Failed to copy link.");
            return;
        }
    }

    onMount(async () => {
        await authStore.init();
        await wordsStore.loadWords();

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
    {#if showAccount || allowList}
        <div class="flex justify-between align-middle items-center py-4">
            <button
                class="icons"
                onclick={() => {
                    showAccount = false;
                    allowList = false;
                    currentView = "dashboard";
                }}
            >
                <ChevronLeft class="size-5" />
            </button>
            <div></div>
        </div>
    {:else}
        <div class="flex items-center justify-between py-4 px-1 gap-x-5">
            <div class="h-24 flex-1"></div>
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
                    <DropdownMenu.Item
                        class="cursor-pointer"
                        onclick={() => (allowList = true)}
                    >
                        <span>Disallowed list</span>
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
                            <DropdownMenu.Item
                                onclick={() => {
                                    copyLink();
                                }}>Copy link</DropdownMenu.Item
                            >
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
            {allowList}
            onSignIn={() => {
                currentView = "login";
            }}
            openList={() => {
                allowList = true;
            }}
        />
    {/if}
    <div
        class="flex flex-row justify-between items-center mt-4 pt-4 mb-1 w-full"
    >
        <div class="flex flex-row gap-6 gap-x-3 items-center">
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Theme onChange={(theme) => (themeToast = theme)} />
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
                        <button
                            onclick={() => triggerSync()}
                            class="icons relative"
                        >
                            {#if unsyncedCount > 0}
                                <span
                                    class="absolute -top-2.5 -right-3.5 z-1000 rounded-full p-1 px-2 bg-destructive text-white text-xs"
                                    >{unsyncedCount}</span
                                >
                            {/if}
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
<Toaster theme={themeToast} richColors position="top-center" duration={5000} />
