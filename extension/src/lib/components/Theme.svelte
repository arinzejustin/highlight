<script lang="ts">
    import { onMount } from "svelte";
    import { Palette } from "@lucide/svelte";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
    import { getLocalStorage, setLocalStorage } from "$lib/utils/chromeWrap";

    let { onChange } = $props<{
        onChange?: (theme: "light" | "dark" | "system") => void;
    }>();

    let theme = $state<"light" | "dark">("light");
    let isDarkMode = $derived(theme === "dark");

    $effect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
            onChange?.("dark");
        } else {
            document.documentElement.classList.remove("dark");
            onChange?.("light");
        }
    });

    onMount(async () => {
        const saved = await getLocalStorage<{ theme?: "light" | "dark" }>(
            "theme",
        );

        if (saved.theme) {
            theme = saved.theme;
        } else {
            theme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        }
    });

    async function setTheme(newTheme: "light" | "dark") {
        theme = newTheme;
        await setLocalStorage({ theme: newTheme });
    }
</script>

<DropdownMenu.Root>
    <DropdownMenu.Trigger class="icons">
        <Palette class="size-4" />
    </DropdownMenu.Trigger>

    <DropdownMenu.Content
        class="w-32 border border-border shadow-md rounded-md"
        align="end"
    >
        <DropdownMenu.RadioGroup
            value={theme}
            onValueChange={(v) => v && setTheme(v as "light" | "dark")}
        >
            <DropdownMenu.RadioItem value="light">Light</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="dark">Dark</DropdownMenu.RadioItem>
        </DropdownMenu.RadioGroup>
    </DropdownMenu.Content>
</DropdownMenu.Root>
