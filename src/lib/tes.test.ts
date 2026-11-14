import { describe, expect, it } from "vitest";
import { tesBaseUrl } from "@/lib/tes";

describe("tesBaseUrl", () => {
    it.each([
        "https://tes.example.org/ga4gh/tes/v1",
        "https://tes.example.org/ga4gh/tes/v1/",
        "https://tes.example.org",
        "https://tes.example.org/",
    ])("returns the TES API URL once for %s", (url) => {
        expect(tesBaseUrl(url)).toBe("https://tes.example.org/ga4gh/tes/v1");
    });

    it("keeps a path prefix", () => {
        expect(tesBaseUrl("https://example.org/proxy/ga4gh/tes/v1")).toBe(
            "https://example.org/proxy/ga4gh/tes/v1",
        );
    });
});
