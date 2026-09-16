CREATE TABLE IF NOT EXISTS orders (
    id CHAR(36) NOT NULL,
    order_number VARCHAR(32) NOT NULL,
    user_id CHAR(36) NOT NULL,
    status ENUM(
        'PENDING_PAYMENT',
        'CONFIRMED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING_PAYMENT',
    subtotal DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_orders_order_number (order_number),
    KEY idx_orders_user_id (user_id),
    KEY idx_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;