import request from "supertest";
import { randomUUID } from "crypto";
import app from "../../app";
import pool from "../../config/database";

describe("Order Integration", () => {
    const userId = randomUUID();

    const productId =
        "83cb7256-2c66-44aa-90cf-49550570e925";

    const productName =
        "Multi Category Product 1787560139819";

    const productSku =
        "MULTI-SKU-1787560139819";

    const unitPrice = 49999;
    const quantity = 2;
    const lineTotal = unitPrice * quantity;

    let orderId: string;

    beforeAll(async () => {
        await pool.execute(
            "DELETE FROM order_items"
        );

        await pool.execute(
            "DELETE FROM orders"
        );
    });

    afterAll(async () => {
        await pool.execute(
            "DELETE FROM order_items"
        );

        await pool.execute(
            "DELETE FROM orders"
        );

        await pool.end();
    });

    describe("POST /api/v1/orders", () => {
        it("should create a BUY_NOW order using an active product", async () => {
            const response = await request(app)
                .post("/api/v1/orders")
                .set("x-user-id", userId)
                .send({
                    source: "BUY_NOW",
                    productId,
                    quantity
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toEqual(
                expect.objectContaining({
                    userId,
                    status: "PENDING_PAYMENT",
                    subtotal: lineTotal,
                    total: lineTotal
                })
            );

            expect(
                response.body.data.items
            ).toHaveLength(1);

            expect(
                response.body.data.items[0]
            ).toEqual(
                expect.objectContaining({
                    productId,
                    productName,
                    sku: productSku,
                    quantity,
                    unitPrice,
                    lineTotal
                })
            );

            orderId = response.body.data.id;
        });

        it("should create an order from the active cart and checkout the cart", async () => {
            const cartUserId = randomUUID();

            const cartResponse = await request(
                "http://localhost:8003"
            )
                .get("/api/v1/cart/")
                .set(
                    "x-user-id",
                    cartUserId
                );

            expect(
                cartResponse.status
            ).toBe(200);

            expect(
                cartResponse.body.success
            ).toBe(true);

            const cartId =
                cartResponse.body.data.id;

            const addItemResponse = await request(
                "http://localhost:8003"
            )
                .post(
                    `/api/v1/cart/${cartId}/items`
                )
                .set(
                    "x-user-id",
                    cartUserId
                )
                .send({
                    productId,
                    quantity
                });

            expect(
                addItemResponse.status
            ).toBe(201);

            expect(
                addItemResponse.body.success
            ).toBe(true);

            const response = await request(app)
                .post("/api/v1/orders")
                .set(
                    "x-user-id",
                    cartUserId
                )
                .send({
                    source: "CART"
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toEqual(
                expect.objectContaining({
                    userId: cartUserId,
                    status: "PENDING_PAYMENT",
                    subtotal: lineTotal,
                    total: lineTotal
                })
            );

            expect(
                response.body.data.items
            ).toHaveLength(1);

            expect(
                response.body.data.items[0]
            ).toEqual(
                expect.objectContaining({
                    productId,
                    productName,
                    sku: productSku,
                    quantity,
                    unitPrice,
                    lineTotal
                })
            );

            const checkedOutCartResponse =
                await request(
                    "http://localhost:8003"
                )
                    .get(
                        `/api/v1/cart/${cartId}`
                    )
                    .set(
                        "x-user-id",
                        cartUserId
                    );

            expect(
                checkedOutCartResponse.status
            ).toBe(200);

            expect(
                checkedOutCartResponse.body.data.status
            ).toBe("CHECKED_OUT");

            expect(
                checkedOutCartResponse.body.data.items
            ).toHaveLength(1);
        });

        it("should reject unauthenticated order creation", async () => {
            const response = await request(app)
                .post("/api/v1/orders")
                .send({
                    source: "BUY_NOW",
                    productId,
                    quantity: 1
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);

            expect(
                response.body.error.message
            ).toBe(
                "Authentication required"
            );
        });

        it("should reject invalid order source", async () => {
            const response = await request(app)
                .post("/api/v1/orders")
                .set("x-user-id", userId)
                .send({
                    source: "INVALID"
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should reject an inactive or unavailable product", async () => {
            const response = await request(app)
                .post("/api/v1/orders")
                .set("x-user-id", userId)
                .send({
                    source: "BUY_NOW",
                    productId: randomUUID(),
                    quantity: 1
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);

            expect(
                response.body.error.message
            ).toBe("Product not found");
        });
    });

    describe("GET /api/v1/orders", () => {
        it("should return orders with default pagination", async () => {
            const response = await request(app)
                .get("/api/v1/orders")
                .set("x-user-id", userId);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(
                response.body.data
            ).toHaveLength(1);

            expect(
                response.body.data[0].id
            ).toBe(orderId);

            expect(
                response.body.pagination
            ).toEqual({
                page: 1,
                pageSize: 20,
                totalItems: 1,
                totalPages: 1
            });
        });

        it("should return paginated orders using custom page size", async () => {
            const paginationUserId =
                randomUUID();

            for (let index = 0; index < 3; index++) {
                const response =
                    await request(app)
                        .post(
                            "/api/v1/orders"
                        )
                        .set(
                            "x-user-id",
                            paginationUserId
                        )
                        .send({
                            source: "BUY_NOW",
                            productId,
                            quantity: 1
                        });

                expect(
                    response.status
                ).toBe(201);
            }

            const pageOneResponse =
                await request(app)
                    .get(
                        "/api/v1/orders?page=1&pageSize=2"
                    )
                    .set(
                        "x-user-id",
                        paginationUserId
                    );

            expect(
                pageOneResponse.status
            ).toBe(200);

            expect(
                pageOneResponse.body.success
            ).toBe(true);

            expect(
                pageOneResponse.body.data
            ).toHaveLength(2);

            expect(
                pageOneResponse.body.pagination
            ).toEqual({
                page: 1,
                pageSize: 2,
                totalItems: 3,
                totalPages: 2
            });

            const pageTwoResponse =
                await request(app)
                    .get(
                        "/api/v1/orders?page=2&pageSize=2"
                    )
                    .set(
                        "x-user-id",
                        paginationUserId
                    );

            expect(
                pageTwoResponse.status
            ).toBe(200);

            expect(
                pageTwoResponse.body.success
            ).toBe(true);

            expect(
                pageTwoResponse.body.data
            ).toHaveLength(1);

            expect(
                pageTwoResponse.body.pagination
            ).toEqual({
                page: 2,
                pageSize: 2,
                totalItems: 3,
                totalPages: 2
            });

            const pageOneIds =
                pageOneResponse.body.data.map(
                    (order: { id: string }) =>
                        order.id
                );

            const pageTwoIds =
                pageTwoResponse.body.data.map(
                    (order: { id: string }) =>
                        order.id
                );

            expect(
                pageOneIds.some(
                    (id: string) =>
                        pageTwoIds.includes(id)
                )
            ).toBe(false);
        });

        it("should return an empty data array when page is beyond the last page", async () => {
            const response = await request(app)
                .get(
                    "/api/v1/orders?page=2&pageSize=20"
                )
                .set(
                    "x-user-id",
                    userId
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(
                response.body.data
            ).toEqual([]);

            expect(
                response.body.pagination
            ).toEqual({
                page: 2,
                pageSize: 20,
                totalItems: 1,
                totalPages: 1
            });
        });

        it("should reject an invalid page", async () => {
            const response = await request(app)
                .get(
                    "/api/v1/orders?page=abc"
                )
                .set(
                    "x-user-id",
                    userId
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);

            expect(
                response.body.error.message
            ).toBe(
                "Page must be a positive integer"
            );
        });

        it("should reject page zero", async () => {
            const response = await request(app)
                .get(
                    "/api/v1/orders?page=0"
                )
                .set(
                    "x-user-id",
                    userId
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);

            expect(
                response.body.error.message
            ).toBe(
                "Page must be a positive integer"
            );
        });

        it("should reject an invalid page size", async () => {
            const response = await request(app)
                .get(
                    "/api/v1/orders?pageSize=abc"
                )
                .set(
                    "x-user-id",
                    userId
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);

            expect(
                response.body.error.message
            ).toBe(
                "Page size must be a positive integer"
            );
        });

        it("should reject page size zero", async () => {
            const response = await request(app)
                .get(
                    "/api/v1/orders?pageSize=0"
                )
                .set(
                    "x-user-id",
                    userId
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);

            expect(
                response.body.error.message
            ).toBe(
                "Page size must be a positive integer"
            );
        });

        it("should reject page size above 100", async () => {
            const response = await request(app)
                .get(
                    "/api/v1/orders?pageSize=101"
                )
                .set(
                    "x-user-id",
                    userId
                );

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);

            expect(
                response.body.error.message
            ).toBe(
                "Page size cannot exceed 100"
            );
        });

        it("should reject unauthenticated requests", async () => {
            const response = await request(app)
                .get("/api/v1/orders");

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe("GET /api/v1/orders/:orderId", () => {
        it("should reject unauthenticated requests", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/orders/${randomUUID()}`
                );

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it("should return 404 for an unknown order", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/orders/${randomUUID()}`
                )
                .set(
                    "x-user-id",
                    userId
                );

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it("should return the created order with its items", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/orders/${orderId}`
                )
                .set(
                    "x-user-id",
                    userId
                );

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            expect(response.body.data).toEqual(
                expect.objectContaining({
                    id: orderId,
                    userId,
                    status: "PENDING_PAYMENT",
                    subtotal: lineTotal,
                    total: lineTotal
                })
            );

            expect(
                response.body.data.items
            ).toHaveLength(1);

            expect(
                response.body.data.items[0]
            ).toEqual(
                expect.objectContaining({
                    productId,
                    quantity,
                    unitPrice,
                    lineTotal
                })
            );
        });

        it("should not allow another user to access the order", async () => {
            const response = await request(app)
                .get(
                    `/api/v1/orders/${orderId}`
                )
                .set(
                    "x-user-id",
                    randomUUID()
                );

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });
});