/**
 * Provider-agnostic OpenID Connect helpers.
 *
 * Login providers are configured in the `LOGIN_PROVIDERS` environment
 * variable as a JSON array; endpoints are discovered via each issuer's
 * `.well-known/openid-configuration` document. Nothing here is specific to
 * any particular identity provider.
 */

export * from "./discovery";
export * from "./groups";
export * from "./id-token";
export * from "./pkce";
export * from "./providers";
export * from "./session";
export type * from "./types";
