/**
 * @description the security headers of Krini's responses (see "Security
 * headers" in `docs/operator-guide/deployment.md`), and that the code
 * editor runs under the Content Security Policy with its workers from
 * Krini's origin; that no page breaks the policy is checked by the
 * fixtures, in every test
 */
import { expect, login, test } from "./fixtures";

/**
 * Split a policy into its directives
 * @param policy Value of a `Content-Security-Policy` header
 * @returns The sources of each directive, by name
 */
function directives(policy: string): Record<string, string[]> {
    return Object.fromEntries(
        policy.split(";").map((directive) => {
            const [name, ...sources] = directive.trim().split(/\s+/);
            return [name, sources];
        }),
    );
}

test("pages send the security headers", async ({ request }) => {
    for (const path of ["/auth/login", "/dashboard/workflows", "/privacy"]) {
        const response = await request.get(path);
        expect(response.status(), path).toBe(200);
        const headers = response.headers();

        const policy = directives(headers["content-security-policy"] ?? "");
        expect(policy["script-src"], path).toEqual([
            "'self'",
            expect.stringMatching(/^'nonce-[A-Za-z0-9+/]+=*'$/),
            "'strict-dynamic'",
        ]);
        expect(policy["frame-ancestors"], path).toEqual(["'none'"]);
        expect(policy["object-src"], path).toEqual(["'none'"]);
        expect(policy["base-uri"], path).toEqual(["'self'"]);
        expect(policy["worker-src"], path).toEqual(["'self'"]);
        expect(headers["x-content-type-options"], path).toBe("nosniff");
        expect(headers["x-frame-options"], path).toBe("DENY");
        expect(headers["referrer-policy"], path).toBe(
            "strict-origin-when-cross-origin",
        );
        expect(headers["strict-transport-security"], path).toBe(
            "max-age=63072000",
        );
        expect(headers["x-powered-by"], path).toBeUndefined();
    }
});

test("each page gets a new nonce, which its scripts carry", async ({
    page,
    request,
}) => {
    const nonce = async () =>
        /'nonce-([^']+)'/.exec(
            (await request.get("/auth/login")).headers()[
                "content-security-policy"
            ] ?? "",
        )?.[1];
    expect(await nonce()).not.toBe(await nonce());

    const response = await page.goto("/auth/login");
    const pageNonce = /'nonce-([^']+)'/.exec(
        (await response?.headerValue("content-security-policy")) ?? "",
    )?.[1];
    // the browser hides the attribute's value from the DOM, not from the
    // property
    const scriptNonces = await page
        .locator("script")
        .evaluateAll((scripts) =>
            scripts.map((script) => (script as HTMLScriptElement).nonce),
        );
    expect(scriptNonces.length).toBeGreaterThan(0);
    expect(new Set(scriptNonces)).toEqual(new Set([pageNonce]));
});

test("static files are sent with nosniff", async ({ request }) => {
    const response = await request.get("/ace/worker-json.js");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/javascript/);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
});

test("the code editor checks the syntax with a worker from Krini", async ({
    page,
    baseURL,
}) => {
    await login(page);
    await page.goto("/dashboard/workflows/create");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: /Mock WES/ }).click();

    // the editors of the workflow form have no syntax check (language
    // `text`); with JSON, the editor starts the JSON worker. The fixtures
    // fail the test on a policy violation or a request to the CDN
    const editor = page.locator("ecc-utils-design-code").first();
    await expect(editor).toBeAttached();
    const worker = page.waitForEvent("worker");
    const script = page.waitForResponse((response) =>
        response.url().endsWith("/ace/worker-json.js"),
    );
    await editor.evaluate((element) => {
        (element as HTMLElement & { language: string }).language = "json";
    });
    // Firefox reports the URL as the editor gave it, without the origin
    expect(new URL((await worker).url(), baseURL).href).toBe(
        `${baseURL}/ace/worker-json.js`,
    );
    expect((await script).status()).toBe(200);
});
