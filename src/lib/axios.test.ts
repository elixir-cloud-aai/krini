import { AxiosError, CanceledError } from "axios";
import { describe, expect, it } from "vitest";
import {
    axiosBase,
    DEFAULT_TIMEOUT_MS,
    deadline,
    isTimeoutError,
} from "./axios";

describe("axiosBase", () => {
    it("times out requests after the default timeout", () => {
        expect(axiosBase.defaults.timeout).toBe(DEFAULT_TIMEOUT_MS);
    });
});

describe("deadline", () => {
    it("returns a signal that isn't aborted yet", () => {
        expect(deadline().aborted).toBe(false);
        expect(deadline(50).aborted).toBe(false);
    });
});

describe("isTimeoutError", () => {
    it.each(["ECONNABORTED", "ETIMEDOUT"])("accepts axios code %s", (code) => {
        expect(isTimeoutError(new AxiosError("timeout", code))).toBe(true);
    });

    it("rejects other axios errors", () => {
        expect(isTimeoutError(new AxiosError("refused", "ECONNREFUSED"))).toBe(
            false,
        );
    });

    it("rejects cancellations, which are axios errors with their own code", () => {
        expect(isTimeoutError(new CanceledError())).toBe(false);
    });

    it("accepts cancellations of other cancel tokens", () => {
        expect(isTimeoutError({ __CANCEL__: true })).toBe(true);
    });

    it("accepts the timeout of an abort signal", () => {
        expect(
            isTimeoutError(new DOMException("timed out", "TimeoutError")),
        ).toBe(true);
    });

    it("rejects other errors", () => {
        expect(isTimeoutError(new DOMException("aborted", "AbortError"))).toBe(
            false,
        );
        expect(isTimeoutError(new Error("timeout"))).toBe(false);
        expect(isTimeoutError(undefined)).toBe(false);
    });
});
