CREATE TABLE users (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) NOT NULL UNIQUE,
 password VARCHAR(255) NOT NULL, name VARCHAR(255), role VARCHAR(255) NOT NULL
);
CREATE TABLE products (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL, description VARCHAR(2000) NOT NULL,
 price DECIMAL(12,2) NOT NULL, stock INT NOT NULL, category VARCHAR(60) NOT NULL,
 image VARCHAR(500) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
 CONSTRAINT ck_product_price CHECK (price > 0), CONSTRAINT ck_product_stock CHECK (stock >= 0)
);
CREATE INDEX ix_products_category ON products(category);
CREATE TABLE cart_items (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT NOT NULL, product_id BIGINT NOT NULL, quantity INT NOT NULL,
 CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id),
 CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(id),
 CONSTRAINT uq_cart_product UNIQUE (user_id, product_id), CONSTRAINT ck_cart_quantity CHECK (quantity BETWEEN 1 AND 99)
);
CREATE TABLE shop_orders (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT NOT NULL, idempotency_key VARCHAR(80) NOT NULL, fingerprint VARCHAR(64) NOT NULL,
 status VARCHAR(30) NOT NULL, payment_method VARCHAR(30) NOT NULL, payment_status VARCHAR(30) NOT NULL,
 recipient VARCHAR(120) NOT NULL, phone VARCHAR(30) NOT NULL, address VARCHAR(500) NOT NULL, city VARCHAR(100) NOT NULL,
 subtotal DECIMAL(12,2) NOT NULL, shipping DECIMAL(12,2) NOT NULL, total DECIMAL(12,2) NOT NULL,
 created_at TIMESTAMP(6) NOT NULL, CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id),
 CONSTRAINT uq_checkout UNIQUE (user_id, idempotency_key)
);
CREATE TABLE order_items (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, order_id BIGINT NOT NULL, product_id BIGINT NOT NULL,
 name VARCHAR(120) NOT NULL, image VARCHAR(500) NOT NULL, price DECIMAL(12,2) NOT NULL, quantity INT NOT NULL,
 CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES shop_orders(id),
 CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id),
 CONSTRAINT ck_order_quantity CHECK (quantity > 0)
);
CREATE TABLE auth_sessions (
 id VARCHAR(36) PRIMARY KEY, user_id BIGINT NOT NULL, refresh_hash VARCHAR(64) NOT NULL UNIQUE,
 expires_at TIMESTAMP(6) NOT NULL, CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX ix_session_expiry ON auth_sessions(expires_at);
