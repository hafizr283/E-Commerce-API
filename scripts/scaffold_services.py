from pathlib import Path
base=Path('main/java/com/example/demo')
def w(rel,s):
 p=base/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s.strip()+'\n')
w('config/JwtConfig.java','''
package com.example.demo.config;
import com.example.demo.repository.SessionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import javax.crypto.spec.SecretKeySpec;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
@Configuration
public class JwtConfig {
    @Bean
    public SecretKeySpec signingKey(@Value("${jwt.secret}") String secret) {
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32) throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }
    @Bean public JwtEncoder jwtEncoder(SecretKeySpec key) { return new NimbusJwtEncoder(new ImmutableSecret<>(key)); }
    @Bean public JwtDecoder jwtDecoder(SecretKeySpec key, SessionRepository sessions) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        OAuth2TokenValidator<Jwt> sessionValidator = jwt -> {
            String id = jwt.getId();
            if (id != null && sessions.findById(id).filter(s -> s.getExpiresAt().isAfter(Instant.now())).isPresent()) return OAuth2TokenValidatorResult.success();
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Session expired or revoked", null));
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer("atelier-api"), sessionValidator));
        return decoder;
    }
}
''')
w('config/JwtUtil.java','''
package com.example.demo.config;
import com.example.demo.model.User;
import org.springframework.stereotype.Component;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import java.time.Instant;
@Component
public class JwtUtil {
    private final JwtEncoder encoder;
    public JwtUtil(JwtEncoder encoder) { this.encoder = encoder; }
    public String generateToken(User user, String sessionId) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer("atelier-api").subject(user.getEmail()).id(sessionId)
            .issuedAt(now).expiresAt(now.plusSeconds(900)).claim("uid", user.getId()).claim("role", user.getRole().name()).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
''')
w('config/SecurityConfig.java','''
package com.example.demo.config;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;
import org.springframework.beans.factory.annotation.Value;
import java.util.List;
@Configuration
public class SecurityConfig {
    @Bean public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        JwtGrantedAuthoritiesConverter roles = new JwtGrantedAuthoritiesConverter();
        roles.setAuthoritiesClaimName("role"); roles.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(roles);
        http.csrf(csrf -> csrf.disable()) // API uses explicit bearer headers, never ambient authentication cookies.
            .cors(cors -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/refresh", "/actuator/health", "/error").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products", "/api/products/**", "/api/categories").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(converter))
                .authenticationEntryPoint((req, res, ex) -> { res.setStatus(401); res.setContentType("application/json"); res.getWriter().write("{\\"message\\":\\"Please sign in to continue.\\"}"); }))
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> { res.setStatus(401); res.setContentType("application/json"); res.getWriter().write("{\\"message\\":\\"Please sign in to continue.\\"}"); })
                .accessDeniedHandler((req, res, ex) -> { res.setStatus(403); res.setContentType("application/json"); res.getWriter().write("{\\"message\\":\\"You do not have permission for this action.\\"}"); }));
        return http.build();
    }
    @Bean public CorsConfigurationSource corsSource(@Value("${app.cors-origins}") List<String> origins) {
        CorsConfiguration c = new CorsConfiguration(); c.setAllowedOrigins(origins);
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/api/**", c); return source;
    }
}
''')
w('service/AuthService.java','''
package com.example.demo.service;
import com.example.demo.config.JwtUtil;
import com.example.demo.dto.*;
import com.example.demo.dto.Views.*;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.http.HttpStatus;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
@Service
public class AuthService {
    private final UserRepository users;
    private final SessionRepository sessions;
    private final PasswordEncoder encoder;
    private final JwtUtil jwt;
    private final String dummyHash;
    public AuthService(UserRepository users, SessionRepository sessions, PasswordEncoder encoder, JwtUtil jwt) {
        this.users = users; this.sessions = sessions; this.encoder = encoder; this.jwt = jwt;
        this.dummyHash = encoder.encode(UUID.randomUUID().toString());
    }
    @Transactional public AuthView register(RegisterRequest req) {
        checkPassword(req.getPassword());
        String email = req.getEmail().strip().toLowerCase(Locale.ROOT);
        if (users.findByEmail(email).isPresent()) throw ApiException.conflict("This email is already registered.");
        User user = new User(); user.setName(req.getName().strip()); user.setEmail(email);
        user.setPassword(encoder.encode(req.getPassword())); user.setRole(User.Role.USER);
        users.saveAndFlush(user); return newSession(user);
    }
    @Transactional public AuthView login(LoginRequest req) {
        User user = users.findByEmail(req.getEmail().strip().toLowerCase(Locale.ROOT)).orElse(null);
        boolean matches = encoder.matches(req.getPassword(), user == null ? dummyHash : user.getPassword());
        if (user == null || !matches) throw new ApiException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect.");
        return newSession(user);
    }
    private AuthView newSession(User user) {
        String refresh = refreshToken(); AuthSession s = new AuthSession(); s.setId(UUID.randomUUID().toString());
        s.setUserId(user.getId()); s.setRefreshHash(hash(refresh)); s.setExpiresAt(Instant.now().plusSeconds(604800));
        sessions.save(s); return new AuthView(jwt.generateToken(user, s.getId()), refresh, view(user));
    }
    @Transactional public AuthView refresh(String token) {
        AuthSession session = sessions.lockByRefreshHash(hash(token)).filter(s -> s.getExpiresAt().isAfter(Instant.now()))
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session expired. Please sign in again."));
        String next = refreshToken(); session.setRefreshHash(hash(next));
        User user = users.findById(session.getUserId()).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Account not found."));
        return new AuthView(jwt.generateToken(user, session.getId()), next, view(user));
    }
    @Transactional public void logout(String sessionId) { sessions.deleteById(sessionId); }
    @Transactional(readOnly = true) public UserView me(Long id) { return view(users.findById(id).orElseThrow(() -> ApiException.missing("Account not found."))); }
    public static UserView view(User user) { return new UserView(user.getId(), user.getName(), user.getEmail(), user.getRole().name()); }
    public static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private static String refreshToken() { byte[] bytes = new byte[48]; new SecureRandom().nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    private void checkPassword(String password) { if (password.getBytes(StandardCharsets.UTF_8).length > 72) throw new ApiException(HttpStatus.BAD_REQUEST, "Password must be no more than 72 UTF-8 bytes."); }
}
''')
w('service/ProductService.java','''
package com.example.demo.service;
import com.example.demo.model.Product;
import com.example.demo.repository.ProductRepository;
import com.example.demo.dto.*;
import com.example.demo.dto.Views.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import java.util.List;
@Service
public class ProductService {
    private final ProductRepository products;
    public ProductService(ProductRepository products) { this.products = products; }
    @Transactional(readOnly = true) public PageView<ProductView> list(String q, String category, String sort, int page, int size, boolean admin) {
        Sort ordering = switch (sort) { case "priceAsc" -> Sort.by("price").ascending(); case "priceDesc" -> Sort.by("price").descending(); case "name" -> Sort.by("name"); default -> Sort.by("id").descending(); };
        Page<Product> result = products.search(q.strip(), category.strip(), admin, PageRequest.of(Math.max(0, page), Math.min(48, Math.max(1, size)), ordering.and(Sort.by("id"))));
        return new PageView<>(result.map(ProductService::view).getContent(), result.getNumber(), result.getTotalPages(), result.getTotalElements());
    }
    @Transactional(readOnly = true) public ProductView get(Long id) { return view(products.findById(id).filter(Product::getActive).orElseThrow(() -> ApiException.missing("Product not found."))); }
    public List<String> categories() { return products.categories(); }
    @Transactional public ProductView save(Long id, ProductRequest req) {
        Product p = id == null ? new Product() : products.lockById(id).orElseThrow(() -> ApiException.missing("Product not found."));
        p.setName(req.getName().strip()); p.setDescription(req.getDescription().strip()); p.setCategory(req.getCategory().strip());
        p.setPrice(req.getPrice()); p.setStock(req.getStock()); p.setImage(req.getImage()); p.setActive(req.getActive());
        return view(products.save(p));
    }
    @Transactional public void delete(Long id) { products.lockById(id).orElseThrow(() -> ApiException.missing("Product not found.")).setActive(false); }
    public static ProductView view(Product p) { return new ProductView(p.getId(), p.getName(), p.getDescription(), p.getPrice(), p.getStock(), p.getCategory(), p.getImage(), p.getActive()); }
}
''')
w('service/CartService.java','''
package com.example.demo.service;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import com.example.demo.dto.Views.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
@Service
public class CartService {
    private final CartRepository carts; private final ProductRepository products; private final UserRepository users;
    public CartService(CartRepository carts, ProductRepository products, UserRepository users) { this.carts = carts; this.products = products; this.users = users; }
    @Transactional(readOnly = true) public CartView get(Long userId) {
        List<CartItemView> items = carts.findByUserIdOrderById(userId).stream().map(c -> new CartItemView(c.getId(), ProductService.view(c.getProduct()), c.getQuantity(), c.getProduct().getPrice().multiply(BigDecimal.valueOf(c.getQuantity())))).toList();
        BigDecimal subtotal = items.stream().map(CartItemView::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal shipping = shipping(subtotal); return new CartView(items, subtotal, shipping, subtotal.add(shipping));
    }
    @Transactional public CartView add(Long userId, Long productId, int quantity) {
        lockUser(userId);
        Product product = products.findById(productId).filter(Product::getActive).orElseThrow(() -> ApiException.missing("Product not found."));
        Cart item = carts.findByUserIdAndProductId(userId, productId).orElseGet(() -> { Cart c = new Cart(); c.setUserId(userId); c.setProduct(product); return c; });
        int next = item.getQuantity() + quantity; validate(product, next); item.setQuantity(next); carts.saveAndFlush(item); return get(userId);
    }
    @Transactional public CartView update(Long userId, Long id, int quantity) {
        lockUser(userId); Cart item = carts.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.missing("Cart item not found."));
        validate(item.getProduct(), quantity); item.setQuantity(quantity); return get(userId);
    }
    @Transactional public CartView remove(Long userId, Long id) {
        lockUser(userId); carts.delete(carts.findByIdAndUserId(id, userId).orElseThrow(() -> ApiException.missing("Cart item not found."))); carts.flush(); return get(userId);
    }
    @Transactional public void clear(Long userId) { lockUser(userId); carts.deleteByUserId(userId); }
    private void lockUser(Long id) { users.lockById(id).orElseThrow(() -> ApiException.missing("Account not found.")); }
    private void validate(Product p, int qty) { if (!p.getActive() || qty < 1 || qty > 99 || qty > p.getStock()) throw ApiException.conflict("Requested quantity is unavailable for " + p.getName() + "."); }
    public static BigDecimal shipping(BigDecimal subtotal) { return subtotal.signum() == 0 || subtotal.compareTo(new BigDecimal("5000")) >= 0 ? new BigDecimal("0.00") : new BigDecimal("120.00"); }
}
''')
w('service/OrderService.java','''
package com.example.demo.service;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import com.example.demo.dto.CheckoutRequest;
import com.example.demo.dto.Views.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.*;
import java.math.BigDecimal;
import java.util.*;
@Service
public class OrderService {
    private final OrderRepository orders; private final CartRepository carts; private final ProductRepository products; private final UserRepository users;
    public OrderService(OrderRepository orders, CartRepository carts, ProductRepository products, UserRepository users) { this.orders = orders; this.carts = carts; this.products = products; this.users = users; }
    @Transactional public OrderView checkout(Long userId, String key, CheckoutRequest req) {
        if (!key.matches("[a-zA-Z0-9_-]{8,80}")) throw new ApiException(HttpStatus.BAD_REQUEST, "Supply an Idempotency-Key of 8–80 letters, digits, underscores or hyphens.");
        users.lockById(userId).orElseThrow(() -> ApiException.missing("Account not found."));
        String fingerprint = AuthService.hash(req.getRecipient().strip() + "\\n" + req.getPhone().strip() + "\\n" + req.getAddress().strip() + "\\n" + req.getCity().strip());
        Optional<Order> previous = orders.findByUserIdAndIdempotencyKey(userId, key);
        if (previous.isPresent()) {
            if (!previous.get().getFingerprint().equals(fingerprint)) throw ApiException.conflict("This checkout key was used with different delivery details.");
            return view(previous.get());
        }
        List<Cart> cart = carts.findByUserIdOrderById(userId);
        if (cart.isEmpty()) throw ApiException.conflict("Your cart is empty.");
        // Lock products in a consistent order so concurrent checkouts cannot oversell or deadlock each other.
        Map<Long, Product> locked = new HashMap<>();
        cart.stream().map(c -> c.getProduct().getId()).sorted().forEach(id -> locked.put(id, products.lockById(id).orElseThrow(() -> ApiException.missing("Product not found."))));
        Order order = new Order(); order.setUserId(userId); order.setIdempotencyKey(key); order.setFingerprint(fingerprint);
        order.setRecipient(req.getRecipient().strip()); order.setPhone(req.getPhone().strip()); order.setAddress(req.getAddress().strip()); order.setCity(req.getCity().strip());
        BigDecimal subtotal = BigDecimal.ZERO;
        for (Cart c : cart) {
            Product p = locked.get(c.getProduct().getId());
            if (!p.getActive() || p.getStock() < c.getQuantity()) throw ApiException.conflict("Not enough stock for " + p.getName() + ". Please update your cart.");
            p.setStock(p.getStock() - c.getQuantity());
            OrderItem item = new OrderItem(); item.setOrder(order); item.setProductId(p.getId()); item.setName(p.getName()); item.setImage(p.getImage()); item.setPrice(p.getPrice()); item.setQuantity(c.getQuantity()); order.getItems().add(item);
            subtotal = subtotal.add(p.getPrice().multiply(BigDecimal.valueOf(c.getQuantity())));
        }
        order.setSubtotal(subtotal); order.setShipping(CartService.shipping(subtotal)); order.setTotal(subtotal.add(order.getShipping()));
        orders.saveAndFlush(order); carts.deleteAll(cart); return view(order);
    }
    @Transactional(readOnly = true) public PageView<OrderView> list(Long userId, boolean admin, int page) {
        Pageable pageable = PageRequest.of(Math.max(0, page), 20, Sort.by("id").descending());
        Page<Order> result = admin ? orders.findAll(pageable) : orders.findByUserId(userId, pageable);
        return new PageView<>(result.map(OrderService::view).getContent(), result.getNumber(), result.getTotalPages(), result.getTotalElements());
    }
    @Transactional(readOnly = true) public OrderView get(Long userId, Long id, boolean admin) {
        Order order = orders.findById(id).orElseThrow(() -> ApiException.missing("Order not found.")); checkOwner(order, userId, admin); return view(order);
    }
    @Transactional public OrderView transition(Long userId, Long id, String next, boolean admin) {
        Order order = orders.lockById(id).orElseThrow(() -> ApiException.missing("Order not found.")); checkOwner(order, userId, admin);
        if (!admin && !next.equals("CANCELLED")) throw new ApiException(HttpStatus.FORBIDDEN, "Only an admin can change fulfillment status.");
        if (order.getStatus().equals(next)) return view(order);
        boolean allowed = order.getStatus().equals("CONFIRMED") && (next.equals("CANCELLED") || admin && next.equals("SHIPPED"))
            || admin && order.getStatus().equals("SHIPPED") && next.equals("DELIVERED");
        if (!allowed) throw ApiException.conflict("This order cannot move from " + order.getStatus() + " to " + next + ".");
        if (next.equals("CANCELLED")) {
            order.getItems().stream().sorted(Comparator.comparing(OrderItem::getProductId)).forEach(i -> {
                Product p = products.lockById(i.getProductId()).orElseThrow(() -> ApiException.missing("Product not found.")); p.setStock(p.getStock() + i.getQuantity());
            }); order.setPaymentStatus("CANCELLED");
        }
        if (next.equals("DELIVERED")) order.setPaymentStatus("PAID");
        order.setStatus(next); return view(order);
    }
    private void checkOwner(Order order, Long userId, boolean admin) { if (!admin && !order.getUserId().equals(userId)) throw ApiException.missing("Order not found."); }
    public static OrderView view(Order o) { return new OrderView(o.getId(), o.getUserId(), o.getStatus(), o.getPaymentMethod(), o.getPaymentStatus(), o.getRecipient(), o.getPhone(), o.getAddress(), o.getCity(), o.getSubtotal(), o.getShipping(), o.getTotal(), o.getCreatedAt(), o.getItems().stream().map(i -> new OrderItemView(i.getProductId(), i.getName(), i.getImage(), i.getPrice(), i.getQuantity())).toList()); }
}
''')
