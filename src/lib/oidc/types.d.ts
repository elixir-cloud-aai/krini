export type LoginProvider = {
    id: string;
    name: string;
    logo?: string;
    issuer: string;
    clientId: string;
    clientSecret: string;
    scopes: string[];

    groupsClaim?: string;
    /** Read the groups claim from the userinfo endpoint (access token) instead of the ID token. */
    groupsFromUserinfo: boolean;
    /** Configured group values granting compute access. */
    computeGroups: string[];
    /** Configured group values granting admin access. */
    adminGroups: string[];
    groupSubgroupSeparator?: string;
};

/** Provider fields that are safe to send to the browser (no secrets). */
export type PublicProviderInfo = {
    id: string;
    name: string;
    logo?: string;
};

export type OidcEndpoints = {
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userinfoEndpoint?: string;
    jwksUri?: string;
    endSessionEndpoint?: string;
    /** Token revocation (RFC 7009), if the provider advertises it */
    revocationEndpoint?: string;
};

export type LoginTransaction = {
    state: string;
    nonce: string;
    codeVerifier: string;
    providerId: string;
};

export type UserTier = "admin" | "compute" | "user";

export type UserSession = {
    user: Record<string, unknown>;
    groups: string[];
    tier: UserTier;
};
