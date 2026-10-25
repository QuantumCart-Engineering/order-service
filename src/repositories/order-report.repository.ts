import type { RowDataPacket } from "mysql2/promise";

import pool from "../config/database";

import {
    orderSummaryQuery,
    orderTimeseriesDayQuery,
    orderTimeseriesMonthQuery,
    topProductsQuery
} from "../queries/order-report.queries";

import type { ReportBucket } from "../utils/date-range";

export interface OrderReportSummary {
    totalOrders: number;
    pendingPaymentOrders: number;
    confirmedOrders: number;
    cancelledOrders: number;
    grossSales: number;
    pendingValue: number;
    cancelledValue: number;
}

export interface OrderReportPoint {
    period: string;
    orders: number;
    confirmedOrders: number;
    grossSales: number;
}

export interface TopProduct {
    productId: string;
    productName: string;
    sku: string;
    unitsSold: number;
    revenue: number;
}

interface OrderSummaryRow extends RowDataPacket {
    total_orders: number | string;
    pending_payment_orders: number | string;
    confirmed_orders: number | string;
    cancelled_orders: number | string;
    gross_sales: number | string;
    pending_value: number | string;
    cancelled_value: number | string;
}

interface OrderTimeseriesRow extends RowDataPacket {
    period: string;
    orders: number | string;
    confirmed_orders: number | string;
    gross_sales: number | string;
}

interface TopProductRow extends RowDataPacket {
    product_id: string;
    product_name: string;
    sku: string;
    units_sold: number | string;
    revenue: number | string;
}

const roundMoney = (value: number): number =>
    Math.round(
        (value + Number.EPSILON) * 100
    ) / 100;

export const getOrderSummary = async (
    start: string,
    endExclusive: string
): Promise<OrderReportSummary> => {
    const [rows] =
        await pool.execute<OrderSummaryRow[]>(
            orderSummaryQuery,
            [start, endExclusive]
        );

    const row = rows[0];

    return {
        totalOrders: Number(row?.total_orders ?? 0),
        pendingPaymentOrders: Number(
            row?.pending_payment_orders ?? 0
        ),
        confirmedOrders: Number(
            row?.confirmed_orders ?? 0
        ),
        cancelledOrders: Number(
            row?.cancelled_orders ?? 0
        ),
        grossSales: roundMoney(
            Number(row?.gross_sales ?? 0)
        ),
        pendingValue: roundMoney(
            Number(row?.pending_value ?? 0)
        ),
        cancelledValue: roundMoney(
            Number(row?.cancelled_value ?? 0)
        )
    };
};

export const getOrderTimeseries = async (
    start: string,
    endExclusive: string,
    bucket: ReportBucket
): Promise<OrderReportPoint[]> => {
    const query =
        bucket === "month"
            ? orderTimeseriesMonthQuery
            : orderTimeseriesDayQuery;

    const [rows] =
        await pool.execute<OrderTimeseriesRow[]>(
            query,
            [start, endExclusive]
        );

    return rows.map((row) => ({
        period: row.period,
        orders: Number(row.orders),
        confirmedOrders: Number(
            row.confirmed_orders
        ),
        grossSales: roundMoney(
            Number(row.gross_sales)
        )
    }));
};

export const getTopProducts = async (
    start: string,
    endExclusive: string,
    limit: number
): Promise<TopProduct[]> => {
    const [rows] =
        await pool.execute<TopProductRow[]>(
            topProductsQuery,
            [start, endExclusive, limit]
        );

    return rows.map((row) => ({
        productId: row.product_id,
        productName: row.product_name,
        sku: row.sku,
        unitsSold: Number(row.units_sold),
        revenue: roundMoney(
            Number(row.revenue)
        )
    }));
};
