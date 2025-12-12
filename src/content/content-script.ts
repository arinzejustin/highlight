import Overlay from "./Overlay.svelte";
import { mount, unmount } from "svelte";
import { getChromeStorage } from "$lib/utils/chromeWrap";
import type { User } from "$lib/types";

let overlayComponent: ReturnType<typeof mount> | null = null;
let overlayContainer: HTMLDivElement | null = null;
let selectedText = "";
let selectionRect: DOMRect | null = null;
let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let user: User | null = null;

async function loadUserData() {
  try {
    const authData = await getChromeStorage<{ user?: User }>(["user"]);
    user = authData.user || null;
  } catch (error) {
    console.error("[Highlight Extension] Failed to load user data:", error);
    user = null;
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "USER_UPDATED") {
    user = message.user || null;
  }

  if (message.type === "Extension deactivated" || message.type === "Extension activated") {
    user!.extensionMode! = message.isActivated;
  }
});

loadUserData();

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
  if (user?.extensionMode === false) {
    hideOverlay();
    return;
  }

  if (user?.allowedList?.length) {
    const hostname = window.location.hostname;
    const isAllowed = user.allowedList.some((domain: string) =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    if (!isAllowed) {
      hideOverlay();
      return;
    }
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    hideOverlay();
    return;
  }

  const words = selection.toString().trim().split(/\s+/).filter(Boolean);
  if (words.length !== 1) {
    hideOverlay();
    return;
  }

  const word = words[0];
  const cleanWord = word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");
  if (cleanWord.length === 0 || (cleanWord.match(/[a-zA-Z0-9]/g) || []).length < 3) {
    hideOverlay();
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  selectedText = word;
  selectionRect = rect;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    const currentSel = window.getSelection();
    if (
      currentSel?.toString().trim() === word &&
      selectedText === word
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

        // Unmount and remount with updated props
        if (overlayComponent && overlayContainer) {
          unmount(overlayComponent);
          overlayComponent = mount(Overlay, {
            target: overlayContainer,
            props: {
              word: selectedText,
              x: newRect.left + window.scrollX,
              y: newRect.top + window.scrollY - 10,
              onClose: hideOverlay,
            },
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