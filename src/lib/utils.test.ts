import { describe, expect, it } from "vitest";
import { contactHref, formatDate, linkHref } from "./utils";

describe("formatDate", () => {
    it("formats dates in UTC", () => {
        expect(formatDate("2026-11-12T23:30:00Z")).toBe("Nov 12, 2026");
    });

    it("returns values that aren't dates unchanged", () => {
        expect(formatDate("not a date")).toBe("not a date");
    });
});

describe("linkHref", () => {
    it.each([
        "https://example.org/docs",
        "http://example.org/docs",
        "mailto:admin@example.org",
    ])("allows the link %s", (value) => {
        expect(linkHref(value)).toBe(value);
    });

    it.each([
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "ftp://example.org/file",
        "file:///etc/passwd",
        "not a url",
        "",
    ])("rejects %s", (value) => {
        expect(linkHref(value)).toBeUndefined();
    });

    it("turns a bare email address into a mailto link", () => {
        expect(linkHref("admin@example.org")).toBe("mailto:admin@example.org");
        expect(linkHref("  admin@example.org  ")).toBe(
            "mailto:admin@example.org",
        );
    });

    it("rejects a missing value", () => {
        expect(linkHref(undefined)).toBeUndefined();
    });
});

describe("contactHref", () => {
    it("prefers contactUrl of WES 1.1 and service-info", () => {
        expect(
            contactHref({
                contactUrl: "https://example.org/contact",
                contact_info_url: "https://example.org/old-contact",
            }),
        ).toBe("https://example.org/contact");
    });

    it("falls back to contact_info_url of WES 1.0", () => {
        expect(
            contactHref({ contact_info_url: "mailto:admin@example.org" }),
        ).toBe("mailto:admin@example.org");
    });

    it("falls back when contactUrl is empty", () => {
        expect(
            contactHref({
                contactUrl: "",
                contact_info_url: "https://example.org/contact",
            }),
        ).toBe("https://example.org/contact");
    });

    it("returns undefined without a contact link", () => {
        expect(contactHref({})).toBeUndefined();
    });
});
