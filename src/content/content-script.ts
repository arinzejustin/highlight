import Overlay from "./Overlay.svelte";
import { mount, unmount } from "svelte";

let overlayComponent: ReturnType<typeof mount> | null = null;
let overlayContainer: HTMLDivElement | null = null;
let selectedText = "";
let selectionRect: DOMRect | null = null;
let scrollTimeout: number | null = null;

function createOverlayContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.id = "highlight-overlay-container";
  container.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2147483647;
    pointer-events: none;
  `;
  document.body.appendChild(container);
  return container;
}

function showOverlay(word: string, rect: DOMRect) {
  hideOverlay();

  if (!overlayContainer) {
    overlayContainer = createOverlayContainer();
  }

  overlayComponent = mount(Overlay, {
    target: overlayContainer,
    props: {
      word,
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 10,
      onClose: hideOverlay,
    },
  });
}

function hideOverlay() {
  if (overlayComponent && overlayContainer) {
    unmount(overlayComponent);
    overlayComponent = null;
  }
}

function handleTextSelection() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    hideOverlay();
    return;
  }

  const text = selection.toString().trim();
  if (!text) return;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length !== 1) {
    hideOverlay();
    return;
  }

  let word = words[0];

  const cleanWord = word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");
  const letterCount = (cleanWord.match(/[a-zA-Z0-9]/g) || []).length;

  if (letterCount < 3 || cleanWord.length === 0) {
    hideOverlay();
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  selectedText = word;
  selectionRect = rect;

  setTimeout(() => {
    if (
      selectedText === word &&
      window.getSelection()?.toString().trim() === text
    ) {
      showOverlay(word, rect);
    }
  }, 300);
}

document.addEventListener("mouseup", handleTextSelection);

document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  if (selection && selection.isCollapsed) {
    hideOverlay();
  }
});

document.addEventListener("mousedown", (e) => {
  const target = e.target as HTMLElement;
  if (!target.closest("#highlight-overlay-container")) {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      return;
    }
    hideOverlay();
  }
});

window.addEventListener("scroll", () => {
  if (overlayComponent && selectionRect && selectedText) {
    if (scrollTimeout) return;

    scrollTimeout = window.setTimeout(() => {
      scrollTimeout = null;

      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const newRect = range.getBoundingClientRect();

        if (overlayComponent) {
          overlayComponent.$set?.({
            x: newRect.left + window.scrollX,
            y: newRect.top + window.scrollY - 10,
          });
        }
        selectionRect = newRect;
      } else {
        hideOverlay();
      }
    }, 16);
  }
}, { passive: true });

window.addEventListener("beforeunload", () => {
  hideOverlay();
  if (overlayContainer && overlayContainer.parentNode) {
    overlayContainer.parentNode.removeChild(overlayContainer);
  }
});

console.log("[Highlight Extension]: Content script loaded");