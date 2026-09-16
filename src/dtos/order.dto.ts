export type OrderSource = "CART" | "BUY_NOW";

export interface CreateCartOrderDto {
    source: "CART";
}

export interface CreateBuyNowOrderDto {
    source: "BUY_NOW";
    productId: string;
    quantity: number;
}

export type CreateOrderDto =
    | CreateCartOrderDto
    | CreateBuyNowOrderDto;