import type { NextFunction, Request, Response } from "express";
import {
    createNewOrder,
    getUserOrderById,
    getUserOrders
} from "../services/order.service";
import { CreateOrderDto } from "../dtos/order.dto";
import { AppError } from "../utils/app-error";
import { getAuthenticatedUserId } from "../utils/request-user";

export const createOrder = async (
    request: Request,
    response: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = getAuthenticatedUserId(request);
        const dto = request.body as CreateOrderDto;

        const order = await createNewOrder(userId, dto);

        response.status(201).json({
            success: true,
            data: order
        });
    } catch (error) {
        next(error);
    }
};

export const getOrders = async (
    request: Request,
    response: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = getAuthenticatedUserId(request);

        const orders = await getUserOrders(userId);

        response.status(200).json({
            success: true,
            data: orders
        });
    } catch (error) {
        next(error);
    }
};

export const getOrderById = async (
    request: Request,
    response: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = getAuthenticatedUserId(request);

        const orderId = Array.isArray(request.params.orderId)
            ? request.params.orderId[0]
            : request.params.orderId;

        if (!orderId || orderId.trim() === "") {
            throw new AppError("Order ID is required", 400);
        }

        const order = await getUserOrderById(
            userId,
            orderId
        );

        response.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        next(error);
    }
};