import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { aceWorkerSource, copyAceWorkers } from "./ace-worker-files";
import { ACE_WORKERS } from "./ace-workers";

describe("aceWorkerSource", () => {
    it("finds every worker in the Ace of the Cloud Components", () => {
        for (const worker of ACE_WORKERS) {
            expect(existsSync(aceWorkerSource(worker))).toBe(true);
        }
    });
});

describe("copyAceWorkers", () => {
    // inside the checkout, not in the system's temporary directory
    let target: string | undefined;

    afterEach(() => {
        if (target) rmSync(target, { recursive: true });
        target = undefined;
    });

    it("copies exactly the workers that Krini serves", () => {
        target = mkdtempSync(join(process.cwd(), ".ace-test-"));

        copyAceWorkers(join(target, "ace"));

        expect(readdirSync(join(target, "ace")).sort()).toEqual(
            ACE_WORKERS.map((worker) => `worker-${worker}.js`).sort(),
        );
    });
});
