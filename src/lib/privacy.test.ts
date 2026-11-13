import { describe, expect, it, vi } from "vitest";
import { privacySettings } from "./privacy";

describe("privacySettings", () => {
    it("reads the settings of the deployment", () => {
        expect(
            privacySettings({
                PRIVACY_CONTROLLER: "  Example Institute, Example Street 1  ",
                PRIVACY_CONTACT: "privacy@example.org",
                PRIVACY_NOTICE_URL: "https://example.org/privacy",
                PRIVACY_LOGIN_NOTICE_URL: "https://login.example.org/privacy",
            }),
        ).toEqual({
            controller: "Example Institute, Example Street 1",
            contact: {
                href: "mailto:privacy@example.org",
                label: "privacy@example.org",
            },
            noticeUrl: "https://example.org/privacy",
            loginNoticeUrl: "https://login.example.org/privacy",
        });
    });

    it("accepts a contact page", () => {
        expect(
            privacySettings({ PRIVACY_CONTACT: "https://example.org/contact" })
                .contact,
        ).toEqual({
            href: "https://example.org/contact",
            label: "https://example.org/contact",
        });
    });

    it("has nothing without settings", () => {
        expect(privacySettings({})).toEqual({
            controller: null,
            contact: null,
            noticeUrl: null,
            loginNoticeUrl: null,
        });
        expect(
            privacySettings({
                PRIVACY_CONTROLLER: " ",
                PRIVACY_CONTACT: "",
            }),
        ).toMatchObject({ controller: null, contact: null });
    });

    it.each([
        "javascript:alert(1)",
        "http://example.org/contact",
        "not a contact",
        "a@b@example.org",
        "privacy@example..org",
        "privacy@.example.org",
        "privacy@example.org.",
    ])("ignores the contact %s with a warning", (value) => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        expect(privacySettings({ PRIVACY_CONTACT: value }).contact).toBeNull();
        expect(warn).toHaveBeenCalledWith(
            "PRIVACY_CONTACT is neither an email address nor an https URL; it is ignored",
        );
    });

    it.each([
        "http://example.org/privacy",
        "javascript:alert(1)",
        "/privacy",
        "https://user@example.org/privacy",
    ])("ignores the notice URL %s with a warning", (value) => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const settings = privacySettings({
            PRIVACY_NOTICE_URL: value,
            PRIVACY_LOGIN_NOTICE_URL: value,
        });
        expect(settings.noticeUrl).toBeNull();
        expect(settings.loginNoticeUrl).toBeNull();
        expect(warn.mock.calls).toEqual([
            ["PRIVACY_NOTICE_URL is not an https URL; it is ignored"],
            ["PRIVACY_LOGIN_NOTICE_URL is not an https URL; it is ignored"],
        ]);
    });

    it("reads the environment by default", () => {
        vi.stubEnv("PRIVACY_CONTROLLER", "Example Institute");
        expect(privacySettings().controller).toBe("Example Institute");
    });
});
