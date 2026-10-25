import { AppError } from "./app-error";

/**
 * Normalised, inclusive date range used by reporting endpoints.
 *
 * `from`/`to` are the calendar dates requested by the client, while
 * `start`/`endExclusive` are the bound values used in SQL (`created_at`
 * must satisfy `>= start` and `< endExclusive`). The exclusive upper
 * bound avoids the classic "missing the last day" bug.
 */
export interface DateRange {
    from: string;
    to: string;
    start: string;
    endExclusive: string;
}

export type ReportBucket = "day" | "month";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseDate = (value: string): Date => {
    const [year, month, day] = value
        .split("-")
        .map(Number);

    const date = new Date(
        Date.UTC(year, month - 1, day)
    );

    if (
        Number.isNaN(date.getTime()) ||
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        throw new AppError(
            `Invalid date: ${value}`,
            400
        );
    }

    return date;
};

const formatDate = (date: Date): string =>
    date.toISOString().slice(0, 10);

const addDays = (
    value: string,
    days: number
): string => {
    const date = parseDate(value);

    date.setUTCDate(
        date.getUTCDate() + days
    );

    return formatDate(date);
};

const readDateParam = (
    value: unknown,
    field: string
): string | undefined => {
    if (value === undefined) {
        return undefined;
    }

    if (
        typeof value !== "string" ||
        !DATE_PATTERN.test(value.trim())
    ) {
        throw new AppError(
            `${field} must be a date in YYYY-MM-DD format`,
            400
        );
    }

    return value.trim();
};

/**
 * Parse and validate the `from`/`to` query parameters.
 *
 * When omitted they default to the last `defaultDays` days (inclusive
 * of today). Dates are treated as calendar days in the database's own
 * time zone so the boundaries line up with stored `created_at` values.
 */
export const parseDateRange = (
    fromRaw: unknown,
    toRaw: unknown,
    defaultDays = 30
): DateRange => {
    const today = formatDate(new Date());

    const to =
        readDateParam(toRaw, "to") ?? today;

    const from =
        readDateParam(fromRaw, "from") ??
        addDays(to, -(defaultDays - 1));

    if (
        parseDate(from).getTime() >
        parseDate(to).getTime()
    ) {
        throw new AppError(
            "from must be earlier than or equal to to",
            400
        );
    }

    return {
        from,
        to,
        start: `${from} 00:00:00`,
        endExclusive: `${addDays(to, 1)} 00:00:00`
    };
};

export const parseBucket = (
    value: unknown
): ReportBucket => {
    if (value === undefined) {
        return "day";
    }

    if (value === "day" || value === "month") {
        return value;
    }

    throw new AppError(
        "bucket must be either day or month",
        400
    );
};
