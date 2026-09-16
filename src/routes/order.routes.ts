import { Router } from "express";
import {
    createOrder,
    getOrderById,
    getOrders
} from "../controllers/order.controller";
import { validateCreateOrder } from "../middleware/validation.middleware";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post(
    "/",
    authMiddleware,
    validateCreateOrder,
    createOrder
);

router.get(
    "/",
    authMiddleware,
    getOrders
);

router.get(
    "/:orderId",
    authMiddleware,
    getOrderById
);

export default router;