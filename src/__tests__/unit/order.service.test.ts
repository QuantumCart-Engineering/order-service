import {
    getProductById
} from "../../clients/product.client";

import {
    getActiveCart,
    checkoutCart
} from "../../clients/cart.client";

import {
    createPayment
} from "../../clients/payment.client";

import {
    createOrder,
    findOrderById,
    findOrderItems,
    findOrdersByUserIdPaginated,
    findOrderByUserIdAndIdempotencyKey,
    updateOrderStatus
} from "../../repositories/order.repository";

import {
    createNewOrder,
    getUserOrderById,
    getUserOrdersPaginated
} from "../../services/order.service";

jest.mock("../../clients/product.client");
jest.mock("../../clients/cart.client");
jest.mock("../../clients/payment.client");
jest.mock("../../repositories/order.repository");

const mockedGetProductById = jest.mocked(
    getProductById
);

const mockedGetActiveCart = jest.mocked(
    getActiveCart
);

const mockedCheckoutCart = jest.mocked(
    checkoutCart
);

const mockedCreatePayment = jest.mocked(
    createPayment
);

const mockedCreateOrder = jest.mocked(
    createOrder
);

const mockedUpdateOrderStatus = jest.mocked(
    updateOrderStatus
);

const mockedFindOrderById = jest.mocked(
    findOrderById
);

const mockedFindOrderItems = jest.mocked(
    findOrderItems
);

const mockedFindOrdersByUserIdPaginated =
    jest.mocked(
        findOrdersByUserIdPaginated
    );

const mockedFindOrderByUserIdAndIdempotencyKey =
    jest.mocked(
        findOrderByUserIdAndIdempotencyKey
    );

describe("Order Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        /*
         * Default behavior:
         * No existing order for an idempotency key.
         */
        mockedFindOrderByUserIdAndIdempotencyKey
            .mockResolvedValue(null);

        /*
         * Default successful payment.
         *
         * Payment service is mocked because these are
         * unit tests for Order Service.
         */
        mockedCreatePayment.mockResolvedValue({
            paymentId: 1,
            orderId: "mock-order-id",
            amount: 100,
            currency: "INR",
            paymentMethod: "UPI",
            status: "SUCCESS"
        });

        /*
         * Default successful order status update.
         */
        mockedUpdateOrderStatus.mockResolvedValue(
            true
        );
    });

    describe("createNewOrder - CART", () => {
        it("should reject an empty cart", async () => {
            mockedGetActiveCart.mockResolvedValue({
                id: "cart-1",
                userId: "user-1",
                status: "ACTIVE",
                items: []
            });

            await expect(
                createNewOrder(
                    "user-1",
                    {
                        source: "CART"
                    },
                    null
                )
            ).rejects.toMatchObject({
                message: "Cart is empty",
                statusCode: 400
            });

            expect(
                mockedCreateOrder
            ).not.toHaveBeenCalled();
        });

        it("should reject an inactive cart", async () => {
            mockedGetActiveCart.mockResolvedValue({
                id: "cart-1",
                userId: "user-1",
                status: "CHECKED_OUT",
                items: [
                    {
                        id: "item-1",
                        productId: "product-1",
                        quantity: 2
                    }
                ]
            });

            await expect(
                createNewOrder(
                    "user-1",
                    {
                        source: "CART"
                    },
                    null
                )
            ).rejects.toMatchObject({
                message: "Cart is not active",
                statusCode: 400
            });

            expect(
                mockedGetProductById
            ).not.toHaveBeenCalled();

            expect(
                mockedCreateOrder
            ).not.toHaveBeenCalled();
        });

        it("should reject an inactive product", async () => {
            mockedGetActiveCart.mockResolvedValue({
                id: "cart-1",
                userId: "user-1",
                status: "ACTIVE",
                items: [
                    {
                        id: "item-1",
                        productId: "product-1",
                        quantity: 2
                    }
                ]
            });

            mockedGetProductById.mockResolvedValue({
                id: "product-1",
                name: "Test Product",
                sku: "SKU-001",
                price: 100,
                status: "INACTIVE"
            });

            await expect(
                createNewOrder(
                    "user-1",
                    {
                        source: "CART"
                    },
                    null
                )
            ).rejects.toMatchObject({
                message:
                    "Product product-1 is inactive",
                statusCode: 400
            });

            expect(
                mockedCreateOrder
            ).not.toHaveBeenCalled();

            expect(
                mockedCheckoutCart
            ).not.toHaveBeenCalled();
        });

        it("should create an order from cart items", async () => {
            mockedGetActiveCart.mockResolvedValue({
                id: "cart-1",
                userId: "user-1",
                status: "ACTIVE",
                items: [
                    {
                        id: "item-1",
                        productId: "product-1",
                        quantity: 2
                    },
                    {
                        id: "item-2",
                        productId: "product-2",
                        quantity: 1
                    }
                ]
            });

            mockedGetProductById
                .mockResolvedValueOnce({
                    id: "product-1",
                    name: "Product One",
                    sku: "SKU-001",
                    price: 100,
                    status: "ACTIVE"
                })
                .mockResolvedValueOnce({
                    id: "product-2",
                    name: "Product Two",
                    sku: "SKU-002",
                    price: 50,
                    status: "ACTIVE"
                });

            mockedCreateOrder.mockImplementation(
                async (order) => ({
                    id: order.id,
                    orderNumber:
                        order.orderNumber,
                    userId: order.userId,
                    status: order.status,
                    subtotal: order.subtotal,
                    total: order.total,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })
            );

            mockedCheckoutCart.mockResolvedValue();

            const result =
                await createNewOrder(
                    "user-1",
                    {
                        source: "CART"
                    },
                    null
                );

            expect(
                mockedGetProductById
            ).toHaveBeenCalledTimes(2);

            expect(
                mockedCreateOrder
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: "user-1",
                    status: "PENDING_PAYMENT",
                    subtotal: 250,
                    total: 250,
                    idempotencyKey: null
                }),
                expect.arrayContaining([
                    expect.objectContaining({
                        productId: "product-1",
                        quantity: 2,
                        unitPrice: 100,
                        lineTotal: 200
                    }),
                    expect.objectContaining({
                        productId: "product-2",
                        quantity: 1,
                        unitPrice: 50,
                        lineTotal: 50
                    })
                ])
            );

            expect(
                mockedCreatePayment
            ).toHaveBeenCalled();

            expect(
                mockedUpdateOrderStatus
            ).toHaveBeenCalledWith(
                expect.any(String),
                "CONFIRMED"
            );

            expect(
                mockedCheckoutCart
            ).toHaveBeenCalledWith(
                "cart-1",
                "user-1"
            );

            expect(result.subtotal).toBe(250);
            expect(result.total).toBe(250);
            expect(result.status).toBe(
                "CONFIRMED"
            );
            expect(result.items).toHaveLength(2);
        });

        it("should propagate cart checkout failure after order creation", async () => {
            mockedGetActiveCart.mockResolvedValue({
                id: "cart-1",
                userId: "user-1",
                status: "ACTIVE",
                items: [
                    {
                        id: "item-1",
                        productId: "product-1",
                        quantity: 2
                    }
                ]
            });

            mockedGetProductById.mockResolvedValue({
                id: "product-1",
                name: "Product One",
                sku: "SKU-001",
                price: 100,
                status: "ACTIVE"
            });

            mockedCreateOrder.mockImplementation(
                async (order) => ({
                    id: order.id,
                    orderNumber:
                        order.orderNumber,
                    userId: order.userId,
                    status: order.status,
                    subtotal: order.subtotal,
                    total: order.total,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })
            );

            mockedCheckoutCart.mockRejectedValue(
                new Error(
                    "Cart service unavailable"
                )
            );

            await expect(
                createNewOrder(
                    "user-1",
                    {
                        source: "CART"
                    },
                    null
                )
            ).rejects.toThrow(
                "Cart service unavailable"
            );

            expect(
                mockedCreateOrder
            ).toHaveBeenCalled();

            expect(
                mockedCreatePayment
            ).toHaveBeenCalled();

            expect(
                mockedCheckoutCart
            ).toHaveBeenCalledWith(
                "cart-1",
                "user-1"
            );
        });
    });

    describe("createNewOrder - Idempotency", () => {
        it("should return the existing order for a duplicate idempotency key", async () => {
            const existingOrder = {
                id: "existing-order-1",
                orderNumber: "QC-EXISTING-001",
                userId: "user-1",
                status:
                    "PENDING_PAYMENT" as const,
                subtotal: 200,
                total: 200,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockedFindOrderByUserIdAndIdempotencyKey
                .mockResolvedValue(
                    existingOrder
                );

            mockedFindOrderById
                .mockResolvedValue(
                    existingOrder
                );

            mockedFindOrderItems
                .mockResolvedValue([
                    {
                        id: "existing-item-1",
                        orderId:
                            "existing-order-1",
                        productId: "product-1",
                        productName:
                            "Test Product",
                        sku: "SKU-001",
                        quantity: 2,
                        unitPrice: 100,
                        lineTotal: 200,
                        createdAt: new Date()
                    }
                ]);

            const result =
                await createNewOrder(
                    "user-1",
                    {
                        source: "BUY_NOW",
                        productId: "product-1",
                        quantity: 2
                    },
                    "idem-key-123"
                );

            expect(
                mockedFindOrderByUserIdAndIdempotencyKey
            ).toHaveBeenCalledWith(
                "user-1",
                "idem-key-123"
            );

            expect(
                mockedFindOrderById
            ).toHaveBeenCalledWith(
                "existing-order-1"
            );

            expect(
                mockedFindOrderItems
            ).toHaveBeenCalledWith(
                "existing-order-1"
            );

            expect(
                mockedCreateOrder
            ).not.toHaveBeenCalled();

            expect(
                mockedGetProductById
            ).not.toHaveBeenCalled();

            expect(
                result.id
            ).toBe("existing-order-1");

            expect(
                result.items
            ).toHaveLength(1);
        });
    });

    describe("createNewOrder - BUY_NOW", () => {
        it("should reject an invalid quantity", async () => {
            await expect(
                createNewOrder(
                    "user-1",
                    {
                        source: "BUY_NOW",
                        productId: "product-1",
                        quantity: 0
                    },
                    null
                )
            ).rejects.toMatchObject({
                message:
                    "Quantity must be a positive integer",
                statusCode: 400
            });

            expect(
                mockedGetProductById
            ).not.toHaveBeenCalled();

            expect(
                mockedCreateOrder
            ).not.toHaveBeenCalled();
        });

        it("should reject an inactive product", async () => {
            mockedGetProductById.mockResolvedValue({
                id: "product-1",
                name: "Test Product",
                sku: "SKU-001",
                price: 100,
                status: "INACTIVE"
            });

            await expect(
                createNewOrder(
                    "user-1",
                    {
                        source: "BUY_NOW",
                        productId: "product-1",
                        quantity: 1
                    },
                    null
                )
            ).rejects.toMatchObject({
                message: "Product is inactive",
                statusCode: 400
            });

            expect(
                mockedCreateOrder
            ).not.toHaveBeenCalled();
        });

        it("should create an order for an active product", async () => {
            mockedGetProductById.mockResolvedValue({
                id: "product-1",
                name: "Test Product",
                sku: "SKU-001",
                price: 149.99,
                status: "ACTIVE"
            });

            mockedCreateOrder.mockImplementation(
                async (order) => ({
                    id: order.id,
                    orderNumber:
                        order.orderNumber,
                    userId: order.userId,
                    status: order.status,
                    subtotal: order.subtotal,
                    total: order.total,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })
            );

            const result =
                await createNewOrder(
                    "user-1",
                    {
                        source: "BUY_NOW",
                        productId: "product-1",
                        quantity: 2
                    },
                    null
                );

            expect(
                mockedGetProductById
            ).toHaveBeenCalledWith(
                "product-1"
            );

            expect(
                mockedCreateOrder
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: "user-1",
                    status: "PENDING_PAYMENT",
                    subtotal: 299.98,
                    total: 299.98,
                    idempotencyKey: null
                }),
                [
                    expect.objectContaining({
                        productId: "product-1",
                        quantity: 2,
                        unitPrice: 149.99,
                        lineTotal: 299.98
                    })
                ]
            );

            expect(
                mockedCreatePayment
            ).toHaveBeenCalledWith(
                expect.any(String),
                299.98,
                "UPI",
                expect.any(String)
            );

            expect(
                mockedUpdateOrderStatus
            ).toHaveBeenCalledWith(
                expect.any(String),
                "CONFIRMED"
            );

            expect(result.total).toBe(299.98);
            expect(result.status).toBe(
                "CONFIRMED"
            );
            expect(result.items).toHaveLength(1);
        });

        it("should persist the idempotency key when creating a BUY_NOW order", async () => {
            mockedGetProductById.mockResolvedValue({
                id: "product-1",
                name: "Test Product",
                sku: "SKU-001",
                price: 100,
                status: "ACTIVE"
            });

            mockedCreateOrder.mockImplementation(
                async (order) => ({
                    id: order.id,
                    orderNumber:
                        order.orderNumber,
                    userId: order.userId,
                    status: order.status,
                    subtotal: order.subtotal,
                    total: order.total,
                    createdAt: new Date(),
                    updatedAt: new Date()
                })
            );

            await createNewOrder(
                "user-1",
                {
                    source: "BUY_NOW",
                    productId: "product-1",
                    quantity: 2
                },
                "idem-key-123"
            );

            expect(
                mockedFindOrderByUserIdAndIdempotencyKey
            ).toHaveBeenCalledWith(
                "user-1",
                "idem-key-123"
            );

            expect(
                mockedCreateOrder
            ).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: "user-1",
                    status: "PENDING_PAYMENT",
                    subtotal: 200,
                    total: 200,
                    idempotencyKey:
                        "idem-key-123"
                }),
                [
                    expect.objectContaining({
                        productId: "product-1",
                        quantity: 2,
                        unitPrice: 100,
                        lineTotal: 200
                    })
                ]
            );

            expect(
                mockedCreatePayment
            ).toHaveBeenCalledWith(
                expect.any(String),
                200,
                "UPI",
                expect.any(String)
            );
        });
    });

    describe("getUserOrdersPaginated", () => {
        it("should return paginated orders", async () => {
            mockedFindOrdersByUserIdPaginated
                .mockResolvedValue({
                    orders: [
                        {
                            id: "order-1",
                            orderNumber: "QC-001",
                            userId: "user-1",
                            status:
                                "PENDING_PAYMENT",
                            subtotal: 100,
                            total: 100,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        },
                        {
                            id: "order-2",
                            orderNumber: "QC-002",
                            userId: "user-1",
                            status:
                                "CONFIRMED",
                            subtotal: 200,
                            total: 200,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    ],
                    totalItems: 5
                });

            const result =
                await getUserOrdersPaginated(
                    "user-1",
                    1,
                    2
                );

            expect(
                mockedFindOrdersByUserIdPaginated
            ).toHaveBeenCalledWith(
                "user-1",
                2,
                0
            );

            expect(
                result.orders
            ).toHaveLength(2);

            expect(
                result.pagination
            ).toEqual({
                page: 1,
                pageSize: 2,
                totalItems: 5,
                totalPages: 3
            });
        });

        it("should calculate the correct offset for later pages", async () => {
            mockedFindOrdersByUserIdPaginated
                .mockResolvedValue({
                    orders: [],
                    totalItems: 45
                });

            const result =
                await getUserOrdersPaginated(
                    "user-1",
                    3,
                    20
                );

            expect(
                mockedFindOrdersByUserIdPaginated
            ).toHaveBeenCalledWith(
                "user-1",
                20,
                40
            );

            expect(
                result.pagination
            ).toEqual({
                page: 3,
                pageSize: 20,
                totalItems: 45,
                totalPages: 3
            });
        });

        it("should reject invalid page", async () => {
            await expect(
                getUserOrdersPaginated(
                    "user-1",
                    0,
                    20
                )
            ).rejects.toMatchObject({
                message:
                    "Page must be a positive integer",
                statusCode: 400
            });

            expect(
                mockedFindOrdersByUserIdPaginated
            ).not.toHaveBeenCalled();
        });

        it("should reject invalid page size", async () => {
            await expect(
                getUserOrdersPaginated(
                    "user-1",
                    1,
                    0
                )
            ).rejects.toMatchObject({
                message:
                    "Page size must be a positive integer",
                statusCode: 400
            });

            expect(
                mockedFindOrdersByUserIdPaginated
            ).not.toHaveBeenCalled();
        });

        it("should reject page size above 100", async () => {
            await expect(
                getUserOrdersPaginated(
                    "user-1",
                    1,
                    101
                )
            ).rejects.toMatchObject({
                message:
                    "Page size cannot exceed 100",
                statusCode: 400
            });

            expect(
                mockedFindOrdersByUserIdPaginated
            ).not.toHaveBeenCalled();
        });
    });

    describe("getUserOrderById", () => {
        it("should return an order with items", async () => {
            mockedFindOrderById.mockResolvedValue({
                id: "order-1",
                orderNumber: "QC-001",
                userId: "user-1",
                status: "CONFIRMED",
                subtotal: 250,
                total: 250,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            mockedFindOrderItems.mockResolvedValue([
                {
                    id: "item-1",
                    orderId: "order-1",
                    productId: "product-1",
                    productName: "Product One",
                    sku: "SKU-001",
                    quantity: 2,
                    unitPrice: 100,
                    lineTotal: 200,
                    createdAt: new Date()
                },
                {
                    id: "item-2",
                    orderId: "order-1",
                    productId: "product-2",
                    productName: "Product Two",
                    sku: "SKU-002",
                    quantity: 1,
                    unitPrice: 50,
                    lineTotal: 50,
                    createdAt: new Date()
                }
            ]);

            const result =
                await getUserOrderById(
                    "user-1",
                    "order-1"
                );

            expect(
                mockedFindOrderById
            ).toHaveBeenCalledWith(
                "order-1"
            );

            expect(
                mockedFindOrderItems
            ).toHaveBeenCalledWith(
                "order-1"
            );

            expect(result).toEqual(
                expect.objectContaining({
                    id: "order-1",
                    userId: "user-1",
                    status: "CONFIRMED",
                    subtotal: 250,
                    total: 250
                })
            );

            expect(
                result.items
            ).toHaveLength(2);
        });

        it("should reject an unknown order", async () => {
            mockedFindOrderById.mockResolvedValue(
                null
            );

            await expect(
                getUserOrderById(
                    "user-1",
                    "unknown-order"
                )
            ).rejects.toMatchObject({
                message: "Order not found",
                statusCode: 404
            });

            expect(
                mockedFindOrderItems
            ).not.toHaveBeenCalled();
        });

        it("should not allow another user to access an order", async () => {
            mockedFindOrderById.mockResolvedValue({
                id: "order-1",
                orderNumber: "QC-001",
                userId: "user-1",
                status: "CONFIRMED",
                subtotal: 100,
                total: 100,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await expect(
                getUserOrderById(
                    "user-2",
                    "order-1"
                )
            ).rejects.toMatchObject({
                message: "Order not found",
                statusCode: 404
            });

            expect(
                mockedFindOrderItems
            ).not.toHaveBeenCalled();
        });
    });
});