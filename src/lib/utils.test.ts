import { describe, expect, it } from "vitest";
import { cn, formatDate, STATE_LABELS } from "./utils";

describe("formatDate", () => {
    it("formats dates in UTC", () => {
        expect(formatDate("2026-11-12T23:30:00Z")).toBe("Nov 12, 2026");
    });

    it("returns values that aren't dates unchanged", () => {
        expect(formatDate("not a date")).toBe("not a date");
    });
});

describe("STATE_LABELS", () => {
    it("labels the run states", () => {
        expect(STATE_LABELS.EXECUTOR_ERROR).toBe("Executor errors");
        expect(STATE_LABELS.CANCELING).toBe("Canceling");
    });
});

describe("cn", () => {
    it("joins class names", () => {
        expect(cn("a", false, "b")).toBe("a b");
    });
});
