<script lang="ts">
    import { onMount } from "svelte";
    import { ListFilterPlus, OctagonAlert, Info } from "@lucide/svelte";
    import { activationStore } from "$lib/stores/activation";
    import { recordsStore } from "$lib/stores/records";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import type { User } from "$lib/types";

    let {
        showAccount = false,
        user = null,
        loggedIn = false,
        allowList = false,
        onSignIn = () => {},
        openList = () => {},
    } = $props<{
        showAccount?: boolean;
        user?: User | null;
        allowList: boolean;
        loggedIn?: boolean;
        onSignIn?: () => void;
        openList?: () => void;
    }>();
    let hostname = $state(null) as string | null;
    let totalRequests = $derived($recordsStore.requestCount);
    let successfulRequests = $derived($recordsStore.successfulRequestCount);
    let failedRequests = $derived($recordsStore.failedRequestCount);

    let successRate = $derived((successfulRequests / totalRequests) * 100);
    let failureRate = $derived((failedRequests / totalRequests) * 100);

    let isActivated = $derived($activationStore.isActivated);

    const getNextResetDay = () => {
        if (!user?.createdAt) return "—";

        const created = new Date(user.createdAt);
        const now = new Date();

        const daysSinceCreation = Math.floor(
            (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
        );
        const currentCycle = Math.floor(daysSinceCreation / 21);
        const nextReset = new Date(created);
        nextReset.setDate(created.getDate() + (currentCycle + 1) * 21);

        const months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
        return `${months[nextReset.getMonth()]} ${nextReset.getDate()}, ${nextReset.getFullYear()}`;
    };

    const handleExtensionActivation = () => {
        activationStore.toggle();
    };

    onMount(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];

            if (!tab?.url) {
                hostname = null;
                return;
            }

            const url = tab.url;

            const internalProtocols = [
                "chrome://",
                "edge://",
                "brave://",
                "opera://",
                "about:",
                "chrome-extension://",
            ];
            if (internalProtocols.some((p) => url.startsWith(p))) {
                hostname = null;
                return;
            }

            let parsedHostname = "";
            try {
                parsedHostname = new URL(url).hostname;
            } catch {
                hostname = null;
                return;
            }

            const localHosts = ["localhost", "127.0.0.1", "0.0.0.0"];
            if (
                localHosts.includes(parsedHostname) ||
                parsedHostname.endsWith(".local")
            ) {
                hostname = null;
                return;
            }

            hostname = parsedHostname;
        });
    });
</script>

<div class="mx-auto w-[96%] font-extension">
    {#if showAccount}
        {#if user && loggedIn}
            <p class="text-base text-muted-foreground">Information</p>
            <div class="p-6 py-2 m-3 my-4 bg-card rounded-lg shadow-md border">
                <div
                    class="flex items-center justify-between align-middle border-b p-2"
                >
                    <p class="text-base font-medium">Name</p>
                    <p class="text-muted-foreground">John Doe</p>
                </div>
                <div class="flex items-center justify-between align-middle p-2">
                    <p class="text-base font-medium">Email</p>
                    <p class="text-muted-foreground">code@example.com</p>
                </div>
            </div>
            <p class="text-base text-muted-foreground">Plan</p>
            <div class="p-6 py-2 m-3 my-4 bg-card rounded-lg shadow-md border">
                <div
                    class="flex items-center justify-between align-middle border-b p-2"
                >
                    {#if user.plan === "free"}
                        <p class="text-base font-medium">50 Requests/Month</p>
                        <a
                            href="https://highlight.pro/upgrade"
                            target="_blank"
                            class="text-primary underline">Upgrade</a
                        >
                    {:else}
                        <p class="text-base font-medium">Unlimited Requests</p>
                        <p class="text-muted-foreground">{user.plan}</p>
                    {/if}
                </div>
                <div class="flex items-center justify-between align-middle p-2">
                    <p class="text-base font-medium">
                        {user.plan === "free" ? "Reset Date" : "Expiry Date"}
                    </p>
                    <p class="text-muted-foreground">
                        {user.plan === "free"
                            ? getNextResetDay()
                            : user.expiryDate}
                    </p>
                </div>
            </div>
        {:else}
            <div class="h-48 flex flex-col justify-center items-center px-6">
                <div class="text-center space-y-6">
                    <p class="text-lg font-medium">
                        Sign in to access your account
                    </p>
                    <button
                        onclick={onSignIn}
                        class="w-full max-w-xs px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition"
                    >
                        Sign In
                    </button>
                </div>
            </div>
        {/if}
    {:else if allowList}
        <div class="relative my-3 pb-2 mt-1">
            {#if !user}
                <div
                    class="rounded-lg shadow-sm hover:shadow-md border border-yellow-400 bg-yellow-200 py-1 px-2"
                >
                    <p
                        class="text-yellow-600 text-base inline-flex items-center"
                    >
                        <OctagonAlert class="text-yellow-500 size-4 mr-2" />
                        This feature is for subscribers.
                        <a
                            href="https://"
                            target="_blank"
                            class="text-blue-400 underline ml-2">Join Now</a
                        >
                    </p>
                </div>
            {/if}
        </div>
    {:else}
        <div class="relative">
            {#if hostname}
                <div
                    class="my-3 flex w-full items-center gap-x-2 pb-2 justify-center"
                >
                    <p class="text-lg">{hostname}</p>
                    <Tooltip.Provider>
                        <Tooltip.Root>
                            <Tooltip.Trigger>
                                <button
                                    aria-label="Edit Allow List"
                                    onclick={() => openList()}
                                    class="flex items-center cursor-pointer"
                                >
                                    <ListFilterPlus class="size-4" />
                                </button>
                            </Tooltip.Trigger>

                            <Tooltip.Content>
                                <p>Edit Allow Lists</p>
                            </Tooltip.Content>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                </div>
            {/if}
            <div
                class="flex flex-col justify-between items-center space-y-1 mb-4"
            >
                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <button
                                onclick={() => {
                                    handleExtensionActivation();
                                }}
                                class="icons"
                                aria-label="activate"
                            >
                                <svg
                                    class="w-20 h-20 transition-all transform duration-700 ease-in-out {isActivated
                                        ? 'fill-green-500 dark:fill-green-300'
                                        : 'fill-destructive -rotate-180'}"
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="36"
                                    height="36"
                                    viewBox="0 0 36 36"
                                    ><path
                                        fill={isActivated ? "green" : "red"}
                                        d="M18 2a16 16 0 1 0 16 16A16 16 0 0 0 18 2m.06 17.68a1.28 1.28 0 0 1-1.29-1.28V8.65a1.29 1.29 0 0 1 2.58 0v9.75a1.28 1.28 0 0 1-1.29 1.28M18 27.79a9.88 9.88 0 0 1-5.83-17.94a1.4 1.4 0 0 1 1.94.31a1.37 1.37 0 0 1-.31 1.92a7.18 7.18 0 1 0 11.43 5.8a7.07 7.07 0 0 0-3-5.76A1.37 1.37 0 0 1 22 10.2a1.4 1.4 0 0 1 1.94-.29A9.88 9.88 0 0 1 18 27.79"
                                        class="clr-i-solid clr-i-solid-path-1"
                                    /><path
                                        fill="none"
                                        d="M0 0h36v36H0z"
                                    /></svg
                                >
                            </button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p>
                                {isActivated
                                    ? "Turn Off Extension"
                                    : "Turn On Extension"}
                            </p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
                <p class="text-sm font-bold text-gray-400 dark:text-gray-500">
                    {isActivated ? "Activated" : "Deactivated"}
                </p>
            </div>
            <div class="my-4 pt-3">
                <div
                    class="grid grid-cols-3 gap-x-4 items-stretch align-middle justify-between"
                >
                    <!-- Total Usage -->
                    <div
                        class="border rounded-lg min-h-24 p-4 card cursor-pointer hover:shadow-md transition-all duration-700"
                    >
                        <div class="flex flex-col h-full justify-between">
                            <div class="flex items-center justify-between mb-2">
                                <div class="icons">
                                    <svg
                                        class="w-5 h-5 text-blue-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M13 10V3L4 14h7v7l9-11h-7z"
                                        />
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <p class="text-2xl font-bold text-primary">
                                    {totalRequests.toLocaleString()}
                                </p>
                                <p class="text-sm text-gray-400 mt-1">
                                    Requests
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Successful Requests -->
                    <div
                        class="border rounded-lg min-h-24 p-4 card cursor-pointer hover:shadow-md transition-all duration-700"
                    >
                        <div class="flex flex-col h-full justify-between">
                            <div
                                class="flex items-center justify-between mb-2 mr-1"
                            >
                                <div class="icons mr-1">
                                    <svg
                                        class="w-5 h-5 text-green-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <span
                                    class="text-xs shadow-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full"
                                >
                                    {isNaN(successRate)
                                        ? "0"
                                        : `${successRate.toFixed(1)}`}%
                                </span>
                            </div>
                            <div>
                                <p class="text-2xl font-bold text-primary">
                                    {successfulRequests.toLocaleString()}
                                </p>
                                <p class="text-sm text-gray-400 mt-1">
                                    Successful
                                </p>
                            </div>
                        </div>
                    </div>

                    <div
                        class="border rounded-lg min-h-24 p-4 card cursor-pointer hover:shadow-md transition-all duration-700"
                    >
                        <div class="flex flex-col h-full justify-between">
                            <div class="flex items-center justify-between mb-2">
                                <div class="icons mr-1">
                                    <svg
                                        class="w-5 h-5 text-red-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <span
                                    class="text-xs shadow-sm font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full"
                                >
                                    {isNaN(failureRate)
                                        ? "0"
                                        : `${failureRate.toFixed(1)}`}%
                                </span>
                            </div>
                            <div>
                                <p class="text-2xl font-bold text-primary">
                                    {failedRequests.toLocaleString()}
                                </p>
                                <div
                                    class="flex justify-start items-center gap-x-1"
                                >
                                    <p
                                        class="text-sm text-gray-400 mt-1 mr-0.5"
                                    >
                                        Failed
                                    </p>
                                    <Tooltip.Provider>
                                        <Tooltip.Root>
                                            <Tooltip.Trigger>
                                                <Info class="size-4" />
                                            </Tooltip.Trigger>
                                            <Tooltip.Content>
                                                <p>
                                                    This does not include
                                                    requests that failed due to
                                                    network related issues.
                                                </p>
                                            </Tooltip.Content>
                                        </Tooltip.Root>
                                    </Tooltip.Provider>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>
