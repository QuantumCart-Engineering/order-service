import {
    parseBucket,
    parseDateRange
} from "../../utils/date-range";

import { AppError } from "../../utils/app-error";

describe("parseDateRange", () => {

    it("returns an inclusive range with an exclusive SQL upper bound", () => {
        const range = parseDateRange(
            "2026-03-01",
            "2026-03-31"
        );

        expect(range).toEqual({
            from: "2026-03-01",
            to: "2026-03-31",
            start: "2026-03-01 00:00:00",
            endExclusive: "2026-04-01 00:00:00"
        });
    });

    it("handles month and year rollover", () => {
        const range = parseDateRange(
            "2026-12-31",
            "2026-12-31"
        );

        expect(range.endExclusive).toBe(
            "2027-01-01 00:00:00"
        );
    });

    it("accepts a single day range", () => {
        const range = parseDateRange(
            "2026-02-28",
            "2026-02-28"
        );

        expect(range.from).toBe("2026-02-28");
        expect(range.to).toBe("2026-02-28");
        expect(range.endExclusive).toBe(
            "2026-03-01 00:00:00"
        );
    });

    it("defaults to the last 30 days ending today", () => {
        const range = parseDateRange(undefined, undefined);

        expect(range.to).toBe(
            new Date().toISOString().slice(0, 10)
        );

        expect(
            new Date(`${range.from}T00:00:00Z`).getTime()
        ).toBeLessThan(
            new Date(`${range.to}T00:00:00Z`).getTime()
        );
    });

    it("defaults the from date when only to is provided", () => {
        const range = parseDateRange(
            undefined,
            "2026-05-10"
        );

        expect(range.to).toBe("2026-05-10");
        expect(range.from).toBe("2026-04-11");
    });

    it("rejects malformed dates", () => {
        expect(() =>
            parseDateRange("03/01/2026", undefined)
        ).toThrow(AppError);

        expect(() =>
            parseDateRange("2026-13-01", undefined)
        ).toThrow(AppError);

        expect(() =>
            parseDateRange("2026-02-30", undefined)
        ).toThrow(AppError);
    });

    it("rejects a from date after the to date", () => {
        expect(() =>
            parseDateRange("2026-06-02", "2026-06-01")
        ).toThrow(AppError);
    });
});

describe("parseBucket", () => {

    it("defaults to day", () => {
        expect(parseBucket(undefined)).toBe("day");
    });

    it("accepts day and month", () => {
        expect(parseBucket("day")).toBe("day");
        expect(parseBucket("month")).toBe("month");
    });

    it("rejects unknown buckets", () => {
        expect(() => parseBucket("week")).toThrow(
            AppError
        );
    });
});
