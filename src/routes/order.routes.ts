import { Router } from "express";

import {
    cancelOrder,
    createOrder,
    getOrderById,
    getOrders
} from "../controllers/order.controller";

import {
    getOrderReportSummaryController,
    getOrderReportTimeseriesController,
    getOrderReportTopProductsController
} from "../controllers/order-report.controller";

import {
    validateCreateOrder
} from "../middleware/validation.middleware";

import {
    authMiddleware
} from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create an order
 *     description: Creates an order from the user's cart or directly from a product.
 *     tags:
 *       - Orders
 *     security:
 *       - UserIdHeader: []
 *     parameters:
 *       - name: Idempotency-Key
 *         in: header
 *         required: false
 *         description: Optional key used to prevent duplicate order creation.
 *         schema:
 *           type: string
 *         example: checkout-request-001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/CreateCartOrderRequest'
 *               - $ref: '#/components/schemas/CreateBuyNowOrderRequest'
 *     responses:
 *       201:
 *         description: Order created successfully.
 *       400:
 *         description: Invalid order request.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Required resource not found.
 *       409:
 *         description: Order conflict.
 *       500:
 *         description: Internal server error.
 */
router.post(
    "/",
    authMiddleware,
    validateCreateOrder,
    createOrder
);

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: Get customer orders
 *     description: Returns orders belonging to the authenticated user.
 *     tags:
 *       - Orders
 *     security:
 *       - UserIdHeader: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         description: Page number.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         example: 1
 *
 *       - name: pageSize
 *         in: query
 *         required: false
 *         description: Number of orders per page.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         example: 20
 *
 *     responses:
 *       200:
 *         description: Orders returned successfully.
 *       400:
 *         description: Invalid pagination parameters.
 *       401:
 *         description: Authentication required.
 *       500:
 *         description: Internal server error.
 */
router.get(
    "/",
    authMiddleware,
    getOrders
);

/**
 * @swagger
 * /api/v1/orders/reports/summary:
 *   get:
 *     summary: Order analytics summary (admin)
 *     description: Order counts by status plus gross sales for a date range.
 *     tags:
 *       - Order Reports
 *     security:
 *       - UserIdHeader: []
 *     parameters:
 *       - name: from
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         example: '2026-09-17'
 *       - name: to
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         example: '2026-10-16'
 *     responses:
 *       200:
 *         description: Summary returned successfully.
 *       400:
 *         description: Invalid date range.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Administrator role required.
 */
router.get(
    "/reports/summary",
    authMiddleware,
    getOrderReportSummaryController
);

/**
 * @swagger
 * /api/v1/orders/reports/timeseries:
 *   get:
 *     summary: Order analytics time series (admin)
 *     description: Order and gross sales totals bucketed by day or month.
 *     tags:
 *       - Order Reports
 *     security:
 *       - UserIdHeader: []
 *     parameters:
 *       - name: from
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - name: bucket
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [day, month]
 *           default: day
 *     responses:
 *       200:
 *         description: Time series returned successfully.
 *       400:
 *         description: Invalid date range or bucket.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Administrator role required.
 */
router.get(
    "/reports/timeseries",
    authMiddleware,
    getOrderReportTimeseriesController
);

/**
 * @swagger
 * /api/v1/orders/reports/top-products:
 *   get:
 *     summary: Best selling products (admin)
 *     description: Products ranked by units sold for a date range.
 *     tags:
 *       - Order Reports
 *     security:
 *       - UserIdHeader: []
 *     parameters:
 *       - name: from
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - name: to
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: Ranked products returned successfully.
 *       400:
 *         description: Invalid date range or limit.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Administrator role required.
 */
router.get(
    "/reports/top-products",
    authMiddleware,
    getOrderReportTopProductsController
);

/**
 * @swagger
 * /api/v1/orders/{orderId}/cancel:
 *   post:
 *     summary: Cancel a pending order
 *     description: Releases the order's active inventory reservation exactly once.
 *     tags:
 *       - Orders
 *     security:
 *       - UserIdHeader: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order cancelled successfully.
 *       400:
 *         description: Invalid order ID.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Order not found.
 *       409:
 *         description: Confirmed orders cannot be cancelled.
 *       502:
 *         description: Inventory release failed; order was not cancelled.
 */
router.post(
    "/:orderId/cancel",
    authMiddleware,
    cancelOrder
);

/**
 * @swagger
 * /api/v1/orders/{orderId}:
 *   get:
 *     summary: Get order by ID
 *     description: Returns a specific order belonging to the authenticated user.
 *     tags:
 *       - Orders
 *     security:
 *       - UserIdHeader: []
 *     parameters:
 *       - name: orderId
 *         in: path
 *         required: true
 *         description: Unique order identifier.
 *         schema:
 *           type: string
 *           format: uuid
 *         example: b7f2c6d1-5e2a-4f72-9a91-123456789abc
 *
 *     responses:
 *       200:
 *         description: Order returned successfully.
 *       400:
 *         description: Invalid order ID.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Order not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
    "/:orderId",
    authMiddleware,
    getOrderById
);

export default router;