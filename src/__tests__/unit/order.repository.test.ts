import type { PoolConnection } from "mysql2/promise";
import pool from "../../config/database";
import {
    createOrder,
    findOrderById,
    findOrderItems,
    findOrdersByUserIdPaginated,
    updateOrderStatus
} from "../../repositories/order.repository";
import {
    createOrderItemQuery,
    createOrderQuery,
    findOrderByIdQuery,
    findOrderItemsQuery,
    findOrdersByUserIdPaginatedQuery,
    countOrdersByUserIdQuery,
    updateOrderStatusQuery
} from "../../queries/order.queries";

jest.mock("../../config/database");

const mockedPool = pool as typeof pool & {
    getConnection: jest.Mock;
    execute: jest.Mock;
};

describe("Order Repository", () => {
    let connection: {
        beginTransaction: jest.Mock;
        commit: jest.Mock;
        rollback: jest.Mock;
        release: jest.Mock;
        execute: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();

        connection = {
            beginTransaction: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn(),
            execute: jest.fn()
        };

        mockedPool.getConnection.mockResolvedValue(
            connection as unknown as PoolConnection
        );

        mockedPool.execute.mockReset();
    });

    describe("createOrder", () => {
        it("should create order and items in a transaction", async () => {
            connection.execute
                .mockResolvedValueOnce([
                    {
                        fieldCount: 0,
                        affectedRows: 1,
                        insertId: 0,
                        serverStatus: 2,
                        warningStatus: 0,
                        changedRows: 0
                    },
                    []
                ])
                .mockResolvedValueOnce([
                    {
                        fieldCount: 0,
                        affectedRows: 1,
                        insertId: 0,
                        serverStatus: 2,
                        warningStatus: 0,
                        changedRows: 0
                    },
                    []
                ])
                .mockResolvedValueOnce([
                    [
                        {
                            id: "order-1",
                            order_number: "QC-001",
                            user_id: "user-1",
                            status: "PENDING_PAYMENT",
                            subtotal: "250.00",
                            total: "250.00",
                            created_at: new Date(),
                            updated_at: new Date()
                        }
                    ],
                    []
                ]);

            const result = await createOrder(
                {
                    id: "order-1",
                    orderNumber: "QC-001",
                    userId: "user-1",
                    status: "PENDING_PAYMENT",
                    subtotal: 250,
                    total: 250
                },
                [
                    {
                        id: "item-1",
                        orderId: "order-1",
                        productId: "product-1",
                        productName: "Product One",
                        sku: "SKU-001",
                        quantity: 2,
                        unitPrice: 100,
                        lineTotal: 200
                    }
                ]
            );

            expect(
                connection.beginTransaction
            ).toHaveBeenCalledTimes(1);

            expect(
                connection.execute
            ).toHaveBeenNthCalledWith(
                1,
                createOrderQuery,
                [
                    "order-1",
                    "QC-001",
                    "user-1",
                    "PENDING_PAYMENT",
                    250,
                    250
                ]
            );

            expect(
                connection.execute
            ).toHaveBeenNthCalledWith(
                2,
                createOrderItemQuery,
                [
                    "item-1",
                    "order-1",
                    "product-1",
                    "Product One",
                    "SKU-001",
                    2,
                    100,
                    200
                ]
            );

            expect(
                connection.commit
            ).toHaveBeenCalledTimes(1);

            expect(
                connection.rollback
            ).not.toHaveBeenCalled();

            expect(
                connection.release
            ).toHaveBeenCalledTimes(1);

            expect(result.id).toBe("order-1");
            expect(result.orderNumber).toBe("QC-001");
            expect(result.subtotal).toBe(250);
            expect(result.total).toBe(250);
        });

        it("should rollback when order creation fails", async () => {
            const error = new Error("Database error");

            connection.execute.mockRejectedValueOnce(
                error
            );

            await expect(
                createOrder(
                    {
                        id: "order-1",
                        orderNumber: "QC-001",
                        userId: "user-1",
                        status: "PENDING_PAYMENT",
                        subtotal: 100,
                        total: 100
                    },
                    [
                        {
                            id: "item-1",
                            orderId: "order-1",
                            productId: "product-1",
                            productName: "Product One",
                            sku: "SKU-001",
                            quantity: 1,
                            unitPrice: 100,
                            lineTotal: 100
                        }
                    ]
                )
            ).rejects.toThrow("Database error");

            expect(
                connection.beginTransaction
            ).toHaveBeenCalledTimes(1);

            expect(
                connection.rollback
            ).toHaveBeenCalledTimes(1);

            expect(
                connection.commit
            ).not.toHaveBeenCalled();

            expect(
                connection.release
            ).toHaveBeenCalledTimes(1);
        });

        it("should rollback when an order item creation fails", async () => {
            const error = new Error(
                "Order item insert failed"
            );

            connection.execute
                .mockResolvedValueOnce([
                    {
                        fieldCount: 0,
                        affectedRows: 1,
                        insertId: 0,
                        serverStatus: 2,
                        warningStatus: 0,
                        changedRows: 0
                    },
                    []
                ])
                .mockRejectedValueOnce(error);

            await expect(
                createOrder(
                    {
                        id: "order-1",
                        orderNumber: "QC-001",
                        userId: "user-1",
                        status: "PENDING_PAYMENT",
                        subtotal: 100,
                        total: 100
                    },
                    [
                        {
                            id: "item-1",
                            orderId: "order-1",
                            productId: "product-1",
                            productName: "Product One",
                            sku: "SKU-001",
                            quantity: 1,
                            unitPrice: 100,
                            lineTotal: 100
                        }
                    ]
                )
            ).rejects.toThrow(
                "Order item insert failed"
            );

            expect(
                connection.beginTransaction
            ).toHaveBeenCalledTimes(1);

            expect(
                connection.rollback
            ).toHaveBeenCalledTimes(1);

            expect(
                connection.commit
            ).not.toHaveBeenCalled();

            expect(
                connection.release
            ).toHaveBeenCalledTimes(1);
        });

        it("should fail when the created order cannot be retrieved", async () => {
            connection.execute
                .mockResolvedValueOnce([
                    {
                        fieldCount: 0,
                        affectedRows: 1,
                        insertId: 0,
                        serverStatus: 2,
                        warningStatus: 0,
                        changedRows: 0
                    },
                    []
                ])
                .mockResolvedValueOnce([
                    {
                        fieldCount: 0,
                        affectedRows: 1,
                        insertId: 0,
                        serverStatus: 2,
                        warningStatus: 0,
                        changedRows: 0
                    },
                    []
                ])
                .mockResolvedValueOnce([
                    [],
                    []
                ]);

            await expect(
                createOrder(
                    {
                        id: "order-1",
                        orderNumber: "QC-001",
                        userId: "user-1",
                        status: "PENDING_PAYMENT",
                        subtotal: 100,
                        total: 100
                    },
                    [
                        {
                            id: "item-1",
                            orderId: "order-1",
                            productId: "product-1",
                            productName: "Product One",
                            sku: "SKU-001",
                            quantity: 1,
                            unitPrice: 100,
                            lineTotal: 100
                        }
                    ]
                )
            ).rejects.toThrow(
                "Created order could not be retrieved"
            );

            expect(
                connection.rollback
            ).toHaveBeenCalledTimes(1);

            expect(
                connection.release
            ).toHaveBeenCalledTimes(1);
        });
    });

    describe("findOrderById", () => {
        it("should return an order when found", async () => {
            mockedPool.execute.mockResolvedValueOnce([
                [
                    {
                        id: "order-1",
                        order_number: "QC-001",
                        user_id: "user-1",
                        status: "PENDING_PAYMENT",
                        subtotal: "100.00",
                        total: "100.00",
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                ],
                []
            ]);

            const result = await findOrderById(
                "order-1"
            );

            expect(
                mockedPool.execute
            ).toHaveBeenCalledWith(
                findOrderByIdQuery,
                ["order-1"]
            );

            expect(result).not.toBeNull();
            expect(result?.id).toBe("order-1");
            expect(result?.orderNumber).toBe("QC-001");
            expect(result?.subtotal).toBe(100);
            expect(result?.total).toBe(100);
        });

        it("should return null when order is not found", async () => {
            mockedPool.execute.mockResolvedValueOnce([
                [],
                []
            ]);

            const result = await findOrderById(
                "order-1"
            );

            expect(result).toBeNull();
        });
    });

    describe("findOrdersByUserIdPaginated", () => {
        it("should return paginated orders and total count", async () => {
            mockedPool.execute
                .mockResolvedValueOnce([
                    [
                        {
                            id: "order-1",
                            order_number: "QC-001",
                            user_id: "user-1",
                            status: "PENDING_PAYMENT",
                            subtotal: "100.00",
                            total: "100.00",
                            created_at: new Date(),
                            updated_at: new Date()
                        },
                        {
                            id: "order-2",
                            order_number: "QC-002",
                            user_id: "user-1",
                            status: "CONFIRMED",
                            subtotal: "200.00",
                            total: "200.00",
                            created_at: new Date(),
                            updated_at: new Date()
                        }
                    ],
                    []
                ])
                .mockResolvedValueOnce([
                    [
                        {
                            total: 5
                        }
                    ],
                    []
                ]);

            const result =
                await findOrdersByUserIdPaginated(
                    "user-1",
                    2,
                    0
                );

            expect(
                mockedPool.execute
            ).toHaveBeenNthCalledWith(
                1,
                findOrdersByUserIdPaginatedQuery,
                ["user-1", 2, 0]
            );

            expect(
                mockedPool.execute
            ).toHaveBeenNthCalledWith(
                2,
                countOrdersByUserIdQuery,
                ["user-1"]
            );

            expect(result.orders).toHaveLength(2);
            expect(result.orders[0].id).toBe(
                "order-1"
            );
            expect(result.orders[1].id).toBe(
                "order-2"
            );
            expect(result.totalItems).toBe(5);
        });

        it("should return an empty page with total count", async () => {
            mockedPool.execute
                .mockResolvedValueOnce([
                    [],
                    []
                ])
                .mockResolvedValueOnce([
                    [
                        {
                            total: 3
                        }
                    ],
                    []
                ]);

            const result =
                await findOrdersByUserIdPaginated(
                    "user-1",
                    2,
                    6
                );

            expect(result.orders).toEqual([]);
            expect(result.totalItems).toBe(3);

            expect(
                mockedPool.execute
            ).toHaveBeenNthCalledWith(
                1,
                findOrdersByUserIdPaginatedQuery,
                ["user-1", 2, 6]
            );

            expect(
                mockedPool.execute
            ).toHaveBeenNthCalledWith(
                2,
                countOrdersByUserIdQuery,
                ["user-1"]
            );
        });

        it("should return zero total when user has no orders", async () => {
            mockedPool.execute
                .mockResolvedValueOnce([
                    [],
                    []
                ])
                .mockResolvedValueOnce([
                    [
                        {
                            total: 0
                        }
                    ],
                    []
                ]);

            const result =
                await findOrdersByUserIdPaginated(
                    "user-1",
                    20,
                    0
                );

            expect(result.orders).toEqual([]);
            expect(result.totalItems).toBe(0);
        });
    });

    describe("findOrderItems", () => {
        it("should return order items", async () => {
            mockedPool.execute.mockResolvedValueOnce([
                [
                    {
                        id: "item-1",
                        order_id: "order-1",
                        product_id: "product-1",
                        product_name: "Product One",
                        sku: "SKU-001",
                        quantity: 2,
                        unit_price: "100.00",
                        line_total: "200.00",
                        created_at: new Date()
                    }
                ],
                []
            ]);

            const result = await findOrderItems(
                "order-1"
            );

            expect(
                mockedPool.execute
            ).toHaveBeenCalledWith(
                findOrderItemsQuery,
                ["order-1"]
            );

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe("item-1");
            expect(result[0].productId).toBe(
                "product-1"
            );
            expect(result[0].quantity).toBe(2);
            expect(result[0].unitPrice).toBe(100);
            expect(result[0].lineTotal).toBe(200);
        });

        it("should return an empty array when order has no items", async () => {
            mockedPool.execute.mockResolvedValueOnce([
                [],
                []
            ]);

            const result = await findOrderItems(
                "order-1"
            );

            expect(result).toEqual([]);
        });
    });

    describe("updateOrderStatus", () => {
        it("should return true when status is updated", async () => {
            mockedPool.execute.mockResolvedValueOnce([
                {
                    fieldCount: 0,
                    affectedRows: 1,
                    insertId: 0,
                    serverStatus: 2,
                    warningStatus: 0,
                    changedRows: 1
                },
                []
            ]);

            const result = await updateOrderStatus(
                "order-1",
                "CONFIRMED"
            );

            expect(
                mockedPool.execute
            ).toHaveBeenCalledWith(
                updateOrderStatusQuery,
                ["CONFIRMED", "order-1"]
            );

            expect(result).toBe(true);
        });

        it("should return false when order does not exist", async () => {
            mockedPool.execute.mockResolvedValueOnce([
                {
                    fieldCount: 0,
                    affectedRows: 0,
                    insertId: 0,
                    serverStatus: 2,
                    warningStatus: 0,
                    changedRows: 0
                },
                []
            ]);

            const result = await updateOrderStatus(
                "order-1",
                "CONFIRMED"
            );

            expect(result).toBe(false);
        });
    });
});