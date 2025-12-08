import Overlay from "./Overlay.svelte";
import { mount } from "svelte";
let overlayComponent: Overlay | null = null;
let overlayContainer: HTMLDivElement | null = null;
let selectedText = "";
let selectionRect: DOMRect | null = null;

function createOverlayContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.id = "highlight-overlay-container";
  container.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2147483647909090;
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
  if (overlayComponent) {
    // overlayComponent.$destroy();
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

  // Remove surrounding punctuation but keep internal (e.g. "don't" → keep apostrophe)
  const cleanWord = word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");
  const letterCount = (cleanWord.match(/[a-zA-Z0-9]/g) || []).length;

  if (letterCount < 3 || cleanWord.length === 0) {
    hideOverlay();
    return;
  }

  // Use original word (with punctuation) for display, but clean for logic
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
    // Fixed ID match
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      return;
    }
    hideOverlay();
  }
});

window.addEventListener("scroll", () => {
  if (overlayComponent && selectionRect) {
    hideOverlay();
  }
});

console.log("Word Saver content script loaded");
