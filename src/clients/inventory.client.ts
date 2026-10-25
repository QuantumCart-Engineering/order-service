import { env } from "../config/env";
import { AppError } from "../utils/app-error";

interface InventoryApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}

interface InventoryReservation {
    id: string;
    product_id: string;
    order_id: string;
    quantity: number;
    status: "RESERVED" | "CONFIRMED" | "RELEASED";
}

export interface ReservedInventoryResponse {
    inventory: {
        id: string;
        product_id: string;
        available_quantity: number;
        reserved_quantity: number;
    };
    reservation: InventoryReservation;
}

const postInventory = async <T>(
    path: string,
    body: Record<string, unknown>
): Promise<T> => {
    let response: Response;

    try {
        response = await fetch(
            `${env.services.inventory}${path}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            }
        );
    } catch (error) {
        console.error(
            "Inventory service request failed:",
            error
        );

        throw new AppError(
            "Inventory service unavailable",
            502
        );
    }

    let parsed:
        | InventoryApiResponse<T>
        | undefined;

    try {
        parsed =
            (await response.json()) as InventoryApiResponse<T>;
    } catch {
        parsed = undefined;
    }

    if (!response.ok) {
        throw new AppError(
            parsed?.message ??
                "Inventory service request failed",
            response.status >= 400 &&
                response.status < 500
                ? response.status
                : 502
        );
    }

    if (
        !parsed ||
        !parsed.success ||
        parsed.data === undefined
    ) {
        throw new AppError(
            "Invalid response from inventory service",
            502
        );
    }

    return parsed.data;
};

export const reserveInventory = async (
    orderId: string,
    productId: string,
    quantity: number
): Promise<ReservedInventoryResponse> => {
    return postInventory<ReservedInventoryResponse>(
        "/api/v1/inventory/reserve",
        {
            orderId,
            productId,
            quantity
        }
    );
};

export const confirmInventory = async (
    orderId: string
): Promise<void> => {
    await postInventory<InventoryReservation>(
        "/api/v1/inventory/confirm",
        { orderId }
    );
};

export const releaseInventory = async (
    orderId: string
): Promise<void> => {
    await postInventory<{
        reservation: InventoryReservation;
        inventory: unknown;
    }>("/api/v1/inventory/release", {
        orderId
    });
};
