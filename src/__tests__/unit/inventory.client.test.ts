import {
    confirmInventory,
    releaseInventory,
    reserveInventory
} from "../../clients/inventory.client";
import { env } from "../../config/env";

const jsonResponse = (
    body: unknown,
    status = 200
): Response =>
    ({
        ok: status >= 200 && status < 300,
        status,
        json: jest.fn().mockResolvedValue(body)
    }) as unknown as Response;

describe("Inventory Client", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    it("reserves inventory with the order, product, and quantity", async () => {
        const data = {
            inventory: {
                id: "inventory-1",
                product_id: "product-1",
                available_quantity: 29,
                reserved_quantity: 1
            },
            reservation: {
                id: "reservation-1",
                product_id: "product-1",
                order_id: "order-1",
                quantity: 1,
                status: "RESERVED"
            }
        };

        (global.fetch as jest.Mock).mockResolvedValue(
            jsonResponse({ success: true, data })
        );

        const result = await reserveInventory(
            "order-1",
            "product-1",
            1
        );

        expect(result).toEqual(data);

        expect(global.fetch).toHaveBeenCalledWith(
            `${env.services.inventory}/api/v1/inventory/reserve`,
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    orderId: "order-1",
                    productId: "product-1",
                    quantity: 1
                })
            })
        );
    });

    it("maps insufficient stock to an AppError", async () => {
        (global.fetch as jest.Mock).mockResolvedValue(
            jsonResponse(
                {
                    success: false,
                    message: "Insufficient inventory"
                },
                409
            )
        );

        await expect(
            reserveInventory(
                "order-1",
                "product-1",
                31
            )
        ).rejects.toMatchObject({
            message: "Insufficient inventory",
            statusCode: 409
        });
    });

    it("confirms inventory by order", async () => {
        (global.fetch as jest.Mock).mockResolvedValue(
            jsonResponse({
                success: true,
                data: {
                    id: "reservation-1",
                    product_id: "product-1",
                    order_id: "order-1",
                    quantity: 1,
                    status: "CONFIRMED"
                }
            })
        );

        await confirmInventory("order-1");

        expect(global.fetch).toHaveBeenCalledWith(
            `${env.services.inventory}/api/v1/inventory/confirm`,
            expect.objectContaining({
                body: JSON.stringify({
                    orderId: "order-1"
                })
            })
        );
    });

    it("releases inventory by order and preserves a 404 for the caller", async () => {
        (global.fetch as jest.Mock).mockResolvedValue(
            jsonResponse(
                {
                    success: false,
                    message: "Inventory reservation not found"
                },
                404
            )
        );

        await expect(
            releaseInventory("order-1")
        ).rejects.toMatchObject({
            message: "Inventory reservation not found",
            statusCode: 404
        });

        expect(global.fetch).toHaveBeenCalledWith(
            `${env.services.inventory}/api/v1/inventory/release`,
            expect.objectContaining({
                body: JSON.stringify({
                    orderId: "order-1"
                })
            })
        );
    });

    it("maps inventory service transport failures to 502", async () => {
        (global.fetch as jest.Mock).mockRejectedValue(
            new Error("ECONNREFUSED")
        );

        await expect(
            reserveInventory(
                "order-1",
                "product-1",
                1
            )
        ).rejects.toMatchObject({
            message: "Inventory service unavailable",
            statusCode: 502
        });
    });
});
