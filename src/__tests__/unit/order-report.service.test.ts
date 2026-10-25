jest.mock(
    "../../repositories/order-report.repository"
);

import {
    getOrderSummary,
    getOrderTimeseries,
    getTopProducts
} from "../../repositories/order-report.repository";

import {
    getOrderReportSummary,
    getOrderReportTimeseries,
    getOrderReportTopProducts
} from "../../services/order-report.service";

import { AppError } from "../../utils/app-error";

import type { DateRange } from "../../utils/date-range";

const mockedGetOrderSummary = jest.mocked(
    getOrderSummary
);

const mockedGetOrderTimeseries = jest.mocked(
    getOrderTimeseries
);

const mockedGetTopProducts = jest.mocked(
    getTopProducts
);

const range: DateRange = {
    from: "2026-03-01",
    to: "2026-03-31",
    start: "2026-03-01 00:00:00",
    endExclusive: "2026-04-01 00:00:00"
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe("getOrderReportSummary", () => {

    it("computes the average order value from confirmed orders", async () => {
        mockedGetOrderSummary.mockResolvedValue({
            totalOrders: 10,
            pendingPaymentOrders: 2,
            confirmedOrders: 8,
            cancelledOrders: 0,
            grossSales: 7999.99,
            pendingValue: 1000,
            cancelledValue: 0
        });

        const result = await getOrderReportSummary(range);

        expect(mockedGetOrderSummary).toHaveBeenCalledWith(
            range.start,
            range.endExclusive
        );

        expect(result.averageOrderValue).toBe(
            Math.round(
                (7999.99 / 8 + Number.EPSILON) * 100
            ) / 100
        );

        expect(result.range).toEqual({
            from: "2026-03-01",
            to: "2026-03-31"
        });

        expect(result.grossSales).toBe(7999.99);
    });

    it("returns a zero average when there are no confirmed orders", async () => {
        mockedGetOrderSummary.mockResolvedValue({
            totalOrders: 3,
            pendingPaymentOrders: 3,
            confirmedOrders: 0,
            cancelledOrders: 0,
            grossSales: 0,
            pendingValue: 1500,
            cancelledValue: 0
        });

        const result = await getOrderReportSummary(range);

        expect(result.averageOrderValue).toBe(0);
    });
});

describe("getOrderReportTimeseries", () => {

    it("passes the bucket through and echoes the range", async () => {
        mockedGetOrderTimeseries.mockResolvedValue([
            {
                period: "2026-03",
                orders: 12,
                confirmedOrders: 9,
                grossSales: 45000
            }
        ]);

        const result = await getOrderReportTimeseries(
            range,
            "month"
        );

        expect(
            mockedGetOrderTimeseries
        ).toHaveBeenCalledWith(
            range.start,
            range.endExclusive,
            "month"
        );

        expect(result.bucket).toBe("month");
        expect(result.points).toHaveLength(1);
    });
});

describe("getOrderReportTopProducts", () => {

    it("defaults to a limit of 10", async () => {
        mockedGetTopProducts.mockResolvedValue([]);

        const result = await getOrderReportTopProducts(
            range,
            undefined
        );

        expect(mockedGetTopProducts).toHaveBeenCalledWith(
            range.start,
            range.endExclusive,
            10
        );

        expect(result.limit).toBe(10);
    });

    it("honours a valid custom limit", async () => {
        mockedGetTopProducts.mockResolvedValue([]);

        const result = await getOrderReportTopProducts(
            range,
            "25"
        );

        expect(result.limit).toBe(25);
    });

    it("rejects a non-numeric limit", async () => {
        await expect(
            getOrderReportTopProducts(range, "abc")
        ).rejects.toBeInstanceOf(AppError);
    });

    it("rejects a limit above the maximum", async () => {
        await expect(
            getOrderReportTopProducts(range, "101")
        ).rejects.toBeInstanceOf(AppError);
    });

    it("rejects a zero limit", async () => {
        await expect(
            getOrderReportTopProducts(range, "0")
        ).rejects.toBeInstanceOf(AppError);
    });
});
