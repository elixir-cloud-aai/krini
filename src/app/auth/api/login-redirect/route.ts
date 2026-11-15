import { NextResponse } from "next/server";
import {
    createLoginTransaction,
    getEndpoints,
    getLoginProviders,
    getProviderById,
    getRedirectUri,
    pkceChallenge,
} from "@/lib/oidc";

export async function GET(request: Request) {
    const providers = getLoginProviders();
    const redirectUri = getRedirectUri();

    if (providers.length === 0 || !redirectUri) {
        return NextResponse.json(
            { error: "Login providers are not configured" },
            { status: 500 },
        );
    }

    const providerId = new URL(request.url).searchParams.get("provider");
    const provider = providerId
        ? getProviderById(providerId)
        : providers.length === 1
          ? providers[0]
          : undefined;

    if (!provider) {
        return NextResponse.json(
            { error: "Unknown login provider" },
            { status: 400 },
        );
    }

    const endpoints = await getEndpoints(provider);

    if (!endpoints) {
        return NextResponse.json(
            { error: "Could not discover the OIDC provider configuration" },
            { status: 500 },
        );
    }

    const { state, nonce, codeVerifier } = createLoginTransaction(provider.id);

    const authorizeUrl = new URL(endpoints.authorizationEndpoint);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", provider.clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", provider.scopes.join(" "));
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("nonce", nonce);
    authorizeUrl.searchParams.set(
        "code_challenge",
        pkceChallenge(codeVerifier),
    );
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    const response = NextResponse.redirect(authorizeUrl);

    response.cookies.set(
        `authState-${state}`,
        JSON.stringify({ state, nonce, codeVerifier, providerId: provider.id }),
        {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 10,
            path: "/",
        },
    );

    return response;
}
