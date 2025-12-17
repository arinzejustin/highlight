<script lang="ts">
    import { Lightbulb, Save, Cloud, ArrowRight } from "@lucide/svelte";

    interface Props {
        onComplete: () => void;
    }

    let { onComplete }: Props = $props();

    let currentStep = $state(0);

    const steps = [
        {
            icon: Lightbulb,
            title: "Highlight Words",
            description:
                "Select any word on a webpage to see its meaning instantly.",
        },
        {
            icon: Save,
            title: "Save for Later",
            description:
                "Click the save icon to store words and their meanings.",
        },
        {
            icon: Cloud,
            title: "Sync Everywhere",
            description:
                "Your saved words sync across all your devices automatically.",
        },
    ];

    function nextStep() {
        if (currentStep < steps.length - 1) {
            currentStep++;
        } else {
            onComplete();
        }
    }

    function skipOnboarding() {
        onComplete();
    }
</script>

<div class="flex flex-col h-full p-6 py-2">
    <div class="flex-1 flex flex-col items-center justify-center space-y-8">
        <div
            class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
        >
            {#if true}
                {@const IconComponent = steps[currentStep].icon}
                <IconComponent class="w-10 h-10 text-primary" />
            {/if}
        </div>

        <div class="text-center space-y-3 max-w-sm">
            <h2 class="text-2xl font-bold">{steps[currentStep].title}</h2>
            <p class="text-muted-foreground">
                {steps[currentStep].description}
            </p>
        </div>

        <div class="flex gap-2 mb-3">
            {#each steps as _, index}
                <div
                    class="w-2 h-2 rounded-full transition-colors"
                    class:bg-primary={index === currentStep}
                    class:bg-muted-foreground={index !== currentStep}
                ></div>
            {/each}
        </div>
    </div>

    <div class="space-y-3">
        <button
            onclick={nextStep}
            class="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium flex items-center justify-center gap-2"
        >
            {currentStep < steps.length - 1 ? "Next" : "Get Started"}
            <ArrowRight class="w-4 h-4" />
        </button>

        {#if currentStep < steps.length - 1}
            <button
                onclick={skipOnboarding}
                class="w-full px-4 py-2 text-muted-foreground hover:text-foreground"
            >
                Skip
            </button>
        {/if}
    </div>
</div>
