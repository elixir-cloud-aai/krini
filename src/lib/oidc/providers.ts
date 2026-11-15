import type { LoginProvider, PublicProviderInfo } from "./types";

const DEFAULT_SCOPES = ["openid", "profile", "email", "offline_access"];

function asString(value: unknown): string | undefined {
    return typeof value === "string" && value !== "" ? value : undefined;
}

function asStringList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === "string" && v !== "");
}

function normalizeProvider(raw: unknown): LoginProvider | null {
    if (typeof raw !== "object" || raw === null) return null;
    const p = raw as Record<string, unknown>;
    const id = asString(p.id);
    const issuer = asString(p.issuer);
    const clientId = asString(p.clientId);
    const clientSecret = asString(p.clientSecret);
    if (!id || !issuer || !clientId || !clientSecret) return null;

    const scopes = asStringList(p.scopes);
    return {
        id,
        name: asString(p.name) ?? id,
        logo: asString(p.logo),
        issuer: issuer.replace(/\/+$/, ""),
        clientId,
        clientSecret,
        scopes: scopes.length > 0 ? scopes : DEFAULT_SCOPES,
        groupsClaim: asString(p.groupsClaim),
        groupsFromUserinfo: p.groupsFromUserinfo !== false,
        computeGroups: asStringList(p.computeGroups),
        adminGroups: asStringList(p.adminGroups),
        groupSubgroupSeparator: asString(p.groupSubgroupSeparator),
    };
}

/**
 * Parses the `LOGIN_PROVIDERS` environment variable: a JSON array of login
 * provider configurations. Returns an empty list when unset or invalid.
 */
export function getLoginProviders(): LoginProvider[] {
    const raw = process.env.LOGIN_PROVIDERS;
    if (!raw) return [];

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return [];
    }
    if (!Array.isArray(parsed)) return [];

    const providers = parsed
        .map(normalizeProvider)
        .filter((p): p is LoginProvider => p !== null);

    // Duplicate ids would make provider selection ambiguous; keep the first.
    const seen = new Set<string>();
    return providers.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
    });
}

/** Providers without their secrets, safe to render in the browser. */
export function getPublicProviders(): PublicProviderInfo[] {
    return getLoginProviders().map(({ id, name, logo }) => ({
        id,
        name,
        logo,
    }));
}

export function getProviderById(id: string): LoginProvider | undefined {
    return getLoginProviders().find((p) => p.id === id);
}

/**
 * Finds the provider of a session: by the `oidc_provider` cookie set at
 * login, or by matching the ID token's `iss` claim. When both are present
 * they must agree — the cookie is only a hint, and a mismatch means it does
 * not describe this session (reject rather than risk sending the session's
 * tokens to another provider's endpoints).
 */
export function getSessionProvider(
    providerId: string | undefined,
    idTokenPayload: Record<string, unknown> | null,
): LoginProvider | undefined {
    const providers = getLoginProviders();
    const iss = asString(idTokenPayload?.iss)?.replace(/\/+$/, "");
    if (providerId) {
        const byId = providers.find((p) => p.id === providerId);
        if (byId) {
            if (iss && byId.issuer !== iss) return undefined;
            return byId;
        }
    }
    if (iss) return providers.find((p) => p.issuer === iss);
    return providers.length === 1 ? providers[0] : undefined;
}

export function getAppOrigin(): string | null {
    const origin = process.env.APP_ORIGIN;
    if (!origin) return null;
    try {
        return new URL(origin).origin;
    } catch {
        return null;
    }
}

/** The callback URL; `OIDC_REDIRECT_URI` overrides the APP_ORIGIN default. */
export function getRedirectUri(): string | null {
    const configured = process.env.OIDC_REDIRECT_URI;
    if (configured) return configured;
    const origin = getAppOrigin();
    return origin ? `${origin}/auth/api/callback` : null;
}
