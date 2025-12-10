<script lang="ts">
    import { onMount } from "svelte";

    let {
        onVerify = (success: boolean) => {},
        tolerance = 15,
        onError = (error: Error) => {},
    } = $props<{
        onVerify: (success: boolean) => void;
        tolerance?: number;
        onError?: (error: Error) => void;
    }>();

    // State
    let dragPosition = $state(0);
    let isDragging = $state(false);
    let isVerified = $state<boolean | null>(null);
    let targetPosition = $state(0);
    let dragPath = $state([]) as { x: number; time: number }[];
    let startTime = $state(null) as number | null;
    let sliderRef: HTMLDivElement;
    let errorCount = $state(0);

    onMount(() => {
        generateNewChallenge();
    });

    function generateNewChallenge() {
        targetPosition = Math.random() * 0.6 + 0.2;
        dragPosition = 0;
        isVerified = null;
        dragPath = [];
        startTime = null;
    }

    function handleMouseDown(e: MouseEvent) {
        isDragging = true;
        startTime = Date.now();
        dragPath = [{ x: 0, time: 0 }];
    }

    function handleTouchStart(e: TouchEvent) {
        isDragging = true;
        startTime = Date.now();
        dragPath = [{ x: 0, time: 0 }];
        e.preventDefault();
    }

    function handleMove(clientX: number) {
        if (!isDragging || !sliderRef) return;

        const rect = sliderRef.getBoundingClientRect();
        const newPosition = Math.max(
            0,
            Math.min(1, (clientX - rect.left) / rect.width),
        );

        dragPosition = newPosition;
        dragPath = [
            ...dragPath,
            {
                x: newPosition,
                time: Date.now() - startTime!,
            },
        ];
    }

    function handleMouseMove(e: MouseEvent) {
        handleMove(e.clientX);
    }

    function handleTouchMove(e: TouchEvent) {
        if (e.touches.length > 0) {
            handleMove(e.touches[0].clientX);
        }
    }

    function verifyDrag() {
        if (!sliderRef) return;

        const rect = sliderRef.getBoundingClientRect();
        const targetPixels = targetPosition * rect.width;
        const dragPixels = dragPosition * rect.width;
        const distance = Math.abs(targetPixels - dragPixels);

        // Check if within tolerance
        const positionCorrect = distance <= tolerance;

        // Analyze drag behavior for bot detection
        const tooFast = dragPath.length < 3;
        const tooStraight = analyzeSmoothness();

        const success = positionCorrect && !tooFast && !tooStraight;
        isVerified = success;
        onVerify(success);

        if (!success) {
            errorCount++;
            if (errorCount >= 5) {
                onError(
                    new Error(
                        "Multiple failed CAPTCHA attempts detected. Possible bot activity.",
                    ),
                );
                return;
            }
            setTimeout(generateNewChallenge, 1500);
        }
    }

    function analyzeSmoothness() {
        if (dragPath.length < 5) return true;

        let changes = 0;
        for (let i = 1; i < dragPath.length - 1; i++) {
            const diff1 = dragPath[i].x - dragPath[i - 1].x;
            const diff2 = dragPath[i + 1].x - dragPath[i].x;
            if (Math.abs(diff1 - diff2) > 0.01) changes++;
        }

        return changes < 2;
    }

    function handleEnd() {
        if (isDragging) {
            isDragging = false;
            verifyDrag();
        }
    }

    function handleReset() {
        generateNewChallenge();
    }
</script>

<svelte:window
    onmousemove={handleMouseMove}
    onmouseup={handleEnd}
    ontouchmove={handleTouchMove}
    ontouchend={handleEnd}
/>

<div class="w-full max-w-[400px] p-6 bg-card font-extension">
    <div class="flex justify-between items-center mb-2">
        <h3 class="m-0 text-lg font-semibold text-foreground">
            Verify you're human
        </h3>
        <button
            class="bg-transparent border-none p-2 cursor-pointer text-primary rounded hover:bg-muted transition-all duration-200"
            onclick={() => {
                handleReset();
            }}
            aria-label="Reset challenge"
        >
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <path
                    d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"
                />
            </svg>
        </button>
    </div>

    <!-- Instruction -->
    <div class="text-sm text-muted-foreground mb-6">
        Drag the slider to align with the target
    </div>

    <!-- Slider Container -->
    <div class="relative h-[60px] my-5" bind:this={sliderRef}>
        <!-- Target indicator -->
        <div
            class="absolute top-0 transform -translate-x-1/2 z-10 pointer-events-none"
            style="left: {targetPosition * 100}%"
        >
            <div
                class="w-0.5 h-[60px] bg-linear-to-b from-primary to-blue-400 opacity-60 mx-auto"
            ></div>
            <div
                class="w-3 h-3 bg-primary rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
                style="box-shadow: 0 0 0 4px rgb(var(--primary) / 0.2)"
            ></div>
        </div>

        <!-- Slider track -->
        <div
            class="absolute top-1/2 transform -translate-y-1/2 w-full h-2 bg-muted rounded overflow-hidden"
        >
            <div
                class="h-full rounded transition-colors duration-300 {isVerified ===
                true
                    ? 'bg-emerald-500'
                    : isVerified === false
                      ? 'bg-destructive'
                      : 'bg-muted-foreground'}"
                style="width: {dragPosition * 100}%"
            ></div>
        </div>

        <!-- Draggable handle -->
        <div
            class="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-card border-2 rounded-full cursor-grab flex items-center justify-center transition-all duration-200 shadow-md z-20 select-none hover:shadow-lg"
            class:cursor-grabbing={isDragging}
            class:scale-110={isDragging}
            class:shadow-xl={isDragging}
            class:border-emerald-500={isVerified === true}
            class:bg-emerald-500={isVerified === true}
            class:text-white={isVerified !== null}
            class:border-destructive={isVerified === false}
            class:bg-destructive={isVerified === false}
            class:border-muted-foreground={isVerified === null}
            style="left: {dragPosition * 100}%"
            onmousedown={(e) => handleMouseDown(e)}
            ontouchstart={(e) => handleTouchStart(e)}
            role="slider"
            tabindex="0"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={Math.round(dragPosition * 100)}
        >
            {#if isVerified === null}
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            {:else if isVerified === true}
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            {:else}
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
            {/if}
        </div>
    </div>

    {#if isVerified !== null}
        <div
            class="text-center p-3 rounded-lg text-sm font-medium mt-4"
            class:bg-emerald-100={isVerified === true}
            class:text-emerald-900={isVerified === true}
            class:bg-red-100={isVerified === false}
            class:text-red-900={isVerified === false}
        >
            {isVerified
                ? "✓ Verification successful!"
                : "✗ Verification failed. Try again."}
        </div>
    {/if}
</div>
