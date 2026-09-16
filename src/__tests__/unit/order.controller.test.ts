import type { NextFunction, Request, Response } from "express";
import {
    createOrder,
    getOrderById,
    getOrders
} from "../../controllers/order.controller";
import {
    createNewOrder,
    getUserOrderById,
    getUserOrders
} from "../../services/order.service";

jest.mock("../../services/order.service");

const mockedCreateNewOrder = jest.mocked(createNewOrder);
const mockedGetUserOrders = jest.mocked(getUserOrders);
const mockedGetUserOrderById = jest.mocked(getUserOrderById);

describe("Order Controller", () => {
    let request: Partial<Request>;
    let response: Partial<Response>;
    let next: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        jest.clearAllMocks();

        request = {
            userId: undefined,
            body: {},
            params: {}
        };

        response = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        next = jest.fn();
    });

    describe("createOrder", () => {
        it("should create an order and return 201", async () => {
            request.userId = "user-1";

            request.body = {
                source: "BUY_NOW",
                productId: "product-1",
                quantity: 2
            };

            mockedCreateNewOrder.mockResolvedValue({
                id: "order-1",
                orderNumber: "QC-001",
                userId: "user-1",
                status: "PENDING_PAYMENT",
                subtotal: 200,
                total: 200,
                createdAt: new Date(),
                updatedAt: new Date(),
                items: [
                    {
                        id: "item-1",
                        productId: "product-1",
                        productName: "Product One",
                        sku: "SKU-001",
                        quantity: 2,
                        unitPrice: 100,
                        lineTotal: 200
                    }
                ]
            });

            await createOrder(
                request as Request,
                response as Response,
                next
            );

            expect(mockedCreateNewOrder).toHaveBeenCalledWith(
                "user-1",
                request.body
            );

            expect(response.status).toHaveBeenCalledWith(201);

            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        id: "order-1"
                    })
                })
            );

            expect(next).not.toHaveBeenCalled();
        });

        it("should pass service errors to next", async () => {
            request.userId = "user-1";

            request.body = {
                source: "BUY_NOW",
                productId: "product-1",
                quantity: 1
            };

            const error = new Error("Order creation failed");

            mockedCreateNewOrder.mockRejectedValue(error);

            await createOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(error);
            expect(response.status).not.toHaveBeenCalled();
        });

        it("should pass authentication errors to next", async () => {
            await createOrder(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Authentication required",
                    statusCode: 401
                })
            );

            expect(mockedCreateNewOrder).not.toHaveBeenCalled();
        });
    });

    describe("getOrders", () => {
        it("should return the user's orders with 200", async () => {
            request.userId = "user-1";

            mockedGetUserOrders.mockResolvedValue([
                {
                    id: "order-1",
                    orderNumber: "QC-001",
                    userId: "user-1",
                    status: "PENDING_PAYMENT",
                    subtotal: 100,
                    total: 100,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]);

            await getOrders(
                request as Request,
                response as Response,
                next
            );

            expect(mockedGetUserOrders).toHaveBeenCalledWith(
                "user-1"
            );

            expect(response.status).toHaveBeenCalledWith(200);

            expect(response.json).toHaveBeenCalledWith({
                success: true,
                data: expect.any(Array)
            });

            expect(next).not.toHaveBeenCalled();
        });

        it("should pass service errors to next", async () => {
            request.userId = "user-1";

            const error = new Error("Failed to fetch orders");

            mockedGetUserOrders.mockRejectedValue(error);

            await getOrders(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(error);
        });

        it("should reject unauthenticated requests", async () => {
            await getOrders(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Authentication required",
                    statusCode: 401
                })
            );

            expect(mockedGetUserOrders).not.toHaveBeenCalled();
        });
    });

    describe("getOrderById", () => {
        it("should return an order with 200", async () => {
            request.userId = "user-1";

            request.params = {
                orderId: "order-1"
            };

            mockedGetUserOrderById.mockResolvedValue({
                id: "order-1",
                orderNumber: "QC-001",
                userId: "user-1",
                status: "PENDING_PAYMENT",
                subtotal: 100,
                total: 100,
                createdAt: new Date(),
                updatedAt: new Date(),
                items: [
                    {
                        id: "item-1",
                        productId: "product-1",
                        productName: "Product One",
                        sku: "SKU-001",
                        quantity: 1,
                        unitPrice: 100,
                        lineTotal: 100
                    }
                ]
            });

            await getOrderById(
                request as Request,
                response as Response,
                next
            );

            expect(mockedGetUserOrderById).toHaveBeenCalledWith(
                "user-1",
                "order-1"
            );

            expect(response.status).toHaveBeenCalledWith(200);

            expect(response.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        id: "order-1"
                    })
                })
            );

            expect(next).not.toHaveBeenCalled();
        });

        it("should reject a missing order ID", async () => {
            request.userId = "user-1";

            request.params = {};

            await getOrderById(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Order ID is required",
                    statusCode: 400
                })
            );

            expect(mockedGetUserOrderById).not.toHaveBeenCalled();
        });

        it("should pass service errors to next", async () => {
            request.userId = "user-1";

            request.params = {
                orderId: "order-1"
            };

            const error = new Error("Failed to fetch order");

            mockedGetUserOrderById.mockRejectedValue(error);

            await getOrderById(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(error);
        });

        it("should reject unauthenticated requests", async () => {
            request.params = {
                orderId: "order-1"
            };

            await getOrderById(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Authentication required",
                    statusCode: 401
                })
            );

            expect(mockedGetUserOrderById).not.toHaveBeenCalled();
        });
    });
});