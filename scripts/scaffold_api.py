from pathlib import Path
base=Path('main/java/com/example/demo')
def w(rel,s):
 p=base/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s.strip()+'\n')
w('controller/AuthController.java','''
package com.example.demo.controller;
import com.example.demo.service.AuthService;
import com.example.demo.dto.*;
import com.example.demo.dto.Views.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.Valid;
@RestController @RequestMapping("/api")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth = auth; }
    @PostMapping("/auth/register") @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public AuthView register(@Valid @RequestBody RegisterRequest req) { return auth.register(req); }
    @PostMapping("/auth/login") public AuthView login(@Valid @RequestBody LoginRequest req) { return auth.login(req); }
    @PostMapping("/auth/refresh") public AuthView refresh(@Valid @RequestBody RefreshRequest req) { return auth.refresh(req.getRefreshToken()); }
    @PostMapping("/auth/logout") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void logout(@AuthenticationPrincipal Jwt jwt) { auth.logout(jwt.getId()); }
    @GetMapping("/users/me") public UserView me(@AuthenticationPrincipal Jwt jwt) { return auth.me(((Number)jwt.getClaim("uid")).longValue()); }
}
''')
w('controller/ProductController.java','''
package com.example.demo.controller;
import com.example.demo.service.ProductService;
import com.example.demo.dto.ProductRequest;
import com.example.demo.dto.Views.*;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
@RestController @RequestMapping("/api")
public class ProductController {
    private final ProductService products;
    public ProductController(ProductService products) { this.products = products; }
    @GetMapping("/products") public PageView<ProductView> list(@RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "") String category, @RequestParam(defaultValue = "newest") String sort, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size) { return products.list(q, category, sort, page, size, false); }
    @GetMapping("/products/{id}") public ProductView get(@PathVariable Long id) { return products.get(id); }
    @GetMapping("/categories") public List<String> categories() { return products.categories(); }
    @GetMapping("/admin/products") public PageView<ProductView> adminList(@RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "0") int page) { return products.list(q, "", "newest", page, 20, true); }
    @PostMapping("/admin/products") @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public ProductView create(@Valid @RequestBody ProductRequest req) { return products.save(null, req); }
    @PutMapping("/admin/products/{id}") public ProductView update(@PathVariable Long id, @Valid @RequestBody ProductRequest req) { return products.save(id, req); }
    @DeleteMapping("/admin/products/{id}") @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { products.delete(id); }
}
''')
w('controller/CartController.java','''
package com.example.demo.controller;
import com.example.demo.service.CartService;
import com.example.demo.dto.*;
import com.example.demo.dto.Views.CartView;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.Valid;
@RestController @RequestMapping("/api/cart")
public class CartController {
    private final CartService carts;
    public CartController(CartService carts) { this.carts = carts; }
    private Long uid(Jwt jwt) { return ((Number)jwt.getClaim("uid")).longValue(); }
    @GetMapping public CartView get(@AuthenticationPrincipal Jwt jwt) { return carts.get(uid(jwt)); }
    @PostMapping("/items") public CartView add(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CartRequest req) { return carts.add(uid(jwt), req.getProductId(), req.getQuantity()); }
    @PatchMapping("/items/{id}") public CartView update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @Valid @RequestBody QuantityRequest req) { return carts.update(uid(jwt), id, req.getQuantity()); }
    @DeleteMapping("/items/{id}") public CartView remove(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) { return carts.remove(uid(jwt), id); }
    @DeleteMapping @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT) public void clear(@AuthenticationPrincipal Jwt jwt) { carts.clear(uid(jwt)); }
}
''')
w('controller/OrderController.java','''
package com.example.demo.controller;
import com.example.demo.service.OrderService;
import com.example.demo.dto.*;
import com.example.demo.dto.Views.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import jakarta.validation.Valid;
@RestController @RequestMapping("/api")
public class OrderController {
    private final OrderService orders;
    public OrderController(OrderService orders) { this.orders = orders; }
    private Long uid(Jwt jwt) { return ((Number)jwt.getClaim("uid")).longValue(); }
    @PostMapping("/orders") @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public OrderView checkout(@AuthenticationPrincipal Jwt jwt, @RequestHeader("Idempotency-Key") String key, @Valid @RequestBody CheckoutRequest req) { return orders.checkout(uid(jwt), key, req); }
    @GetMapping("/orders") public PageView<OrderView> list(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "0") int page) { return orders.list(uid(jwt), false, page); }
    @GetMapping("/orders/{id}") public OrderView get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) { return orders.get(uid(jwt), id, false); }
    @PostMapping("/orders/{id}/cancel") public OrderView cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) { return orders.transition(uid(jwt), id, "CANCELLED", false); }
    @GetMapping("/admin/orders") public PageView<OrderView> adminList(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "0") int page) { return orders.list(uid(jwt), true, page); }
    @PatchMapping("/admin/orders/{id}/status") public OrderView status(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id, @Valid @RequestBody StatusRequest req) { return orders.transition(uid(jwt), id, req.getStatus(), true); }
}
''')
w('config/DemoData.java','''
package com.example.demo.config;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import org.springframework.context.annotation.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.math.BigDecimal;
@Configuration @Profile("demo")
public class DemoData {
    @Bean CommandLineRunner seed(UserRepository users, ProductRepository products, PasswordEncoder encoder) {
        return args -> {
            if (users.findByEmail("admin@atelier.local").isEmpty()) {
                User admin = new User(); admin.setName("Store Admin"); admin.setEmail("admin@atelier.local"); admin.setPassword(encoder.encode("AdminDemo123!")); admin.setRole(User.Role.ADMIN); users.save(admin);
            }
            if (users.findByEmail("customer@atelier.local").isEmpty()) {
                User customer = new User(); customer.setName("Alex Morgan"); customer.setEmail("customer@atelier.local"); customer.setPassword(encoder.encode("CustomerDemo123!")); customer.setRole(User.Role.USER); users.save(customer);
            }
            if (products.count() == 0) {
                String[][] catalog = {
                    {"Everyday Tote", "A roomy cotton canvas tote with reinforced handles. Made for market mornings, workdays, and everything in between.", "890", "24", "Everyday", "tote"},
                    {"Arc Desk Lamp", "A sculptural, adjustable desk lamp with a warm LED glow and a powder-coated steel shade. A softer light for focused evenings.", "3450", "12", "Workspace", "lamp"},
                    {"Studio Headphones", "Over-ear wireless headphones with cushioned ear cups, balanced sound, and up to 30 hours of listening time.", "4250", "18", "Technology", "headphones"},
                    {"Stoneware Mug", "A generously sized stoneware mug with a matte glaze and a comfortable handle. Dishwasher safe. Capacity: 350 ml.", "680", "40", "Home & Living", "mug"},
                    {"Linen Notebook", "A cloth-bound notebook with 160 pages of smooth, dotted paper. Lay-flat binding keeps your ideas moving.", "540", "35", "Workspace", "notebook"},
                    {"Form Water Bottle", "A double-wall insulated steel bottle that keeps drinks cold for 24 hours. Leakproof twist lid. Capacity: 600 ml.", "1290", "28", "Everyday", "bottle"},
                    {"Pocket Speaker", "A compact Bluetooth speaker with clear, room-filling sound. USB-C charging and a woven carrying loop for everyday adventures.", "2490", "15", "Technology", "speaker"},
                    {"Organic Cotton Throw", "A breathable, textured cotton throw with a soft fringed edge. A little extra comfort for slow mornings. 130 × 170 cm.", "2190", "16", "Home & Living", "throw"}
                };
                for (String[] row : catalog) {
                    Product p = new Product(); p.setName(row[0]); p.setDescription(row[1]); p.setPrice(new BigDecimal(row[2])); p.setStock(Integer.parseInt(row[3])); p.setCategory(row[4]); p.setImage("/assets/" + row[5] + ".svg"); products.save(p);
                }
            }
        };
    }
}
''')
w('config/SessionCleanup.java','''
package com.example.demo.config;
import com.example.demo.repository.SessionRepository;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
@Configuration @EnableScheduling
public class SessionCleanup {
    private final SessionRepository sessions;
    public SessionCleanup(SessionRepository sessions) { this.sessions = sessions; }
    @Scheduled(fixedDelay = 3600000) @Transactional public void clearExpired() { sessions.deleteByExpiresAtBefore(Instant.now()); }
}
''')
r=Path('main/resources');(r/'db/migration').mkdir(parents=True,exist_ok=True)
(r/'application.properties').write_text('''spring.application.name=atelier-api
spring.profiles.default=demo
spring.jpa.open-in-view=false
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
spring.flyway.enabled=true
server.port=${PORT:8081}
server.error.include-message=never
server.error.include-stacktrace=never
app.cors-origins=${CORS_ORIGINS:http://localhost:4200}
management.endpoints.web.exposure.include=health,info
management.endpoint.health.show-details=never
jwt.secret=${JWT_SECRET}
''')
(r/'application-demo.properties').write_text('''spring.datasource.url=jdbc:h2:file:./data/atelier;MODE=MySQL;DATABASE_TO_LOWER=TRUE;AUTO_SERVER=FALSE
spring.datasource.username=sa
spring.datasource.password=
spring.datasource.driver-class-name=org.h2.Driver
jwt.secret=demo-only-signing-key-change-before-any-public-deployment-2026
''')
(r/'application-prod.properties').write_text('''spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
spring.datasource.hikari.maximum-pool-size=10
''')
(r/'db/migration/V1__create_store.sql').write_text('''CREATE TABLE users (
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
''')
# Isolated in-memory database for automated tests; no demo users or live database access.
t=Path('test/resources');t.mkdir(parents=True,exist_ok=True)
(t/'application-test.properties').write_text('''spring.datasource.url=jdbc:h2:mem:atelier-test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
jwt.secret=test-only-signing-key-at-least-32-characters-long
''')
p=Path('test/java/com/example/demo/DemoApplicationTests.java');s=p.read_text().replace('@SpringBootTest', '@org.springframework.test.context.ActiveProfiles("test")\n@SpringBootTest');p.write_text(s)
