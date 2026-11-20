/**
 * @description requests at another host than that of `APP_ORIGIN` (e.g.,
 * an old address of the deployment) are redirected to `APP_ORIGIN`, where
 * the login works; the host of `APP_ORIGIN` is served as is
 */
import { expect, test } from "./fixtures";
import { appURL } from "./settings";

test("other hosts are redirected to APP_ORIGIN", async ({ request }) => {
    const response = await request.get("/auth/login?next=%2Fdashboard", {
        headers: { host: "old.example.org" },
        maxRedirects: 0,
    });
    expect(response.status()).toBe(308);
    // absolute for the image, which listens at 0.0.0.0; relative for the
    // build of the checkout, which listens at the address of APP_ORIGIN, as
    // Next.js relativizes redirects to its own address (see "Several
    // addresses" in docs/operator-guide/deployment.md)
    expect(response.headers().location).toMatch(
        new RegExp(`^(${appURL})?/auth/login\\?next=%2Fdashboard$`),
    );
});

test("the host of APP_ORIGIN is served", async ({ request }) => {
    const response = await request.get("/auth/login", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
});
