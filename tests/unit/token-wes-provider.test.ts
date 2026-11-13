import type { RunRequest } from "@elixir-cloud/wes/providers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TokenWesProvider } from "@/lib/token-wes-provider";

const BASE_URL = "https://wes.example.org/ga4gh/wes/v1";

function respond(status: number) {
    return new Response(JSON.stringify({ runs: [] }), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function setup(statuses: number[], renewed = true) {
    const fetchMock = vi.fn(
        async (_input: RequestInfo | URL, _init?: RequestInit) =>
            respond(statuses.shift() ?? 200),
    );
    vi.stubGlobal("fetch", fetchMock);

    let token = "first";
    const renew = vi.fn(async () => {
        token = "second";
        return renewed;
    });
    const onUnauthorized = vi.fn();
    const provider = new TokenWesProvider(BASE_URL, {
        getToken: async () => token,
        renew,
        onUnauthorized,
    });

    const authorization = () =>
        fetchMock.mock.calls.map(([, init]) =>
            new Headers(init?.headers).get("Authorization"),
        );

    return { provider, fetchMock, renew, onUnauthorized, authorization };
}

describe("TokenWesProvider", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("adds the token to each request", async () => {
        const { provider, renew, authorization } = setup([200]);

        await provider.listRuns();

        expect(authorization()).toEqual(["Bearer first"]);
        expect(renew).not.toHaveBeenCalled();
    });

    it("renews once and retries once after a 401", async () => {
        const { provider, fetchMock, renew, onUnauthorized, authorization } =
            setup([401, 200]);

        await provider.listRuns();

        expect(renew).toHaveBeenCalledOnce();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(authorization()).toEqual(["Bearer first", "Bearer second"]);
        expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it("reports a rejected token if the retry is rejected too", async () => {
        const { provider, fetchMock, renew, onUnauthorized } = setup([
            401, 401, 401,
        ]);

        await expect(provider.listRuns()).rejects.toThrow();

        expect(renew).toHaveBeenCalledOnce();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(onUnauthorized).toHaveBeenCalledExactlyOnceWith(
            "token-rejected",
        );
    });

    it("reports an expired session if it can't be renewed", async () => {
        const { provider, fetchMock, onUnauthorized } = setup([401], false);

        await expect(provider.listRuns()).rejects.toThrow();

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(onUnauthorized).toHaveBeenCalledExactlyOnceWith(
            "session-expired",
        );
    });

    it("sends the form body again on the retry", async () => {
        const { provider, fetchMock } = setup([401, 200]);

        const request: RunRequest = {
            workflow_params: {},
            workflow_url: "https://example.org/workflow.cwl",
            workflow_type: "CWL",
            workflow_type_version: "v1.2",
        };

        await expect(provider.runWorkflow(request)).resolves.toBeDefined();

        const bodies = fetchMock.mock.calls.map(([, init]) => init?.body);
        expect(bodies).toHaveLength(2);
        for (const body of bodies) {
            expect(body).toBeInstanceOf(FormData);
            expect((body as FormData).get("workflow_url")).toBe(
                request.workflow_url,
            );
            expect((body as FormData).get("workflow_type")).toBe("CWL");
        }
    });
});
