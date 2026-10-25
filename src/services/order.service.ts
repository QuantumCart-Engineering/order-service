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
    createPayment,
    PaymentMethod
} from "../clients/payment.client";

import {
    reserveInventory,
    confirmInventory,
    releaseInventory
} from "../clients/inventory.client";

import {
    CreateOrderDto
} from "../dtos/order.dto";

import {
    createOrder,
    findOrderById,
    findOrderItems,
    findOrdersByUserIdPaginated,
    findOrderByUserIdAndIdempotencyKey,
    updateOrderStatus
} from "../repositories/order.repository";

import {
    AppError
} from "../utils/app-error";

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

const DEFAULT_PAYMENT_METHOD:
    PaymentMethod = "UPI";

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

const releaseOrderInventory = async (
    orderId: string
): Promise<void> => {
    try {
        await releaseInventory(orderId);
    } catch (error) {
        /*
         * A 404 means there is no reservation to release. That is
         * safe for legacy orders created before reservation support.
         */
        if (
            error instanceof AppError &&
            error.statusCode === 404
        ) {
            return;
        }

        throw error;
    }
};

const reserveOrderInventory = async (
    orderId: string,
    items: OrderItemData[]
): Promise<void> => {
    try {
        for (const item of items) {
            await reserveInventory(
                orderId,
                item.productId,
                item.quantity
            );
        }
    } catch (error) {
        /*
         * Compensate reservations that succeeded before the failure.
         * The release call is order-wide and idempotent, so retrying
         * is safe and cannot restore stock twice.
         */
        try {
            await releaseOrderInventory(orderId);
        } catch (releaseError) {
            console.error(
                "Failed to release inventory after reservation failure:",
                releaseError
            );

            throw new AppError(
                "Unable to reserve inventory and release previous reservations",
                500
            );
        }

        const cancelled =
            await updateOrderStatus(
                orderId,
                "CANCELLED"
            );

        if (!cancelled) {
            throw new AppError(
                "Inventory reservation failed and order could not be cancelled",
                500
            );
        }

        throw error;
    }
};

const processOrderPayment = async (
    order: Order,
    paymentMethod:
        | PaymentMethod
        | undefined
): Promise<void> => {
    const result =
        await createPayment(
            order.id,
            order.total,
            paymentMethod ??
            DEFAULT_PAYMENT_METHOD,
            `order-payment-${order.id}`
        );

    if (
        result.status !== "SUCCESS"
    ) {
        try {
            await releaseOrderInventory(order.id);
        } catch (error) {
            console.error(
                "Failed to release inventory after payment failure:",
                error
            );

            throw new AppError(
                "Payment failed and inventory could not be released",
                500
            );
        }

        const cancelled =
            await updateOrderStatus(
                order.id,
                "CANCELLED"
            );

        if (!cancelled) {
            throw new AppError(
                "Payment failed and order could not be cancelled",
                500
            );
        }

        throw new AppError(
            "Payment failed",
            400
        );
    }

    /*
     * Finalize the reservation before marking the order confirmed.
     * If this fails the order stays PENDING_PAYMENT, so we never
     * report a confirmed order whose stock was not finalized.
     */
    try {
        await confirmInventory(order.id);
    } catch (error) {
        console.error(
            "Failed to confirm inventory after successful payment:",
            error
        );

        throw new AppError(
            "Payment succeeded but inventory could not be confirmed",
            500
        );
    }

    const updated =
        await updateOrderStatus(
            order.id,
            "CONFIRMED"
        );

    if (!updated) {
        throw new AppError(
            "Order could not be confirmed",
            500
        );
    }
};

const createCartOrder = async (
    userId: string,
    cartId: string,
    cartItems: CartItem[],
    idempotencyKey: string | null,
    paymentMethod:
        | PaymentMethod
        | undefined
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

        if (
            product.status !== "ACTIVE"
        ) {
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

    const order: Order = {
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

    await reserveOrderInventory(
        order.id,
        orderItems
    );

    await processOrderPayment(
        order,
        paymentMethod
    );

    await checkoutCart(
        cartId,
        userId
    );

    return {
        ...order,
        status: "CONFIRMED"
    };
};

const createBuyNowOrder = async (
    userId: string,
    productId: string,
    quantity: number,
    idempotencyKey: string | null,
    paymentMethod:
        | PaymentMethod
        | undefined
): Promise<Order> => {
    validateQuantity(quantity);

    const product =
        await getProductById(
            productId
        );

    if (
        product.status !== "ACTIVE"
    ) {
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

    const order: Order = {
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

    await reserveOrderInventory(
        order.id,
        [orderItem]
    );

    await processOrderPayment(
        order,
        paymentMethod
    );

    return {
        ...order,
        status: "CONFIRMED"
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

    if (
        dto.source === "CART"
    ) {
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
            idempotencyKey,
            dto.paymentMethod
        );
    }

    return createBuyNowOrder(
        userId,
        dto.productId,
        dto.quantity,
        idempotencyKey,
        dto.paymentMethod
    );
};

export const cancelOrder = async (
    userId: string,
    orderId: string
): Promise<Order> => {
    const order = await getUserOrderById(
        userId,
        orderId
    );

    if (order.status === "CANCELLED") {
        return order;
    }

    if (order.status === "CONFIRMED") {
        /*
         * The payment service has no refund transition, so allowing
         * this would restore stock without refunding the customer.
         */
        throw new AppError(
            "Confirmed orders cannot be cancelled",
            409
        );
    }

    try {
        await releaseOrderInventory(orderId);
    } catch (error) {
        console.error(
            "Failed to release inventory for cancellation:",
            error
        );

        throw new AppError(
            "Inventory could not be released; order was not cancelled",
            502
        );
    }

    const updated = await updateOrderStatus(
        orderId,
        "CANCELLED"
    );

    if (!updated) {
        throw new AppError(
            "Order could not be cancelled",
            500
        );
    }

    return {
        ...order,
        status: "CANCELLED"
    };
};

export const getUserOrdersPaginated = async (
    userId: string,
    page: number,
    pageSize: number
) => {
    if (
        !Number.isInteger(page) ||
        page <= 0
    ) {
        throw new AppError(
            "Page must be a positive integer",
            400
        );
    }

    if (
        !Number.isInteger(pageSize) ||
        pageSize <= 0
    ) {
        throw new AppError(
            "Page size must be a positive integer",
            400
        );
    }

    if (pageSize > 100) {
        throw new AppError(
            "Page size cannot exceed 100",
            400
        );
    }

    const offset =
        (page - 1) * pageSize;

    const result =
        await findOrdersByUserIdPaginated(
            userId,
            pageSize,
            offset
        );

    const totalPages =
        Math.ceil(
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