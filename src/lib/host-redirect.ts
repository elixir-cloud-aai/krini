import type { NextRequest } from "next/server";
import { getAppOrigin } from "@/lib/oidc/providers";

/**
 * The host name of a `Host` header, lower case and without port or
 * trailing dot, or null if the header isn't a valid host
 * @param host The `Host` header
 * @returns The host name, or null
 */
function hostName(host: string): string | null {
    try {
        return new URL(`http://${host}`).hostname.replace(/\.$/, "");
    } catch {
        return null;
    }
}

/**
 * Whether a host name is an internal address, at which the platform's
 * health checks and other workloads reach the container: an IP address
 * (e.g., of the pod for Kubernetes' probes, or `127.0.0.1` for the image's
 * health check), a name without a dot (e.g., `localhost`, or a Kubernetes
 * Service, as for `helm test`) or a Kubernetes Service name
 * (`<service>.<namespace>.svc`, with or without the cluster domain)
 * @param name The host name, as `hostName()` returns it
 * @returns Whether it is an internal address
 */
function isInternal(name: string): boolean {
    return (
        !name.includes(".") ||
        name.startsWith("[") ||
        /^\d{1,3}(\.\d{1,3}){3}$/.test(name) ||
        /^[^.]+\.[^.]+\.svc(\.|$)/.test(name)
    );
}

/**
 * Where to redirect a request that reached Krini at another host than
 * that of `APP_ORIGIN` (e.g., an old address kept for existing links): the
 * same path and query at `APP_ORIGIN`. The login only works there, as its
 * state cookie is bound to the host and the login provider sends users
 * back to `APP_ORIGIN`. Requests to internal addresses (health checks) and
 * without a `Host` header are left alone, and `REDIRECT_TO_APP_ORIGIN=false`
 * switches the redirect off
 * @param request The request
 * @returns The URL to redirect to, or null to serve the request
 */
export function hostRedirect(request: NextRequest): URL | null {
    if (process.env.REDIRECT_TO_APP_ORIGIN?.trim().toLowerCase() === "false") {
        return null;
    }
    const appOrigin = getAppOrigin();
    const host = request.headers.get("host");
    if (!appOrigin || !host) return null;

    const name = hostName(host);
    const target = new URL(appOrigin);
    if (!name || name === target.hostname || isInternal(name)) return null;

    target.pathname = request.nextUrl.pathname;
    target.search = request.nextUrl.search;
    return target;
}
