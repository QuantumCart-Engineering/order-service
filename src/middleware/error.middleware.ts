import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/app-error";

export const errorMiddleware: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next
) => {
    if (error instanceof AppError) {
        response.status(error.statusCode).json({
            success: false,
            error: {
                message: error.message
            }
        });

        return;
    }

    console.error("Unhandled error:", error);

    response.status(500).json({
        success: false,
        error: {
            message: "Internal server error"
        }
    });
};