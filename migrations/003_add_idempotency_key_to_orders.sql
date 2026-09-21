ALTER TABLE orders
ADD COLUMN idempotency_key VARCHAR(100) NULL,
ADD UNIQUE KEY uq_orders_user_idempotency_key (user_id, idempotency_key);