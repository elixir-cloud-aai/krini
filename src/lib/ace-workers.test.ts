import { describe, expect, it, vi } from "vitest";
import {
    ACE_WORKERS,
    selfHostAceWorkers,
    withSelfHostedAce,
} from "./ace-workers";

/** A stand-in for the global `ace` of `ace-builds` */
function fakeAce() {
    return { config: { set: vi.fn(), setModuleUrl: vi.fn() } };
}

describe("selfHostAceWorkers", () => {
    it("loads every worker from Krini's origin", () => {
        const ace = fakeAce();

        selfHostAceWorkers(ace);

        expect(ace.config.setModuleUrl).toHaveBeenCalledTimes(
            ACE_WORKERS.length,
        );
        expect(ace.config.setModuleUrl).toHaveBeenCalledWith(
            "ace/mode/json_worker",
            "/ace/worker-json.js",
        );
        for (const [, url] of ace.config.setModuleUrl.mock.calls) {
            expect(url).toMatch(/^\/ace\/worker-[a-z]+\.js$/);
        }
    });

    it("starts the workers from their URL, not from a blob", () => {
        const ace = fakeAce();

        selfHostAceWorkers(ace);

        expect(ace.config.set).toHaveBeenCalledWith(
            "loadWorkerFromBlob",
            false,
        );
    });

    it("does nothing without Ace", () => {
        expect(() => selfHostAceWorkers(undefined)).not.toThrow();
    });
});

describe("withSelfHostedAce", () => {
    it("configures the global Ace and returns the module", () => {
        const ace = fakeAce();
        vi.stubGlobal("ace", ace);
        const mod = { Component: "component" };

        expect(withSelfHostedAce(mod)).toBe(mod);
        expect(ace.config.setModuleUrl).toHaveBeenCalled();

        vi.unstubAllGlobals();
    });
});
