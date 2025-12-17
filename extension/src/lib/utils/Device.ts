import Bowser from "bowser";
import { getChromeStorage, setChromeStorage } from "./chromeWrap";
import type { DeviceInfo } from "$lib/types";

export function getDeviceInfo(): Omit<DeviceInfo, "deviceId"> {
    const userAgent = typeof window !== "undefined"
        ? window.navigator.userAgent
        : navigator.userAgent;

    const parser = Bowser.getParser(userAgent);

    return {
        browser: parser.getBrowserName(),
        browserVersion: parser.getBrowserVersion() || "",
        os: parser.getOSName(),
        osVersion: parser.getOSVersion() || "",
        platform: parser.getPlatformType(),
        engine: parser.getEngineName(),
    };
}


export async function retriveId(): Promise<string | undefined> {
    try {
        const storedData = await getChromeStorage<{ deviceId?: string }>(
            ['deviceId'],
        );
        return storedData.deviceId;
    } catch {
        return undefined;
    }
}

export async function setDeviceId(deviceId: string) {
    try {
        await setChromeStorage({
            ['deviceId']: deviceId,
        });
    } catch {
        setTimeout(() => setDeviceId(deviceId), 4000)
    }
}