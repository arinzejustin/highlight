<script lang="ts">
    import { onMount } from "svelte";
    import { ListFilterPlus } from "@lucide/svelte";
    import { activationStore } from "$lib/stores/activation";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import type { User } from "$lib/types";

    let {
        showAccount = false,
        user = null,
        loggedIn = false,
        onSignIn = () => {},
    } = $props<{
        showAccount?: boolean;
        user?: User | null;
        loggedIn?: boolean;
        onSignIn?: () => void;
    }>();
    let allowList = $state(false);
    let hostname = $state("");

    // let isActivated = $derived($activationStore.isActivated);
    let isActivated = $state(false);

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
        // activationStore.toggle();
        isActivated = !isActivated;
    };

    onMount(() => {
        hostname = window.location.hostname;
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
        <div></div>
    {:else}
        <div class="relative">
            <div class="my-3 flex w-full items-center gap-x-2 pb-2">
                <p class="text-lg">{hostname}</p>
                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <button
                                aria-label="Edit Allow List"
                                onclick={() => (allowList = true)}
                                class="flex items-center"
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
                                        ? 'fill-green-500 dark:fill-green-400'
                                        : 'fill-destructive rotate-180'}"
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
                <p
                    class="text-lg font-bold text-foreground {isActivated
                        ? ''
                        : 'text-opacity-60'}"
                >
                    {isActivated ? "Activated" : "Deactivated"}
                </p>
            </div>
            <div class="my-4">
                <div
                    class="grid grid-cols-3 gap-x-4 items-center align-middle justify-between"
                >
                    <div
                        class="border rounded-lg p-2 bg-secondary card cursor-pointer"
                    ></div>
                    <div
                        class="border rounded-lg p-2 bg-secondary card cursor-pointer"
                    ></div>
                    <div
                        class="border rounded-lg p-2 bg-secondary card cursor-pointer"
                    ></div>
                </div>
            </div>
        </div>
    {/if}
</div>
