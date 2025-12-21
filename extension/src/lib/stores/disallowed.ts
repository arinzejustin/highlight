import { writable } from "svelte/store";
import { getChromeStorage, setChromeStorage, chromeBroadcast } from "$lib/utils/chromeWrap";
import type { User } from "$lib/types";

interface DisallowedList {
    user?: Partial<User>;
}

function createDisallowedStore() {
    const { subscribe, set } = writable<string[]>([]);
    let current: string[] = [];

    subscribe((list) => (current = list));

    async function init() {
        try {
            const data = await getChromeStorage<DisallowedList>(["user"]);
            const disallowedList = data.user?.disallowedList || [];
            set(disallowedList);
        } catch (error) {
            console.error("[Highlight Extension] Disallowed list init failed:", error);
            set([]);
        }
    }

    async function addSite(url: string) {
        if (!current.includes(url)) {
            const updatedList = [...current, url];
            await setChromeStorage({ user: { disallowedList: updatedList } });
            set(updatedList);
            await chromeBroadcast({ type: "DISALLOWED_LIST_UPDATED", disallowedList: updatedList });
        }
    }

    async function removeSite(url: string) {
        if (current.includes(url)) {
            const updatedList = current.filter((site) => site !== url);
            await setChromeStorage({ user: { disallowedList: updatedList } });
            set(updatedList);
            await chromeBroadcast({ type: "DISALLOWED_LIST_UPDATED", disallowedList: updatedList });
        }
    }

    function list(): string[] {
        return current;
    }

    return {
        subscribe,
        async init() {
            await init();
        },
        addSite,
        removeSite,
        list
    };
}

export const disallowedStore = createDisallowedStore();

disallowedStore.init().catch((e) => {
    console.error("[Highlight Extension] Critical init failure:", e);
});