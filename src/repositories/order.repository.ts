import type {
    ResultSetHeader,
    RowDataPacket
} from "mysql2/promise";
import pool from "../config/database";
import {
    createOrderItemQuery,
    createOrderQuery,
    findOrderByIdQuery,
    findOrderItemsQuery,
    findOrdersByUserIdPaginatedQuery,
    countOrdersByUserIdQuery,
    updateOrderStatusQuery,
    findOrderByUserIdAndIdempotencyKeyQuery
} from "../queries/order.queries";

export interface OrderRecord {
    id: string;
    orderNumber: string;
    userId: string;
    status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED";
    subtotal: number;
    total: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderItemRecord {
    id: string;
    orderId: string;
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    createdAt: Date;
}

interface OrderRow extends RowDataPacket {
    id: string;
    order_number: string;
    user_id: string;
    status: OrderRecord["status"];
    subtotal: string;
    total: string;
    created_at: Date;
    updated_at: Date;
}

interface OrderItemRow extends RowDataPacket {
    id: string;
    order_id: string;
    product_id: string;
    product_name: string;
    sku: string;
    quantity: number;
    unit_price: string;
    line_total: string;
    created_at: Date;
}

interface CountRow extends RowDataPacket {
    total: number | string;
}

export interface CreateOrderData {
    id: string;
    orderNumber: string;
    userId: string;
    status: OrderRecord["status"];
    subtotal: number;
    total: number;
    idempotencyKey: string | null;
}

export interface CreateOrderItemData {
    id: string;
    orderId: string;
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface PaginatedOrders {
    orders: OrderRecord[];
    totalItems: number;
}

const mapOrder = (row: OrderRow): OrderRecord => ({
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    status: row.status,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const mapOrderItem = (
    row: OrderItemRow
): OrderItemRecord => ({
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    sku: row.sku,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
    createdAt: row.created_at
});

export const createOrder = async (
    order: CreateOrderData,
    items: CreateOrderItemData[]
): Promise<OrderRecord> => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        await connection.execute<ResultSetHeader>(
            createOrderQuery,
            [
                order.id,
                order.orderNumber,
                order.userId,
                order.status,
                order.subtotal,
                order.total,
                order.idempotencyKey
            ]
        );

        for (const item of items) {
            await connection.execute<ResultSetHeader>(
                createOrderItemQuery,
                [
                    item.id,
                    item.orderId,
                    item.productId,
                    item.productName,
                    item.sku,
                    item.quantity,
                    item.unitPrice,
                    item.lineTotal
                ]
            );
        }

        await connection.commit();

        const [rows] =
            await connection.execute<OrderRow[]>(
                findOrderByIdQuery,
                [order.id]
            );

        if (rows.length === 0) {
            throw new Error(
                "Created order could not be retrieved"
            );
        }

        return mapOrder(rows[0]);
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

export const findOrderById = async (
    orderId: string
): Promise<OrderRecord | null> => {
    const [rows] = await pool.execute<OrderRow[]>(
        findOrderByIdQuery,
        [orderId]
    );

    if (rows.length === 0) {
        return null;
    }

    return mapOrder(rows[0]);
};

export const findOrderByUserIdAndIdempotencyKey = async (
    userId: string,
    idempotencyKey: string
): Promise<OrderRecord | null> => {
    const [rows] =
        await pool.execute<OrderRow[]>(
            findOrderByUserIdAndIdempotencyKeyQuery,
            [userId, idempotencyKey]
        );

    if (rows.length === 0) {
        return null;
    }

    return mapOrder(rows[0]);
};

export const findOrdersByUserIdPaginated = async (
    userId: string,
    limit: number,
    offset: number
): Promise<PaginatedOrders> => {
    const [orderRows, countRows] =
        await Promise.all([
            pool.execute<OrderRow[]>(
                findOrdersByUserIdPaginatedQuery,
                [userId, limit, offset]
            ),
            pool.execute<CountRow[]>(
                countOrdersByUserIdQuery,
                [userId]
            )
        ]);

    const [rows] = orderRows;
    const [countResult] = countRows;

    return {
        orders: rows.map(mapOrder),
        totalItems: Number(
            countResult[0]?.total ?? 0
        )
    };
};

export const findOrderItems = async (
    orderId: string
): Promise<OrderItemRecord[]> => {
    const [rows] = await pool.execute<OrderItemRow[]>(
        findOrderItemsQuery,
        [orderId]
    );

    return rows.map(mapOrderItem);
};

export const updateOrderStatus = async (
    orderId: string,
    status: OrderRecord["status"]
): Promise<boolean> => {
    const [result] =
        await pool.execute<ResultSetHeader>(
            updateOrderStatusQuery,
            [status, orderId]
        );

    return result.affectedRows > 0;
};