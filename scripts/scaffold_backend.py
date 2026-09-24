from pathlib import Path
import re
root=Path('..')
pom=root/'pom.xml'
s=pom.read_text()
s=re.sub(r'<dependency>\s*<groupId>io.jsonwebtoken</groupId>.*?</dependency>', '', s, flags=re.S)
s=re.sub(r'<dependency>\s*<groupId>javax.xml.bind</groupId>.*?</dependency>', '', s, flags=re.S)
s=re.sub(r'<!--(\s*<dependency>)-->\s*<!--(\s*<groupId>org.springframework.boot</groupId>)-->\s*<!--(\s*<artifactId>spring-boot-starter-security</artifactId>)-->\s*<!--(\s*</dependency>)-->', lambda m:'\n'.join(m.groups()), s)
deps='''
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-oauth2-resource-server</artifactId></dependency>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-actuator</artifactId></dependency>
        <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-flyway</artifactId></dependency>
        <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-mysql</artifactId></dependency>
        <dependency><groupId>com.h2database</groupId><artifactId>h2</artifactId><scope>runtime</scope></dependency>
'''
s=s.replace('</dependencies>', deps+'\t</dependencies>')
pom.write_text(s)
base=root/'src/main/java/com/example/demo'
def write(rel,content):
 p=base/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content.strip()+'\n')
def bean(rel,imports,annotations,fields,extra=''):
 cls=Path(rel).stem;pkg=rel.split('/')[0]
 out=f'package com.example.demo.{pkg};\n\n{imports}\n\n{annotations}\npublic class {cls} {{\n'
 for typ,name,ann,default in fields:out+=f'    {ann}\n    private {typ} {name}{" = "+default if default else ""};\n'
 out+=f'\n    public {cls}() {{\n    }}\n'
 for typ,name,ann,default in fields:
  cap=name[0].upper()+name[1:]
  out+=f'\n    public {typ} get{cap}() {{ return {name}; }}\n    public void set{cap}({typ} {name}) {{ this.{name} = {name}; }}\n'
 out+=extra+'\n}\n';write(rel,out)
bean('model/Product.java','import jakarta.persistence.*;\nimport java.math.BigDecimal;','@Entity\n@Table(name = "products")',[
 ('Long','id','@Id @GeneratedValue(strategy = GenerationType.IDENTITY)',''),('String','name','@Column(nullable = false, length = 120)',''),('String','description','@Column(nullable = false, length = 2000)',''),('BigDecimal','price','@Column(nullable = false, precision = 12, scale = 2)',''),('Integer','stock','@Column(nullable = false)',''),('String','category','@Column(nullable = false, length = 60)',''),('String','image','@Column(nullable = false, length = 500)',''),('boolean','active','@Column(nullable = false)','true')])
bean('model/Cart.java','import jakarta.persistence.*;','@Entity\n@Table(name = "cart_items", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "product_id"}))',[
 ('Long','id','@Id @GeneratedValue(strategy = GenerationType.IDENTITY)',''),('Long','userId','@Column(name = "user_id", nullable = false)',''),('Product','product','@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "product_id", nullable = false)',''),('int','quantity','@Column(nullable = false)','')])
bean('model/Order.java','import jakarta.persistence.*;\nimport java.math.BigDecimal;\nimport java.time.Instant;\nimport java.util.ArrayList;\nimport java.util.List;','@Entity\n@Table(name = "shop_orders", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "idempotency_key"}))',[
 ('Long','id','@Id @GeneratedValue(strategy = GenerationType.IDENTITY)',''),('Long','userId','@Column(name = "user_id", nullable = false)',''),('String','idempotencyKey','@Column(name = "idempotency_key", nullable = false, length = 80)',''),('String','fingerprint','@Column(nullable = false, length = 64)',''),('String','status','@Column(nullable = false, length = 30)','"CONFIRMED"'),('String','paymentMethod','@Column(nullable = false, length = 30)','"CASH_ON_DELIVERY"'),('String','paymentStatus','@Column(nullable = false, length = 30)','"UNPAID"'),('String','recipient','@Column(nullable = false, length = 120)',''),('String','phone','@Column(nullable = false, length = 30)',''),('String','address','@Column(nullable = false, length = 500)',''),('String','city','@Column(nullable = false, length = 100)',''),('BigDecimal','subtotal','@Column(nullable = false, precision = 12, scale = 2)',''),('BigDecimal','shipping','@Column(nullable = false, precision = 12, scale = 2)',''),('BigDecimal','total','@Column(nullable = false, precision = 12, scale = 2)',''),('Instant','createdAt','@Column(nullable = false)','Instant.now()'),('List<OrderItem>','items','@OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("id ASC")','new ArrayList<>()')])
bean('model/OrderItem.java','import jakarta.persistence.*;\nimport java.math.BigDecimal;','@Entity\n@Table(name = "order_items")',[
 ('Long','id','@Id @GeneratedValue(strategy = GenerationType.IDENTITY)',''),('Order','order','@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "order_id", nullable = false)',''),('Long','productId','@Column(nullable = false)',''),('String','name','@Column(nullable = false, length = 120)',''),('String','image','@Column(nullable = false, length = 500)',''),('BigDecimal','price','@Column(nullable = false, precision = 12, scale = 2)',''),('int','quantity','@Column(nullable = false)','')])
bean('model/AuthSession.java','import jakarta.persistence.*;\nimport java.time.Instant;','@Entity\n@Table(name = "auth_sessions")',[
 ('String','id','@Id @Column(length = 36)',''),('Long','userId','@Column(nullable = false)',''),('String','refreshHash','@Column(nullable = false, unique = true, length = 64)',''),('Instant','expiresAt','@Column(nullable = false)','')])
requests={
 'LoginRequest':[('String','email','@NotBlank @Email @Size(max = 255)',''),('String','password','@NotBlank @Size(max = 72)','')],
 'RegisterRequest':[('String','name','@NotBlank @Size(max = 120)',''),('String','email','@NotBlank @Email @Size(max = 255)',''),('String','password','@NotBlank @Size(min = 8, max = 72)','')],
 'ProductRequest':[('String','name','@NotBlank @Size(max = 120)',''),('String','description','@NotBlank @Size(max = 2000)',''),('java.math.BigDecimal','price','@NotNull @DecimalMin("0.01") @DecimalMax("9999999.99") @Digits(integer = 7, fraction = 2)',''),('Integer','stock','@NotNull @Min(0) @Max(1000000)',''),('String','category','@NotBlank @Size(max = 60)',''),('String','image','@NotBlank @Size(max = 500) @Pattern(regexp = "^(/assets/[a-zA-Z0-9._/-]+|https://[^\\\\s]+)$", message = "Use an HTTPS image URL or a local asset path")',''),('Boolean','active','@NotNull','true')],
 'CartRequest':[('Long','productId','@NotNull @Positive',''),('Integer','quantity','@NotNull @Min(1) @Max(99)','')],
 'QuantityRequest':[('Integer','quantity','@NotNull @Min(1) @Max(99)','')],
 'CheckoutRequest':[('String','recipient','@NotBlank @Size(max = 120)',''),('String','phone','@NotBlank @Pattern(regexp = "^[+0-9 ()-]{7,30}$", message = "Enter a valid phone number")',''),('String','address','@NotBlank @Size(max = 500)',''),('String','city','@NotBlank @Size(max = 100)','')],
 'RefreshRequest':[('String','refreshToken','@NotBlank @Size(max = 200)','')],
 'StatusRequest':[('String','status','@NotBlank @Pattern(regexp = "SHIPPED|DELIVERED|CANCELLED")','')]
}
for name,fields in requests.items():bean('dto/'+name+'.java','import jakarta.validation.constraints.*;','',fields)
write('dto/Views.java','''
package com.example.demo.dto;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
// Java records are immutable response DTOs; no Lombok or annotation processing is used.
public final class Views {
    private Views() { }
    public record UserView(Long id, String name, String email, String role) { }
    public record AuthView(String token, String refreshToken, UserView user) { }
    public record ProductView(Long id, String name, String description, BigDecimal price, int stock, String category, String image, boolean active) { }
    public record PageView<T>(List<T> items, int page, int totalPages, long totalElements) { }
    public record CartItemView(Long id, ProductView product, int quantity, BigDecimal lineTotal) { }
    public record CartView(List<CartItemView> items, BigDecimal subtotal, BigDecimal shipping, BigDecimal total) { }
    public record OrderItemView(Long productId, String name, String image, BigDecimal price, int quantity) { }
    public record OrderView(Long id, Long userId, String status, String paymentMethod, String paymentStatus, String recipient, String phone, String address, String city, BigDecimal subtotal, BigDecimal shipping, BigDecimal total, Instant createdAt, List<OrderItemView> items) { }
}
''')
write('repository/ProductRepository.java','''
package com.example.demo.repository;
import com.example.demo.model.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.*;
import java.util.*;
public interface ProductRepository extends JpaRepository<Product, Long> {
    @Query("select p from Product p where (:admin = true or p.active = true) and (:category = '' or p.category = :category) and lower(p.name) like lower(concat('%', :q, '%'))")
    Page<Product> search(String q, String category, boolean admin, Pageable pageable);
    @Query("select distinct p.category from Product p where p.active = true order by p.category")
    List<String> categories();
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select p from Product p where p.id = :id")
    Optional<Product> lockById(Long id);
}
''')
write('repository/CartRepository.java','''
package com.example.demo.repository;
import com.example.demo.model.Cart;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface CartRepository extends JpaRepository<Cart, Long> {
    @EntityGraph(attributePaths = "product") List<Cart> findByUserIdOrderById(Long userId);
    Optional<Cart> findByUserIdAndProductId(Long userId, Long productId);
    Optional<Cart> findByIdAndUserId(Long id, Long userId);
    void deleteByUserId(Long userId);
}
''')
write('repository/OrderRepository.java','''
package com.example.demo.repository;
import com.example.demo.model.Order;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.*;
import java.util.*;
public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByUserIdAndIdempotencyKey(Long userId, String idempotencyKey);
    Page<Order> findByUserId(Long userId, Pageable pageable);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select o from Order o where o.id = :id")
    Optional<Order> lockById(Long id);
}
''')
write('repository/SessionRepository.java','''
package com.example.demo.repository;
import com.example.demo.model.AuthSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.util.Optional;
public interface SessionRepository extends JpaRepository<AuthSession, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select s from AuthSession s where s.refreshHash = :hash")
    Optional<AuthSession> lockByRefreshHash(String hash);
    long deleteByExpiresAtBefore(java.time.Instant now);
}
''')
p=base/'repository/UserRepository.java';s=p.read_text().replace('    Optional<User>', '    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)\n    @org.springframework.data.jpa.repository.Query("select u from User u where u.id = :id")\n    Optional<User> lockById(Long id);\n\n    Optional<User>');p.write_text(s)
write('service/ApiException.java','''
package com.example.demo.service;
import org.springframework.http.HttpStatus;
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    public ApiException(HttpStatus status, String message) { super(message); this.status = status; }
    public HttpStatus getStatus() { return status; }
    public static ApiException missing(String message) { return new ApiException(HttpStatus.NOT_FOUND, message); }
    public static ApiException conflict(String message) { return new ApiException(HttpStatus.CONFLICT, message); }
}
''')
write('controller/ApiExceptionHandler.java','''
package com.example.demo.controller;
import com.example.demo.service.ApiException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.*;
import org.springframework.dao.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.util.*;
@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<?> api(ApiException e) { return ResponseEntity.status(e.getStatus()).body(Map.of("message", e.getMessage())); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validation(MethodArgumentNotValidException e) {
        Map<String, String> fields = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f -> fields.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest().body(Map.of("message", "Please check the highlighted fields.", "fields", fields));
    }
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class, org.springframework.web.bind.MissingRequestHeaderException.class})
    public ResponseEntity<?> malformed(Exception e) { return ResponseEntity.badRequest().body(Map.of("message", "Invalid or missing request values.")); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> duplicate(Exception e) { return ResponseEntity.status(409).body(Map.of("message", "That value already exists or conflicts with another record.")); }
    @ExceptionHandler(PessimisticLockingFailureException.class)
    public ResponseEntity<?> busy(Exception e) { return ResponseEntity.status(409).body(Map.of("message", "This item is being updated. Please retry.")); }
}
''')
# Retain the user's demonstration code, but only expose it under an explicit practice profile.
p=base/'controller/RegisterController.java';s=p.read_text().replace('@RestController', '@org.springframework.context.annotation.Profile("practice")\n@RestController');p.write_text(s)
