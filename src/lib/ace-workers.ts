/**
 * Self-hosted workers of the code editor
 *
 * The code editor of the Cloud Components (Ace, in `@elixir-cloud/design`)
 * checks the syntax in web workers, which it would load from
 * `cdn.jsdelivr.net`. Krini serves them itself, from `public/ace/` (copied
 * from `ace-builds` when the app is built, `scripts/copy-ace-workers.ts`),
 * so that no script comes from another origin (see the Content Security
 * Policy in `src/lib/security-headers.ts`).
 */

/** Workers of the editor's languages (`WorkerClient` in the modes of
 * `ace-builds`): those of the modes that `@elixir-cloud/design` loads */
const ACE_WORKERS = ["css", "html", "javascript", "json", "xml", "yaml"];

/** Path at which Krini serves the workers */
const ACE_WORKER_PATH = "/ace";

/** The part of the global `ace` of `ace-builds` that is configured here */
type AceGlobal = {
    config: {
        set: (key: string, value: unknown) => void;
        setModuleUrl: (name: string, url: string) => void;
    };
};

/**
 * Load the editor's workers from Krini's origin
 *
 * A module URL takes precedence over the `workerPath` that the editor sets
 * to the CDN; workers start from their URL, not from a `blob:` URL, so that
 * `worker-src 'self'` allows them.
 * @param ace The global `ace`; nothing happens without it
 */
function selfHostAceWorkers(ace: AceGlobal | undefined): void {
    if (!ace) return;
    ace.config.set("loadWorkerFromBlob", false);
    for (const worker of ACE_WORKERS) {
        ace.config.setModuleUrl(
            `ace/mode/${worker}_worker`,
            `${ACE_WORKER_PATH}/worker-${worker}.js`,
        );
    }
}

/**
 * Configure the editor's workers once a module of the Cloud Components is
 * loaded, which sets the global `ace`; for the `then` of their dynamic
 * imports, before any editor starts
 * @param mod The loaded module
 * @returns The module
 */
function withSelfHostedAce<T>(mod: T): T {
    selfHostAceWorkers((globalThis as { ace?: AceGlobal }).ace);
    return mod;
}

export { ACE_WORKER_PATH, ACE_WORKERS, selfHostAceWorkers, withSelfHostedAce };
