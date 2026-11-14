import { createHash, randomBytes } from "node:crypto";
import type { LoginTransaction } from "./types";

function base64url(buf: Buffer): string {
    return buf.toString("base64url");
}

export function createLoginTransaction(providerId: string): LoginTransaction {
    const state = base64url(randomBytes(16));
    const nonce = base64url(randomBytes(16));
    const codeVerifier = base64url(randomBytes(32));
    return { state, nonce, codeVerifier, providerId };
}

export function pkceChallenge(codeVerifier: string): string {
    return createHash("sha256").update(codeVerifier).digest("base64url");
}
