import {
    PaymentMethod
} from "../clients/payment.client";

export type OrderSource =
    | "CART"
    | "BUY_NOW";

export interface CreateCartOrderDto {
    source: "CART";
    paymentMethod?: PaymentMethod;
}

export interface CreateBuyNowOrderDto {
    source: "BUY_NOW";
    productId: string;
    quantity: number;
    paymentMethod?: PaymentMethod;
}

export type CreateOrderDto =
    | CreateCartOrderDto
    | CreateBuyNowOrderDto;