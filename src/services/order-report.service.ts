import {
    getOrderSummary,
    getOrderTimeseries,
    getTopProducts
} from "../repositories/order-report.repository";

import { AppError } from "../utils/app-error";

import type {
    DateRange,
    ReportBucket
} from "../utils/date-range";

const MAX_TOP_PRODUCTS = 100;

const roundMoney = (value: number): number =>
    Math.round(
        (value + Number.EPSILON) * 100
    ) / 100;

const parseLimit = (
    value: unknown,
    fallback: number
): number => {
    if (value === undefined) {
        return fallback;
    }

    if (
        typeof value !== "string" ||
        !/^\d+$/.test(value)
    ) {
        throw new AppError(
            "limit must be a positive integer",
            400
        );
    }

    const parsed = Number(value);

    if (parsed <= 0 || parsed > 100) {
        throw new AppError(
            `limit must be between 1 and ${MAX_TOP_PRODUCTS}`,
            400
        );
    }

    return parsed;
};

/**
 * Order summary for a range.
 *
 * grossSales counts confirmed orders only; averageOrderValue is the
 * gross sales divided by the number of confirmed orders (never by all
 * orders, which would understate the average).
 */
export const getOrderReportSummary = async (
    range: DateRange
) => {
    const summary = await getOrderSummary(
        range.start,
        range.endExclusive
    );

    const averageOrderValue =
        summary.confirmedOrders > 0
            ? roundMoney(
                summary.grossSales /
                summary.confirmedOrders
            )
            : 0;

    return {
        range: {
            from: range.from,
            to: range.to
        },
        ...summary,
        averageOrderValue
    };
};

export const getOrderReportTimeseries = async (
    range: DateRange,
    bucket: ReportBucket
) => {
    const points = await getOrderTimeseries(
        range.start,
        range.endExclusive,
        bucket
    );

    return {
        range: {
            from: range.from,
            to: range.to
        },
        bucket,
        points
    };
};

export const getOrderReportTopProducts = async (
    range: DateRange,
    limitRaw: unknown
) => {
    const limit = parseLimit(limitRaw, 10);

    const products = await getTopProducts(
        range.start,
        range.endExclusive,
        limit
    );

    return {
        range: {
            from: range.from,
            to: range.to
        },
        limit,
        products
    };
};
