import type {
    NextFunction,
    Request,
    Response
} from "express";
import {
    createNewOrder,
    getUserOrderById,
    getUserOrdersPaginated
} from "../services/order.service";
import { CreateOrderDto } from "../dtos/order.dto";
import { AppError } from "../utils/app-error";
import { getAuthenticatedUserId } from "../utils/request-user";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const parsePositiveInteger = (
    value: unknown,
    fieldName: string
): number => {
    if (
        typeof value !== "string" ||
        !/^\d+$/.test(value)
    ) {
        throw new AppError(
            `${fieldName} must be a positive integer`,
            400
        );
    }

    const parsed = Number(value);

    if (
        !Number.isSafeInteger(parsed) ||
        parsed <= 0
    ) {
        throw new AppError(
            `${fieldName} must be a positive integer`,
            400
        );
    }

    return parsed;
};

const getPaginationParams = (
    request: Request
): {
    page: number;
    pageSize: number;
} => {
    const pageValue = request.query.page;
    const pageSizeValue = request.query.pageSize;

    const page =
        pageValue === undefined
            ? DEFAULT_PAGE
            : parsePositiveInteger(
                  pageValue,
                  "Page"
              );

    const pageSize =
        pageSizeValue === undefined
            ? DEFAULT_PAGE_SIZE
            : parsePositiveInteger(
                  pageSizeValue,
                  "Page size"
              );

    if (pageSize > MAX_PAGE_SIZE) {
        throw new AppError(
            `Page size cannot exceed ${MAX_PAGE_SIZE}`,
            400
        );
    }

    return {
        page,
        pageSize
    };
};

export const createOrder = async (
    request: Request,
    response: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = getAuthenticatedUserId(request);
        const dto = request.body as CreateOrderDto;

        const order = await createNewOrder(
            userId,
            dto
        );

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
        const { page, pageSize } =
            getPaginationParams(request);

        const result =
            await getUserOrdersPaginated(
                userId,
                page,
                pageSize
            );

        response.status(200).json({
            success: true,
            data: result.orders,
            pagination: result.pagination
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

        const orderId = Array.isArray(
            request.params.orderId
        )
            ? request.params.orderId[0]
            : request.params.orderId;

        if (
            !orderId ||
            orderId.trim() === ""
        ) {
            throw new AppError(
                "Order ID is required",
                400
            );
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