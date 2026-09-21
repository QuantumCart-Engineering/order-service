export const createOrderQuery = `
    INSERT INTO orders (
        id,
        order_number,
        user_id,
        status,
        subtotal,
        total,
        idempotency_key
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
`;

export const findOrderByIdQuery = `
    SELECT
        id,
        order_number,
        user_id,
        status,
        subtotal,
        total,
        created_at,
        updated_at
    FROM orders
    WHERE id = ?
    LIMIT 1
`;

export const findOrderByUserIdAndIdempotencyKeyQuery = `
    SELECT
        id,
        order_number,
        user_id,
        status,
        subtotal,
        total,
        created_at,
        updated_at
    FROM orders
    WHERE user_id = ?
      AND idempotency_key = ?
    LIMIT 1
`;

export const countOrdersByUserIdQuery = `
    SELECT COUNT(*) AS total
    FROM orders
    WHERE user_id = ?
`;

export const findOrdersByUserIdPaginatedQuery = `
    SELECT
        id,
        order_number,
        user_id,
        status,
        subtotal,
        total,
        created_at,
        updated_at
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ? OFFSET ?
`;

export const findOrderItemByIdQuery = `
    SELECT
        id,
        order_id,
        product_id,
        product_name,
        sku,
        quantity,
        unit_price,
        line_total,
        created_at
    FROM order_items
    WHERE id = ?
    LIMIT 1
`;

export const findOrderItemsQuery = `
    SELECT
        id,
        order_id,
        product_id,
        product_name,
        sku,
        quantity,
        unit_price,
        line_total,
        created_at
    FROM order_items
    WHERE order_id = ?
    ORDER BY created_at ASC, id ASC
`;

export const createOrderItemQuery = `
    INSERT INTO order_items (
        id,
        order_id,
        product_id,
        product_name,
        sku,
        quantity,
        unit_price,
        line_total
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

export const updateOrderStatusQuery = `
    UPDATE orders
    SET
        status = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
`;