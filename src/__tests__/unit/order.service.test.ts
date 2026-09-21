import {
    getProductById
} from "../../clients/product.client";
import {
    getActiveCart,
    checkoutCart
} from "../../clients/cart.client";
import {
    createOrder,
    findOrderById,
    findOrderItems,
    findOrdersByUserIdPaginated
} from "../../repositories/order.repository";
import {
    createNewOrder,
    getUserOrderById,
    getUserOrdersPaginated
} from "../../services/order.service";

jest.mock("../../clients/product.client");
jest.mock("../../clients/cart.client");
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
const mockedCreateOrder = jest.mocked(
    createOrder
);
const mockedFindOrderById = jest.mocked(
    findOrderById
);
const mockedFindOrderItems = jest.mocked(
    findOrderItems
);
const mockedFindOrdersByUserIdPaginated =
    jest.mocked(findOrdersByUserIdPaginated);

describe("Order Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
                createNewOrder("user-1", {
                    source: "CART"
                }, null)
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
                    orderNumber: order.orderNumber,
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
                    }, null
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
                    total: 250
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
                mockedCheckoutCart
            ).toHaveBeenCalledWith(
                "cart-1",
                "user-1"
            );

            expect(result.subtotal).toBe(250);
            expect(result.total).toBe(250);
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
                    orderNumber: order.orderNumber,
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
                createNewOrder("user-1", {
                    source: "CART"
                }, null)
            ).rejects.toThrow(
                "Cart service unavailable"
            );

            expect(
                mockedCreateOrder
            ).toHaveBeenCalled();

            expect(
                mockedCheckoutCart
            ).toHaveBeenCalledWith(
                "cart-1",
                "user-1"
            );
        });
    });

    describe("createNewOrder - BUY_NOW", () => {
        it("should reject an invalid quantity", async () => {
            await expect(
                createNewOrder("user-1", {
                    source: "BUY_NOW",
                    productId: "product-1",
                    quantity: 0
                }, null)
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
                createNewOrder("user-1", {
                    source: "BUY_NOW",
                    productId: "product-1",
                    quantity: 1
                }, null)
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
                    orderNumber: order.orderNumber,
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
                    }, null
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
                    total: 299.98
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

            expect(result.total).toBe(299.98);
            expect(result.items).toHaveLength(1);
        });
    });

    describe("getUserOrdersPaginated", () => {
        it("should return paginated orders", async () => {
            mockedFindOrdersByUserIdPaginated.mockResolvedValue({
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
                    },
                    {
                        id: "order-2",
                        orderNumber: "QC-002",
                        userId: "user-1",
                        status: "CONFIRMED",
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

            expect(result.orders).toHaveLength(2);

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
            mockedFindOrdersByUserIdPaginated.mockResolvedValue({
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

        it("should return zero total pages when user has no orders", async () => {
            mockedFindOrdersByUserIdPaginated.mockResolvedValue({
                orders: [],
                totalItems: 0
            });

            const result =
                await getUserOrdersPaginated(
                    "user-1",
                    1,
                    20
                );

            expect(
                result.pagination
            ).toEqual({
                page: 1,
                pageSize: 20,
                totalItems: 0,
                totalPages: 0
            });
        });
    });

    describe("getUserOrderById", () => {
        it("should return an order with its items", async () => {
            mockedFindOrderById.mockResolvedValue({
                id: "order-1",
                orderNumber: "QC-001",
                userId: "user-1",
                status: "PENDING_PAYMENT",
                subtotal: 100,
                total: 100,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            mockedFindOrderItems.mockResolvedValue([
                {
                    id: "order-item-1",
                    orderId: "order-1",
                    productId: "product-1",
                    productName: "Test Product",
                    sku: "SKU-001",
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
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

            expect(result.items).toHaveLength(1);

            expect(
                result.items?.[0].productId
            ).toBe("product-1");
        });

        it("should return 404 when the order does not exist", async () => {
            mockedFindOrderById.mockResolvedValue(
                null
            );

            await expect(
                getUserOrderById(
                    "user-1",
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

        it("should return 404 when the order belongs to another user", async () => {
            mockedFindOrderById.mockResolvedValue({
                id: "order-1",
                orderNumber: "QC-001",
                userId: "user-2",
                status: "PENDING_PAYMENT",
                subtotal: 100,
                total: 100,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            await expect(
                getUserOrderById(
                    "user-1",
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