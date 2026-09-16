import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";

declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

export const authMiddleware = (
    request: Request,
    _response: Response,
    next: NextFunction
): void => {
    const userId = request.headers["x-user-id"];

    if (typeof userId !== "string" || userId.trim() === "") {
        next(new AppError("Authentication required", 401));
        return;
    }

    request.userId = userId;
    next();
};