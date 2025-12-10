<script lang="ts">
    import { onMount } from "svelte";

    let { onVerify = (success: boolean) => {}, tolerance = 15 } = $props<{
        onVerify: (success: boolean) => void;
        tolerance?: number;
    }>();

    // State
    let dragPosition = $state(0);
    let isDragging = $state(false);
    let isVerified = $state(false);
    let targetPosition = $state(0);
    let dragPath = $state([]) as { x: number; time: number }[];
    let startTime = $state(null) as number | null;
    let sliderRef: HTMLDivElement;

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

<div class="captcha-container">
    <div class="captcha-header">
        <h3>Verify you're human</h3>
        <button
            class="reset-btn"
            on:click={handleReset}
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

    <div class="instruction">Drag the slider to align with the target</div>

    <div class="slider-container" bind:this={sliderRef}>
        <!-- Target indicator -->
        <div class="target-indicator" style="left: {targetPosition * 100}%">
            <div class="target-line"></div>
            <div class="target-dot"></div>
        </div>

        <!-- Slider track -->
        <div class="slider-track">
            <div
                class="slider-fill"
                style="width: {dragPosition * 100}%"
                class:verified={isVerified === true}
                class:failed={isVerified === false}
            ></div>
        </div>

        <!-- Draggable handle -->
        <div
            class="slider-handle"
            style="left: {dragPosition * 100}%"
            class:dragging={isDragging}
            class:verified={isVerified === true}
            class:failed={isVerified === false}
            on:mousedown={handleMouseDown}
            on:touchstart={handleTouchStart}
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
            class="result-message"
            class:success={isVerified === true}
            class:error={isVerified === false}
        >
            {isVerified
                ? "✓ Verification successful!"
                : "✗ Verification failed. Try again."}
        </div>
    {/if}
</div>

<style>
    .captcha-container {
        width: 100%;
        max-width: 400px;
        padding: 24px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
    }

    .captcha-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a1a1a;
    }

    .reset-btn {
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        color: #666;
        border-radius: 6px;
        transition: all 0.2s;
    }

    .reset-btn:hover {
        background: #f5f5f5;
        color: #333;
    }

    .instruction {
        font-size: 14px;
        color: #666;
        margin-bottom: 24px;
    }

    .slider-container {
        position: relative;
        height: 60px;
        margin: 20px 0;
    }

    .target-indicator {
        position: absolute;
        top: 0;
        transform: translateX(-50%);
        z-index: 1;
        pointer-events: none;
    }

    .target-line {
        width: 2px;
        height: 60px;
        background: linear-gradient(to bottom, #3b82f6, #60a5fa);
        margin: 0 auto;
        opacity: 0.6;
    }

    .target-dot {
        width: 12px;
        height: 12px;
        background: #3b82f6;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
    }

    .slider-track {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 100%;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
    }

    .slider-fill {
        height: 100%;
        background: #94a3b8;
        transition: background 0.3s;
        border-radius: 4px;
    }

    .slider-fill.verified {
        background: #10b981;
    }

    .slider-fill.failed {
        background: #ef4444;
    }

    .slider-handle {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 48px;
        height: 48px;
        background: white;
        border: 2px solid #cbd5e1;
        border-radius: 50%;
        cursor: grab;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 2;
        user-select: none;
    }

    .slider-handle:hover {
        border-color: #94a3b8;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .slider-handle.dragging {
        cursor: grabbing;
        transform: translate(-50%, -50%) scale(1.1);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
    }

    .slider-handle.verified {
        border-color: #10b981;
        background: #10b981;
        color: white;
    }

    .slider-handle.failed {
        border-color: #ef4444;
        background: #ef4444;
        color: white;
    }

    .result-message {
        text-align: center;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        margin-top: 16px;
    }

    .result-message.success {
        background: #d1fae5;
        color: #065f46;
    }

    .result-message.error {
        background: #fee2e2;
        color: #991b1b;
    }
</style>
