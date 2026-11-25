/**
 * Validation of Krini's settings at server start
 *
 * Krini reads its settings at runtime; `validateSettings` checks them as
 * a whole so that a first deployment fails fast with the reason, instead
 * of showing errors page by page. Problems are reported without secrets:
 * a provider is named by its `id`, never by its `clientSecret`.
 */
import { getLoginProviders } from "./oidc/providers";

export type SettingsProblem = {
    setting: string;
    problem: string;
};

export type SettingsReport = {
    fatal: SettingsProblem[];
    warnings: SettingsProblem[];
};

const REQUIRED_PROVIDER_FIELDS = [
    "id",
    "issuer",
    "clientId",
    "clientSecret",
] as const;

function isHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

function loginProviderProblems(): SettingsProblem[] {
    const raw = process.env.LOGIN_PROVIDERS;
    const problems: SettingsProblem[] = [];

    if (!raw) {
        return [
            {
                setting: "LOGIN_PROVIDERS",
                problem: "is not set",
            },
        ];
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return [
            {
                setting: "LOGIN_PROVIDERS",
                problem: "is not valid JSON",
            },
        ];
    }

    if (!Array.isArray(parsed)) {
        return [
            {
                setting: "LOGIN_PROVIDERS",
                problem: "is not a JSON array",
            },
        ];
    }

    if (parsed.length === 0) {
        problems.push({
            setting: "LOGIN_PROVIDERS",
            problem: "is an empty array: no login provider is configured",
        });
    }

    const seen = new Set<string>();
    parsed.forEach((entry, index) => {
        const where =
            typeof entry === "object" &&
            entry !== null &&
            typeof (entry as Record<string, unknown>).id === "string" &&
            (entry as Record<string, unknown>).id !== ""
                ? `entry "${(entry as Record<string, unknown>).id}"`
                : `entry ${index + 1}`;

        if (
            typeof entry !== "object" ||
            entry === null ||
            Array.isArray(entry)
        ) {
            problems.push({
                setting: "LOGIN_PROVIDERS",
                problem: `${where} is not an object`,
            });
            return;
        }

        const record = entry as Record<string, unknown>;
        for (const field of REQUIRED_PROVIDER_FIELDS) {
            const value = record[field];
            if (typeof value !== "string" || value === "") {
                problems.push({
                    setting: "LOGIN_PROVIDERS",
                    problem: `${where} has no ${field}`,
                });
            }
        }

        const id = record.id;
        if (typeof id === "string" && id !== "") {
            if (seen.has(id)) {
                problems.push({
                    setting: "LOGIN_PROVIDERS",
                    problem: `entry "${id}" has a duplicate id`,
                });
            }
            seen.add(id);
        }
    });

    if (getLoginProviders().length === 0 && parsed.length > 0) {
        problems.push({
            setting: "LOGIN_PROVIDERS",
            problem: "has no valid provider",
        });
    }

    return problems;
}

export function validateSettings(): SettingsReport {
    const fatal: SettingsProblem[] = [];
    const warnings: SettingsProblem[] = [];

    fatal.push(...loginProviderProblems());

    const appOrigin = process.env.APP_ORIGIN;
    if (!appOrigin) {
        fatal.push({ setting: "APP_ORIGIN", problem: "is not set" });
    } else if (!isHttpUrl(appOrigin)) {
        fatal.push({
            setting: "APP_ORIGIN",
            problem: "is not a valid http(s) URL",
        });
    }

    const registryUrl = process.env.CLOUD_REGISTRY_URL;
    if (!registryUrl) {
        fatal.push({
            setting: "CLOUD_REGISTRY_URL",
            problem: "is not set",
        });
    } else if (!isHttpUrl(registryUrl)) {
        fatal.push({
            setting: "CLOUD_REGISTRY_URL",
            problem: "is not a valid URL",
        });
    }

    const redirectUri = process.env.OIDC_REDIRECT_URI;
    if (redirectUri) {
        try {
            const callback = new URL(redirectUri);
            const app = appOrigin ? new URL(appOrigin) : null;
            if (
                (callback.protocol !== "http:" &&
                    callback.protocol !== "https:") ||
                (app && callback.origin !== app.origin)
            ) {
                fatal.push({
                    setting: "OIDC_REDIRECT_URI",
                    problem:
                        "must be an http(s) URL on the origin of APP_ORIGIN",
                });
            }
        } catch {
            fatal.push({
                setting: "OIDC_REDIRECT_URI",
                problem: "is not a valid URL",
            });
        }
    }

    const accessRequest = process.env.COMPUTE_ACCESS_REQUEST_URL;
    if (accessRequest && !isHttpUrl(accessRequest)) {
        warnings.push({
            setting: "COMPUTE_ACCESS_REQUEST_URL",
            problem: "is not a valid http(s) URL; the link is ignored",
        });
    }

    const providers = getLoginProviders();
    if (
        providers.length > 0 &&
        providers.every(
            (p) => p.computeGroups.length === 0 && p.adminGroups.length === 0,
        )
    ) {
        warnings.push({
            setting: "LOGIN_PROVIDERS",
            problem:
                "no provider has computeGroups or adminGroups: nobody can run tasks or workflows",
        });
    }

    return { fatal, warnings };
}

export function enforceSettings(): void {
    const { fatal, warnings } = validateSettings();

    for (const { setting, problem } of warnings) {
        console.warn(`Krini settings: ${setting} ${problem}`);
    }
    for (const { setting, problem } of fatal) {
        console.error(`Krini settings: ${setting} ${problem}`);
    }

    if (fatal.length > 0) {
        console.error(
            "Krini settings: refusing to start; fix the settings above (see docs/operator-guide/configuration.md)",
        );
        process.exit(1);
    }
}
