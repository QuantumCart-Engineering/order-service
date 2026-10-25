/**
 * Reporting queries for the order domain.
 *
 * All aggregates are computed in SQL so the API never loads every
 * order into memory. Revenue only counts `CONFIRMED` orders: pending
 * orders have not been paid and cancelled orders must not inflate
 * sales figures.
 */

export const orderSummaryQuery = `
    SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(status = 'PENDING_PAYMENT'), 0) AS pending_payment_orders,
        COALESCE(SUM(status = 'CONFIRMED'), 0) AS confirmed_orders,
        COALESCE(SUM(status = 'CANCELLED'), 0) AS cancelled_orders,
        COALESCE(SUM(
            CASE WHEN status = 'CONFIRMED' THEN total ELSE 0 END
        ), 0) AS gross_sales,
        COALESCE(SUM(
            CASE WHEN status = 'PENDING_PAYMENT' THEN total ELSE 0 END
        ), 0) AS pending_value,
        COALESCE(SUM(
            CASE WHEN status = 'CANCELLED' THEN total ELSE 0 END
        ), 0) AS cancelled_value
    FROM orders
    WHERE created_at >= ?
      AND created_at < ?
`;

export const orderTimeseriesDayQuery = `
    SELECT
        DATE_FORMAT(created_at, '%Y-%m-%d') AS period,
        COUNT(*) AS orders,
        COALESCE(SUM(status = 'CONFIRMED'), 0) AS confirmed_orders,
        COALESCE(SUM(
            CASE WHEN status = 'CONFIRMED' THEN total ELSE 0 END
        ), 0) AS gross_sales
    FROM orders
    WHERE created_at >= ?
      AND created_at < ?
    GROUP BY period
    ORDER BY period ASC
`;

export const orderTimeseriesMonthQuery = `
    SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS period,
        COUNT(*) AS orders,
        COALESCE(SUM(status = 'CONFIRMED'), 0) AS confirmed_orders,
        COALESCE(SUM(
            CASE WHEN status = 'CONFIRMED' THEN total ELSE 0 END
        ), 0) AS gross_sales
    FROM orders
    WHERE created_at >= ?
      AND created_at < ?
    GROUP BY period
    ORDER BY period ASC
`;

export const topProductsQuery = `
    SELECT
        oi.product_id,
        MAX(oi.product_name) AS product_name,
        MAX(oi.sku) AS sku,
        SUM(oi.quantity) AS units_sold,
        COALESCE(SUM(oi.line_total), 0) AS revenue
    FROM order_items oi
    INNER JOIN orders o
        ON o.id = oi.order_id
    WHERE o.status = 'CONFIRMED'
      AND o.created_at >= ?
      AND o.created_at < ?
    GROUP BY oi.product_id
    ORDER BY units_sold DESC, revenue DESC
    LIMIT ?
`;
