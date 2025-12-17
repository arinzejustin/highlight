import { writable } from "svelte/store";
import { getChromeStorage, setChromeStorage } from "$lib/utils/chromeWrap";
import type { User } from "$lib/types";

interface StorageData {
    user?: Partial<User>;
}

type Records = NonNullable<User["records"]>;

const DEFAULT_RECORDS: Records = {
    requestCount: 0,
    successfulRequestCount: 0,
    failedRequestCount: 0,
    lastRequestDate: new Date().toLocaleString(),
};

let writeTimer: ReturnType<typeof setTimeout> | null = null;
let bufferedRecords: Records | null = null;


function createRecordsStore() {
    const { subscribe, set, update } = writable<Records>(DEFAULT_RECORDS);

    function persist(records: Records) {
        bufferedRecords = records;

        if (writeTimer) return;

        writeTimer = setTimeout(async () => {
            if (!bufferedRecords) return;

            const stored = await getChromeStorage<StorageData>(["user"]);

            await setChromeStorage({
                user: {
                    ...(stored.user || {}),
                    records: bufferedRecords,
                },
            });

            writeTimer = null;
            bufferedRecords = null;
        }, 300);
    }

    async function init() {
        const data = await getChromeStorage<StorageData>(["user"]);

        const records =
            data.user?.records && typeof data.user.records === "object"
                ? data.user.records
                : DEFAULT_RECORDS;

        set(records);
        persist(records);
    }

    function updateRecords(fn: (records: Records) => Records) {
        update((current) => {
            const updated = fn(current);
            persist(updated);
            return updated;
        });
    }

    return {
        subscribe,
        init,

        incrementRequest() {
            updateRecords((r) => ({
                ...r,
                requestCount: r.requestCount + 1,
                lastRequestDate: new Date().toLocaleString(),
            }));
        },

        incrementSuccess() {
            updateRecords((r) => ({
                ...r,
                successfulRequestCount: r.successfulRequestCount + 1,
                lastRequestDate: new Date().toLocaleString(),
            }));
        },

        incrementFailure() {
            updateRecords((r) => ({
                ...r,
                failedRequestCount: r.failedRequestCount + 1,
                lastRequestDate: new Date().toLocaleString(),
            }));
        },

        setLastRequestDate(date = new Date().toLocaleString()) {
            updateRecords((r) => ({
                ...r,
                lastRequestDate: date,
            }));
        },

        reset() {
            updateRecords(() => ({
                ...DEFAULT_RECORDS,
                lastRequestDate: new Date().toLocaleString(),
            }));
        },
    };
}

export const recordsStore = createRecordsStore();

recordsStore.init().catch((e) => {
    console.error("[Highlight Extension] Records store init failure:", e);
});
