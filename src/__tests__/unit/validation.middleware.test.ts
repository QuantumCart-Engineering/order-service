import type { NextFunction, Request, Response } from "express";
import { validateCreateOrder } from "../../middleware/validation.middleware";

describe("Validation Middleware", () => {
    let request: Partial<Request>;
    let response: Partial<Response>;
    let next: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        request = {
            body: {}
        };

        response = {};

        next = jest.fn();
    });

    describe("validateCreateOrder - common validation", () => {
        it("should reject a missing request body", () => {
            request.body = undefined;

            validateCreateOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Request body must be an object",
                    statusCode: 400
                })
            );
        });

        it("should reject an array request body", () => {
            request.body = [];

            validateCreateOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Request body must be an object",
                    statusCode: 400
                })
            );
        });

        it("should reject an invalid order source", () => {
            request.body = {
                source: "INVALID"
            };

            validateCreateOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Invalid order source",
                    statusCode: 400
                })
            );
        });
    });

    describe("validateCreateOrder - CART", () => {
        it("should accept a valid CART request", () => {
            request.body = {
                source: "CART"
            };

            validateCreateOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith();
        });

        it("should reject extra fields in a CART request", () => {
            request.body = {
                source: "CART",
                productId: "product-1"
            };

            validateCreateOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Invalid CART order request",
                    statusCode: 400
                })
            );
        });
    });

    describe("validateCreateOrder - BUY_NOW", () => {
        it("should accept a valid BUY_NOW request", () => {
            request.body = {
                source: "BUY_NOW",
                productId: "product-1",
                quantity: 2
            };

            validateCreateOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith();
        });

        it("should reject a missing product ID", () => {
            request.body = {
                source: "BUY_NOW",
                quantity: 2
            };

            validateCreateOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Product ID is required",
                    statusCode: 400
                })
            );
        });

        it("should reject an empty product ID", () => {
            request.body = {
                source: "BUY_NOW",
                productId: "   ",
                quantity: 2
            };

            validateCreateOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Product ID is required",
                    statusCode: 400
                })
            );
        });

        it("should reject a non-integer quantity", () => {
            request.body = {
                source: "BUY_NOW",
                productId: "product-1",
                quantity: 1.5
            };

            validateCreateOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Quantity must be a positive integer",
                    statusCode: 400
                })
            );
        });

        it("should reject a zero quantity", () => {
            request.body = {
                source: "BUY_NOW",
                productId: "product-1",
                quantity: 0
            };

            validateCreateOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Quantity must be a positive integer",
                    statusCode: 400
                })
            );
        });

        it("should reject a negative quantity", () => {
            request.body = {
                source: "BUY_NOW",
                productId: "product-1",
                quantity: -1
            };

            validateCreateOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Quantity must be a positive integer",
                    statusCode: 400
                })
            );
        });

        it("should reject extra fields in a BUY_NOW request", () => {
            request.body = {
                source: "BUY_NOW",
                productId: "product-1",
                quantity: 2,
                price: 100,
                total: 200
            };

            validateCreateOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Invalid BUY_NOW order request",
                    statusCode: 400
                })
            );
        });
    });
});