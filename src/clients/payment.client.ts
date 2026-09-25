import { env } from "../config/env";
import { AppError } from "../utils/app-error";

export type PaymentMethod =
    | "UPI"
    | "DEBIT_CARD"
    | "CREDIT_CARD";

export type PaymentStatus =
    | "PROCESSING"
    | "SUCCESS"
    | "FAILED";

interface PaymentResponse {
    success: boolean;
    data: {
        paymentId: number;
        orderId: string;
        amount: number;
        currency: string;
        paymentMethod: PaymentMethod;
        status: PaymentStatus;
    };
    error?: {
        message: string;
    };
}

export interface PaymentResult {
    paymentId: number;
    orderId: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    status: PaymentStatus;
}

export const createPayment = async (
    orderId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    idempotencyKey: string
): Promise<PaymentResult> => {
    let response: Response;

    try {
        response = await fetch(
            `${env.services.payment}/api/v1/payments`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Idempotency-Key":
                        idempotencyKey
                },
                body: JSON.stringify({
                    orderId,
                    amount,
                    paymentMethod
                })
            }
        );
    } catch (error) {
        console.error(
            "Payment service request failed:",
            error
        );

        throw new AppError(
            "Payment service unavailable",
            502
        );
    }

    let body: PaymentResponse;

    try {
        body =
            (await response.json()) as PaymentResponse;
    } catch {
        throw new AppError(
            "Invalid response from payment service",
            502
        );
    }

    if (!response.ok) {
        throw new AppError(
            body.error?.message ??
                "Payment service request failed",
            response.status === 409
                ? 409
                : response.status >= 400 &&
                    response.status < 500
                    ? response.status
                    : 502
        );
    }

    if (
        !body.success ||
        !body.data
    ) {
        throw new AppError(
            "Invalid response from payment service",
            502
        );
    }

    return {
        paymentId:
            body.data.paymentId,
        orderId:
            body.data.orderId,
        amount:
            Number(body.data.amount),
        currency:
            body.data.currency,
        paymentMethod:
            body.data.paymentMethod,
        status:
            body.data.status
    };
};