import {
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    statSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { aceWorkerSource, copyAceWorkers } from "./ace-worker-files";
import { ACE_WORKERS } from "./ace-workers";

/**
 * Find the workers of the editor modes that `@elixir-cloud/design` imports
 * @returns The names of the workers, e.g. `json`
 */
function workersOfDesignModes(): string[] {
    const fromApp = createRequire(join(process.cwd(), "package.json"));
    const manifest = fromApp.resolve(
        "@elixir-cloud/design/custom-elements.json",
    );
    const fromDesign = createRequire(manifest);
    const chunks = join(dirname(manifest), "chunks");
    const modes = new Set<string>();
    for (const file of readdirSync(chunks)) {
        const code = readFileSync(join(chunks, file), "utf8");
        for (const match of code.matchAll(
            /ace-builds\/src-noconflict\/(mode-[\w-]+\.js)/g,
        )) {
            modes.add(match[1]);
        }
    }
    const workers = new Set<string>();
    for (const mode of modes) {
        const code = readFileSync(
            fromDesign.resolve(`ace-builds/src-noconflict/${mode}`),
            "utf8",
        );
        for (const match of code.matchAll(/"ace\/mode\/(\w+)_worker"/g)) {
            workers.add(match[1]);
        }
    }
    return [...workers].sort();
}

describe("aceWorkerSource", () => {
    it("finds every worker in the Ace of the Cloud Components", () => {
        for (const worker of ACE_WORKERS) {
            expect(statSync(aceWorkerSource(worker)).size).toBeGreaterThan(0);
        }
    });
});

describe("ACE_WORKERS", () => {
    it("are the workers of the modes that the Cloud Components load", () => {
        expect([...ACE_WORKERS].sort()).toEqual(workersOfDesignModes());
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
