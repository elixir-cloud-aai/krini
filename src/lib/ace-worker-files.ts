/**
 * Files of the editor's workers, copied into `public/ace/` when the app is
 * built (`scripts/copy-ace-workers.ts`); see `src/lib/ace-workers.ts`
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { ACE_WORKERS } from "./ace-workers";

/**
 * Find a worker in the `ace-builds` that `@elixir-cloud/design` uses, so
 * that the workers match the version of the editor
 * @param worker Name of the worker, e.g. `json`
 * @returns The path of its minified file
 */
function aceWorkerSource(worker: string): string {
    const fromApp = createRequire(join(process.cwd(), "package.json"));
    // a file that the package exports without conditions: its main entry
    // is for `import` only
    const fromDesign = createRequire(
        fromApp.resolve("@elixir-cloud/design/custom-elements.json"),
    );
    return fromDesign.resolve(
        `ace-builds/src-min-noconflict/worker-${worker}.js`,
    );
}

/**
 * Copy the workers that Krini serves
 * @param target Directory to copy them to; created if missing
 */
function copyAceWorkers(target: string): void {
    mkdirSync(target, { recursive: true });
    for (const worker of ACE_WORKERS) {
        copyFileSync(
            aceWorkerSource(worker),
            join(target, `worker-${worker}.js`),
        );
    }
}

export { aceWorkerSource, copyAceWorkers };
