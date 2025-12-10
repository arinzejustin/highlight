<script lang="ts">
    import { authStore } from "$lib/stores/auth";
    import { loginUser } from "$lib/utils/api";
    import Captcha from "../security/Captcha.svelte";
    import type { User } from "$lib/types";

    interface Props {
        onLoginSuccess: () => void;
    }

    let { onLoginSuccess }: Props = $props();

    let email = $state("");
    let password = $state("");
    let isLoading = $state(false);
    let error = $state("");
    let securityCheck = $state(true);
    let result = $state(null) as {
        token: string;
        userId: string;
        user: User;
    } | null;

    async function handleLogin() {
        if (!email || !password) {
            error = "Please enter email and password";
            return;
        }

        isLoading = true;
        error = "";

        try {
            result = await loginUser(email, password);
            if (result) {
                securityCheck = true;
            } else {
                error = "Invalid credentials";
            }
        } catch (err) {
            error = "Login failed. Please try again.";
        } finally {
            isLoading = false;
        }
    }
    async function handleErrorCaptcha(err: Error) {
        await authStore.logout(true);
        error = "Captcha verification failed. Please try again.";
        securityCheck = false;
    }

    async function handleSuccessCaptcha() {
        if (!result) {
            error = "Login data missing. Please try again.";
            securityCheck = false;
            return;
        }

        const loginSuccess = await authStore.login(result);
        if (loginSuccess) {
            onLoginSuccess();
        } else {
            error = "Login failed after captcha. Please try again.";
            securityCheck = false;
        }
    }
</script>

{#if securityCheck}
    <Captcha
        onVerify={(success) => {
            if (success) {
                setTimeout(() => handleSuccessCaptcha(), 1000);
            }
        }}
        onError={(err) => {
            handleErrorCaptcha(err);
        }}
    />
{:else}
    <div class="flex flex-col items-center justify-center h-full p-1">
        <div class="w-full max-w-sm space-y-6">
            <form
                onsubmit={(e) => {
                    e.preventDefault();
                    handleLogin();
                }}
                class="space-y-4"
            >
                <div class="space-y-2">
                    <label for="email" class="text-sm font-medium">Email</label>
                    <input
                        id="email"
                        type="email"
                        bind:value={email}
                        placeholder="you@example.com"
                        class="w-full px-3 py-2.5 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        disabled={isLoading}
                    />
                </div>

                <div class="space-y-2">
                    <label for="password" class="text-sm font-medium"
                        >Password</label
                    >
                    <input
                        id="password"
                        type="password"
                        bind:value={password}
                        placeholder="*************"
                        class="w-full px-3 py-2.5 border border-input bg-background rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        disabled={isLoading}
                    />
                </div>

                {#if error}
                    <p class="text-sm text-destructive text-center">{error}</p>
                {/if}

                <button
                    type="submit"
                    disabled={isLoading}
                    class="w-full px-3 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {#if isLoading}
                        <div class="flex items-center justify-center h-full">
                            <div
                                class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
                            ></div>
                        </div>
                    {:else}
                        Login
                    {/if}
                </button>
            </form>
            <p class="text-xs text-center text-muted-foreground">
                Don't have an account? <a
                    href="https://highlighter.com/signup"
                    target="_blank"
                    class="text-primary hover:underline">Sign up</a
                >
            </p>
        </div>
    </div>
{/if}
