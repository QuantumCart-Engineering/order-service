import type { Request } from "express";
import { AppError } from "./app-error";

export const getAuthenticatedUserId = (
    request: Request
): string => {
    if (!request.userId) {
        throw new AppError("Authentication required", 401);
    }

    return request.userId;
};