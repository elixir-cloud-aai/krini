import type { LoginProvider, UserTier } from "./types";

/** Extracts group values from a claims object using the configured claim name. */
export function extractGroups(
    claims: Record<string, unknown> | null | undefined,
    claimName: string | undefined,
): string[] {
    if (!claims || !claimName) return [];
    const value = claims[claimName];
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === "string");
    }
    return [];
}

function groupMatches(
    claimValue: string,
    configured: string,
    separator: string | undefined,
): boolean {
    if (claimValue === configured) return true;
    return !!separator && claimValue.startsWith(`${configured}${separator}`);
}

/** Returns the configured group values present in the claim values. */
export function matchConfiguredGroups(
    claimValues: string[],
    configured: string[],
    separator: string | undefined,
): string[] {
    return configured.filter((g) =>
        claimValues.some((v) => groupMatches(v, g, separator)),
    );
}

/** Derives the access tier from the user's group values. */
export function deriveTier(
    claimValues: string[],
    provider: LoginProvider,
): UserTier {
    const sep = provider.groupSubgroupSeparator;
    if (
        matchConfiguredGroups(claimValues, provider.adminGroups, sep).length > 0
    ) {
        return "admin";
    }
    if (
        matchConfiguredGroups(claimValues, provider.computeGroups, sep).length >
        0
    ) {
        return "compute";
    }
    return "user";
}
