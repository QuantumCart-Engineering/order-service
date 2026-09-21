import type {
    NextFunction,
    Request,
    RequestHandler,
    Response
} from "express";
import { AppError } from "../utils/app-error";

export const validateCreateOrder: RequestHandler = (
    request: Request,
    _response: Response,
    next: NextFunction
): void => {
    const body = request.body;

    if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body)
    ) {
        next(
            new AppError(
                "Request body must be an object",
                400
            )
        );
        return;
    }

    if (
        body.source !== "CART" &&
        body.source !== "BUY_NOW"
    ) {
        next(
            new AppError(
                "Invalid order source",
                400
            )
        );
        return;
    }

    const keys = Object.keys(body);

    if (body.source === "CART") {
        if (
            keys.length !== 1 ||
            keys[0] !== "source"
        ) {
            next(
                new AppError(
                    "Invalid CART order request",
                    400
                )
            );
            return;
        }

        next();
        return;
    }

    const allowedKeys = [
        "source",
        "productId",
        "quantity"
    ];

    const hasInvalidKeys = keys.some(
        (key) => !allowedKeys.includes(key)
    );

    if (hasInvalidKeys) {
        next(
            new AppError(
                "Invalid BUY_NOW order request",
                400
            )
        );
        return;
    }

    if (
        typeof body.productId !== "string" ||
        body.productId.trim() === ""
    ) {
        next(
            new AppError(
                "Product ID is required",
                400
            )
        );
        return;
    }

    if (
        !Number.isInteger(body.quantity) ||
        body.quantity <= 0
    ) {
        next(
            new AppError(
                "Quantity must be a positive integer",
                400
            )
        );
        return;
    }

    next();
};