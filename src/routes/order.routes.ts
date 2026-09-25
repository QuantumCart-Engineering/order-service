import { Router } from "express";

import {
    createOrder,
    getOrderById,
    getOrders
} from "../controllers/order.controller";

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