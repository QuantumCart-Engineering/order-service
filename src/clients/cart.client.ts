import { env } from "../config/env";
import { AppError } from "../utils/app-error";

interface CartItemResponse {
    id: string;
    cart_id: string;
    product_id: string;
    quantity: number;
}

interface CartResponse {
    success: boolean;
    data: {
        id: string;
        user_id: string;
        status: "ACTIVE" | "CHECKED_OUT" | "ABANDONED";
        items: CartItemResponse[];
    };
}

export interface CartItem {
    id: string;
    productId: string;
    quantity: number;
}

export interface CartDetails {
    id: string;
    userId: string;
    status: "ACTIVE" | "CHECKED_OUT" | "ABANDONED";
    items: CartItem[];
}

export const getActiveCart = async (
    userId: string
): Promise<CartDetails> => {
    let response: Response;

    try {
        response = await fetch(
            `${env.services.cart}/api/v1/cart/`,
            {
                headers: {
                    "x-user-id": userId
                }
            }
        );
    } catch (error) {
        console.error(
            "Cart service request failed:",
            error
        );

        throw new AppError(
            "Cart service unavailable",
            502
        );
    }

    if (response.status === 404) {
        throw new AppError(
            "Active cart not found",
            404
        );
    }

    if (!response.ok) {
        throw new AppError(
            "Cart service unavailable",
            502
        );
    }

    let body: CartResponse;

    try {
        body =
            (await response.json()) as CartResponse;
    } catch {
        throw new AppError(
            "Invalid response from cart service",
            502
        );
    }

    if (
        !body.success ||
        !body.data
    ) {
        throw new AppError(
            "Invalid response from cart service",
            502
        );
    }

    return {
        id: body.data.id,
        userId: body.data.user_id,
        status: body.data.status,
        items: body.data.items.map(
            (item) => ({
                id: item.id,
                productId: item.product_id,
                quantity: item.quantity
            })
        )
    };
};

export const checkoutCart = async (
    cartId: string,
    userId: string
): Promise<void> => {
    let response: Response;

    try {
        response = await fetch(
            `${env.services.cart}/api/v1/cart/${cartId}/checkout`,
            {
                method: "PATCH",
                headers: {
                    "x-user-id": userId
                }
            }
        );
    } catch (error) {
        console.error(
            "Cart checkout request failed:",
            error
        );

        throw new AppError(
            "Cart service unavailable",
            502
        );
    }

    if (
        response.status === 400 ||
        response.status === 403 ||
        response.status === 404
    ) {
        let body:
            | {
                  error?: {
                      message?: string;
                  };
              }
            | undefined;

        try {
            body =
                (await response.json()) as {
                    error?: {
                        message?: string;
                    };
                };
        } catch {
            body = undefined;
        }

        throw new AppError(
            body?.error?.message ||
                "Failed to checkout cart",
            response.status
        );
    }

    if (!response.ok) {
        throw new AppError(
            "Cart service unavailable",
            502
        );
    }
};