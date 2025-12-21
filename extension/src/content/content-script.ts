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
let closedWord = "";

async function loadUserData() {
  try {
    const userData = await getChromeStorage<{ user?: User }>(["user"]);
    user = userData.user || null;
    handleTextSelection();
  } catch (error) {
    console.error("[Highlight Extension] Failed to load user data:", error);
    user = null;
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "USER_UPDATED") {
    user = message.user || null;
    closedWord = "";
    handleTextSelection();
  }

  if (message.type === "Extension deactivated" || message.type === "Extension activated") {
    if (user) {
      user.extensionMode = message.isActivated;
    }
    closedWord = "";
    handleTextSelection();
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

function calculateOverlayPosition(rect: DOMRect) {
  const padding = 12;
  const overlayWidth = 320;
  const overlayHeight = 150;

  const wordCenter = rect.left + window.scrollX + rect.width / 2;

  let x = wordCenter - overlayWidth / 2;

  const minX = window.scrollX + padding;
  const maxX = window.scrollX + window.innerWidth - overlayWidth - padding;

  if (x < minX) x = minX;
  if (x > maxX) x = maxX;

  const relativeArrowX = wordCenter - x;
  const arrowXPercent = (relativeArrowX / overlayWidth) * 100;

  let y = rect.top + window.scrollY - overlayHeight - padding;
  let side = "top" as "top" | "bottom";

  if (rect.top < overlayHeight + padding) {
    y = rect.bottom + window.scrollY + padding;
    side = "bottom";
  }

  return { x, y, arrowX: arrowXPercent, side };
}

function isElementInViewport(rect: DOMRect): boolean {
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

function showOverlay(word: string, rect: DOMRect) {
  hideOverlay();

  if (!overlayContainer) {
    overlayContainer = createOverlayContainer();
  }

  const position = calculateOverlayPosition(rect);

  overlayComponent = mount(Overlay, {
    target: overlayContainer,
    props: {
      word,
      x: position.x,
      y: position.y,
      arrowX: position.arrowX,
      placement: position.side,
      isVisible: true,
      onClose: () => {
        closedWord = word;
        hideOverlay();
      },
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

  if (user?.disallowedList?.length) {
    const hostname = window.location.hostname;
    const isDisallowed = user.disallowedList.some((domain: string) =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    if (isDisallowed) {
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

  const isValidWord = /^[a-zA-Z']+$/.test(word);

  if (!isValidWord) {
    hideOverlay();
    return;
  }

  const cleanWord = word.replace(/^'+|'+$/g, "");
  if (cleanWord.length < 3) {
    hideOverlay();
    return;
  }

  if (word === closedWord) {
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
      selectedText === word &&
      word !== closedWord
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
    closedWord = "";
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
    closedWord = "";
  }
});

window.addEventListener("scroll", () => {
  if (!overlayComponent || !selectedText || !selectionRect) return;

  if (scrollTimeout) return;

  scrollTimeout = window.setTimeout(() => {
    scrollTimeout = null;

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim() === selectedText) {
      const range = selection.getRangeAt(0);
      const newRect = range.getBoundingClientRect();

      const visible = isElementInViewport(newRect);

      const pos = calculateOverlayPosition(newRect);

      overlayComponent!.x = pos.x;
      overlayComponent!.y = pos.y;
      overlayComponent!.isVisible = visible;
      overlayComponent!.placement = pos.side;
      overlayComponent!.arrowX = pos.arrowX;
      selectionRect = newRect;
    } else {
      hideOverlay();
    }
  }, 10);
}, { passive: true });

window.addEventListener("beforeunload", () => {
  hideOverlay();
  if (overlayContainer && overlayContainer.parentNode) {
    overlayContainer.parentNode.removeChild(overlayContainer);
  }
});