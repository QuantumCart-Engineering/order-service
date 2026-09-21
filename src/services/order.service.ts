import { randomUUID } from "crypto";
import {
    getProductById,
    ProductDetails
} from "../clients/product.client";
import {
    getActiveCart,
    checkoutCart,
    CartItem
} from "../clients/cart.client";
import {
    CreateOrderDto
} from "../dtos/order.dto";
import {
    createOrder,
    findOrderById,
    findOrderItems,
    findOrdersByUserIdPaginated,
    findOrderByUserIdAndIdempotencyKey
} from "../repositories/order.repository";
import { AppError } from "../utils/app-error";

export interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface Order {
    id: string;
    orderNumber: string;
    userId: string;
    status:
        | "PENDING_PAYMENT"
        | "CONFIRMED"
        | "CANCELLED";
    subtotal: number;
    total: number;
    createdAt: Date;
    updatedAt: Date;
    items?: OrderItem[];
}

export interface PaginatedOrders {
    orders: Order[];
    pagination: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
}

interface OrderItemData {
    id: string;
    orderId: string;
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

const roundMoney = (
    value: number
): number => {
    return Math.round(
        (value + Number.EPSILON) * 100
    ) / 100;
};

const generateOrderNumber = (): string => {
    const timestamp = Date.now()
        .toString()
        .slice(-10);

    const suffix = randomUUID()
        .replace(/-/g, "")
        .slice(0, 6)
        .toUpperCase();

    return `QC-${timestamp}-${suffix}`;
};

const createOrderItemData = (
    orderId: string,
    product: ProductDetails,
    quantity: number
): OrderItemData => {
    const unitPrice = roundMoney(
        product.price
    );

    const lineTotal = roundMoney(
        unitPrice * quantity
    );

    return {
        id: randomUUID(),
        orderId,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        lineTotal
    };
};

const validateQuantity = (
    quantity: number
): void => {
    if (
        !Number.isInteger(quantity) ||
        quantity <= 0
    ) {
        throw new AppError(
            "Quantity must be a positive integer",
            400
        );
    }
};

const createCartOrder = async (
    userId: string,
    cartId: string,
    cartItems: CartItem[],
    idempotencyKey: string | null
): Promise<Order> => {
    if (cartItems.length === 0) {
        throw new AppError(
            "Cart is empty",
            400
        );
    }

    const orderId = randomUUID();
    const orderItems: OrderItemData[] = [];

    for (const cartItem of cartItems) {
        validateQuantity(
            cartItem.quantity
        );

        const product =
            await getProductById(
                cartItem.productId
            );

        if (product.status !== "ACTIVE") {
            throw new AppError(
                `Product ${product.id} is inactive`,
                400
            );
        }

        orderItems.push(
            createOrderItemData(
                orderId,
                product,
                cartItem.quantity
            )
        );
    }

    const subtotal = roundMoney(
        orderItems.reduce(
            (sum, item) =>
                sum + item.lineTotal,
            0
        )
    );

    const createdOrder =
        await createOrder(
            {
                id: orderId,
                orderNumber:
                    generateOrderNumber(),
                userId,
                status:
                    "PENDING_PAYMENT",
                subtotal,
                total: subtotal,
                idempotencyKey
            },
            orderItems
        );

    await checkoutCart(
        cartId,
        userId
    );

    return {
        ...createdOrder,
        items: orderItems.map(
            (item) => ({
                id: item.id,
                productId:
                    item.productId,
                productName:
                    item.productName,
                sku: item.sku,
                quantity:
                    item.quantity,
                unitPrice:
                    item.unitPrice,
                lineTotal:
                    item.lineTotal
            })
        )
    };
};

const createBuyNowOrder = async (
    userId: string,
    productId: string,
    quantity: number,
    idempotencyKey: string | null
): Promise<Order> => {
    validateQuantity(quantity);

    const product =
        await getProductById(
            productId
        );

    if (product.status !== "ACTIVE") {
        throw new AppError(
            "Product is inactive",
            400
        );
    }

    const orderId = randomUUID();

    const orderItem =
        createOrderItemData(
            orderId,
            product,
            quantity
        );

    const subtotal =
        orderItem.lineTotal;

    const createdOrder =
        await createOrder(
            {
                id: orderId,
                orderNumber:
                    generateOrderNumber(),
                userId,
                status:
                    "PENDING_PAYMENT",
                subtotal,
                total: subtotal,
                idempotencyKey
            },
            [orderItem]
        );

    return {
        ...createdOrder,
        items: [
            {
                id: orderItem.id,
                productId:
                    orderItem.productId,
                productName:
                    orderItem.productName,
                sku: orderItem.sku,
                quantity:
                    orderItem.quantity,
                unitPrice:
                    orderItem.unitPrice,
                lineTotal:
                    orderItem.lineTotal
            }
        ]
    };
};

export const createNewOrder = async (
    userId: string,
    dto: CreateOrderDto,
    idempotencyKey: string | null
): Promise<Order> => {
    if (idempotencyKey) {
        const existingOrder =
            await findOrderByUserIdAndIdempotencyKey(
                userId,
                idempotencyKey
            );

        if (existingOrder) {
            return getUserOrderById(
                userId,
                existingOrder.id
            );
        }
    }

    if (dto.source === "CART") {
        const cart =
            await getActiveCart(
                userId
            );

        if (
            cart.status !== "ACTIVE"
        ) {
            throw new AppError(
                "Cart is not active",
                400
            );
        }

        return createCartOrder(
            userId,
            cart.id,
            cart.items,
            idempotencyKey
        );
    }

    return createBuyNowOrder(
        userId,
        dto.productId,
        dto.quantity,
        idempotencyKey
    );
};

export const getUserOrdersPaginated = async (
    userId: string,
    page: number,
    pageSize: number
): Promise<PaginatedOrders> => {
    const offset =
        (page - 1) * pageSize;

    const result =
        await findOrdersByUserIdPaginated(
            userId,
            pageSize,
            offset
        );

    const totalPages = Math.ceil(
        result.totalItems / pageSize
    );

    return {
        orders: result.orders,
        pagination: {
            page,
            pageSize,
            totalItems:
                result.totalItems,
            totalPages
        }
    };
};

export const getUserOrderById = async (
    userId: string,
    orderId: string
): Promise<Order> => {
    const order =
        await findOrderById(
            orderId
        );

    if (!order) {
        throw new AppError(
            "Order not found",
            404
        );
    }

    if (
        order.userId !== userId
    ) {
        throw new AppError(
            "Order not found",
            404
        );
    }

    const items =
        await findOrderItems(
            orderId
        );

    return {
        ...order,
        items: items.map(
            (item) => ({
                id: item.id,
                productId:
                    item.productId,
                productName:
                    item.productName,
                sku: item.sku,
                quantity:
                    item.quantity,
                unitPrice:
                    item.unitPrice,
                lineTotal:
                    item.lineTotal
            })
        )
    };
};