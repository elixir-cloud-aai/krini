import axios from "axios";

export const DEFAULT_TIMEOUT_MS = 10_000;

export const axiosBase = axios.create({ timeout: DEFAULT_TIMEOUT_MS });

export const deadline = (ms = DEFAULT_TIMEOUT_MS) => AbortSignal.timeout(ms);

export function isTimeoutError(err: unknown): boolean {
    if (axios.isAxiosError(err)) {
        return err.code === "ECONNABORTED" || err.code === "ETIMEDOUT";
    }
    if (axios.isCancel(err)) return true;
    return err instanceof DOMException && err.name === "TimeoutError";
}
