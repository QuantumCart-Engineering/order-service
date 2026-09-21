import type { NextFunction, Request, Response } from "express";
import {
    createOrder,
    getOrderById,
    getOrders
} from "../../controllers/order.controller";
import {
    createNewOrder,
    getUserOrderById,
    getUserOrdersPaginated
} from "../../services/order.service";

jest.mock("../../services/order.service");

const mockedCreateNewOrder = jest.mocked(createNewOrder);
const mockedGetUserOrdersPaginated =
    jest.mocked(getUserOrdersPaginated);
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
            params: {},
            query: {},
            header: jest.fn().mockReturnValue(null)
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
                request.body,
                null
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

        it("should pass the idempotency key to the service", async () => {
            request.userId = "user-1";

            request.body = {
                source: "BUY_NOW",
                productId: "product-1",
                quantity: 2
            };

            request.header = jest
                .fn()
                .mockReturnValue("idem-key-123");

            mockedCreateNewOrder.mockResolvedValue({
                id: "order-1",
                orderNumber: "QC-001",
                userId: "user-1",
                status: "PENDING_PAYMENT",
                subtotal: 200,
                total: 200,
                createdAt: new Date(),
                updatedAt: new Date(),
                items: []
            });

            await createOrder(
                request as Request,
                response as Response,
                next
            );

            expect(request.header).toHaveBeenCalledWith(
                "Idempotency-Key"
            );

            expect(mockedCreateNewOrder).toHaveBeenCalledWith(
                "user-1",
                request.body,
                "idem-key-123"
            );

            expect(response.status).toHaveBeenCalledWith(201);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("getOrders", () => {
        it("should return the user's orders with default pagination", async () => {
            request.userId = "user-1";

            mockedGetUserOrdersPaginated.mockResolvedValue({
                orders: [
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
                ],
                pagination: {
                    page: 1,
                    pageSize: 20,
                    totalItems: 1,
                    totalPages: 1
                }
            });

            await getOrders(
                request as Request,
                response as Response,
                next
            );

            expect(
                mockedGetUserOrdersPaginated
            ).toHaveBeenCalledWith(
                "user-1",
                1,
                20
            );

            expect(response.status).toHaveBeenCalledWith(200);

            expect(response.json).toHaveBeenCalledWith({
                success: true,
                data: expect.any(Array),
                pagination: {
                    page: 1,
                    pageSize: 20,
                    totalItems: 1,
                    totalPages: 1
                }
            });

            expect(next).not.toHaveBeenCalled();
        });

        it("should use custom page and page size", async () => {
            request.userId = "user-1";

            request.query = {
                page: "3",
                pageSize: "10"
            };

            mockedGetUserOrdersPaginated.mockResolvedValue({
                orders: [],
                pagination: {
                    page: 3,
                    pageSize: 10,
                    totalItems: 25,
                    totalPages: 3
                }
            });

            await getOrders(
                request as Request,
                response as Response,
                next
            );

            expect(
                mockedGetUserOrdersPaginated
            ).toHaveBeenCalledWith(
                "user-1",
                3,
                10
            );

            expect(response.status).toHaveBeenCalledWith(200);
            expect(next).not.toHaveBeenCalled();
        });

        it("should reject an invalid page", async () => {
            request.userId = "user-1";

            request.query = {
                page: "abc"
            };

            await getOrders(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message:
                        "Page must be a positive integer",
                    statusCode: 400
                })
            );

            expect(
                mockedGetUserOrdersPaginated
            ).not.toHaveBeenCalled();
        });

        it("should reject page zero", async () => {
            request.userId = "user-1";

            request.query = {
                page: "0"
            };

            await getOrders(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message:
                        "Page must be a positive integer",
                    statusCode: 400
                })
            );
        });

        it("should reject decimal page", async () => {
            request.userId = "user-1";

            request.query = {
                page: "1.5"
            };

            await getOrders(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message:
                        "Page must be a positive integer",
                    statusCode: 400
                })
            );
        });

        it("should reject an invalid page size", async () => {
            request.userId = "user-1";

            request.query = {
                pageSize: "abc"
            };

            await getOrders(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message:
                        "Page size must be a positive integer",
                    statusCode: 400
                })
            );

            expect(
                mockedGetUserOrdersPaginated
            ).not.toHaveBeenCalled();
        });

        it("should reject page size zero", async () => {
            request.userId = "user-1";

            request.query = {
                pageSize: "0"
            };

            await getOrders(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message:
                        "Page size must be a positive integer",
                    statusCode: 400
                })
            );
        });

        it("should reject page size above 100", async () => {
            request.userId = "user-1";

            request.query = {
                pageSize: "101"
            };

            await getOrders(
                request as Request,
                response as Response,
                next
            );

            expect(next).toHaveBeenCalledWith(
                expect.objectContaining({
                    message:
                        "Page size cannot exceed 100",
                    statusCode: 400
                })
            );

            expect(
                mockedGetUserOrdersPaginated
            ).not.toHaveBeenCalled();
        });

        it("should pass service errors to next", async () => {
            request.userId = "user-1";

            const error = new Error(
                "Failed to fetch orders"
            );

            mockedGetUserOrdersPaginated.mockRejectedValue(
                error
            );

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

            expect(
                mockedGetUserOrdersPaginated
            ).not.toHaveBeenCalled();
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

            const error = new Error(
                "Failed to fetch order"
            );

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