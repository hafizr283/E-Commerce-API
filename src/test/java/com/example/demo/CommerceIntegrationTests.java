package com.example.demo;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.demo.dto.CheckoutRequest;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import com.example.demo.service.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class CommerceIntegrationTests {
  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired ProductRepository products;
  @Autowired UserRepository users;
  @Autowired CartService carts;
  @Autowired OrderService orders;

  private JsonNode request(
      MockHttpServletRequestBuilder request, String token, Object body, int expected)
      throws Exception {
    if (token != null) request.header("Authorization", "Bearer " + token);
    if (body != null)
      request.contentType("application/json").content(json.writeValueAsString(body));
    String content =
        mvc.perform(request)
            .andExpect(status().is(expected))
            .andReturn()
            .getResponse()
            .getContentAsString();
    return content.isEmpty() ? json.createObjectNode() : json.readTree(content);
  }

  private JsonNode account() throws Exception {
    return request(
        post("/api/auth/register"),
        null,
        Map.of(
            "name",
            "Test Customer",
            "email",
            UUID.randomUUID() + "@example.test",
            "password",
            "TestPassword123!"),
        201);
  }

  private String token(JsonNode account) {
    return account.path("token").asText();
  }

  private long uid(JsonNode account) {
    return account.path("user").path("id").asLong();
  }

  private Product product(int stock) {
    Product p = new Product();
    p.setName("Test " + UUID.randomUUID());
    p.setDescription("Integration test product");
    p.setPrice(new BigDecimal("1500.00"));
    p.setStock(stock);
    p.setCategory("Tests");
    p.setImage("/assets/mug.svg");
    return products.saveAndFlush(p);
  }

  private Map<String, String> address() {
    return Map.of(
        "recipient",
        "Test Customer",
        "phone",
        "01700000000",
        "address",
        "12 Test Road",
        "city",
        "Dhaka",
        "expectedTotal",
        "3120.00");
  }

  private CheckoutRequest checkoutRequest() {
    CheckoutRequest r = new CheckoutRequest();
    r.setRecipient("Test Customer");
    r.setPhone("01700000000");
    r.setAddress("12 Test Road");
    r.setCity("Dhaka");
    r.setExpectedTotal(new BigDecimal("1620.00"));
    return r;
  }

  private String admin() throws Exception {
    JsonNode a = account();
    User u = users.findById(uid(a)).orElseThrow();
    u.setRole(User.Role.ADMIN);
    users.saveAndFlush(u);
    return token(
        request(
            post("/api/auth/login"),
            null,
            Map.of("email", u.getEmail(), "password", "TestPassword123!"),
            200));
  }

  @Test
  void registrationValidationAndDatabaseUniqueness() throws Exception {
    request(
        post("/api/auth/register"),
        null,
        Map.of("name", "", "email", "bad", "password", "tiny"),
        400);
    JsonNode a = account();
    request(
        post("/api/auth/register"),
        null,
        Map.of(
            "name",
            "Again",
            "email",
            a.path("user").path("email").asText().toUpperCase(Locale.ROOT),
            "password",
            "TestPassword123!"),
        409);
    assertFalse(a.path("user").has("password"));
    assertTrue(users.findById(uid(a)).orElseThrow().getPassword().startsWith("$2"));
    request(
        post("/api/auth/login"),
        null,
        Map.of("email", a.path("user").path("email").asText(), "password", "incorrect"),
        401);
  }

  @Test
  void refreshRotationAndLogoutRevokeAccess() throws Exception {
    JsonNode a = account();
    request(get("/api/users/me"), token(a), null, 200);
    JsonNode refreshed =
        request(
            post("/api/auth/refresh"),
            null,
            Map.of("refreshToken", a.path("refreshToken").asText()),
            200);
    request(
        post("/api/auth/refresh"),
        null,
        Map.of("refreshToken", a.path("refreshToken").asText()),
        401);
    request(post("/api/auth/logout"), token(refreshed), null, 204);
    request(get("/api/users/me"), token(refreshed), null, 401);
    request(get("/api/users/me"), token(a), null, 401);
    request(
        post("/api/auth/refresh"),
        null,
        Map.of("refreshToken", refreshed.path("refreshToken").asText()),
        401);
  }

  @Test
  void rolesAndCartOwnershipAreEnforced() throws Exception {
    JsonNode a = account(), b = account();
    Product p = product(4);
    request(get("/api/cart"), null, null, 401);
    request(get("/api/admin/dashboard"), token(a), null, 403);
    request(get("/api/admin/dashboard"), admin(), null, 200);
    JsonNode cart =
        request(
            post("/api/cart/items"), token(a), Map.of("productId", p.getId(), "quantity", 1), 200);
    long item = cart.path("items").get(0).path("id").asLong();
    assertEquals(0, request(get("/api/cart"), token(b), null, 200).path("items").size());
    request(patch("/api/cart/items/" + item), token(b), Map.of("quantity", 2), 404);
    request(delete("/api/cart/items/" + item), token(b), null, 404);
    request(patch("/api/cart/items/" + item), token(a), Map.of("quantity", 0), 400);
    request(patch("/api/cart/items/" + item), token(a), Map.of("quantity", 5), 409);
  }

  @Test
  void checkoutRetriesAndCancellationDoNotDoubleModifyStock() throws Exception {
    JsonNode a = account(), b = account();
    Product p = product(5);
    String key = UUID.randomUUID().toString();
    request(post("/api/cart/items"), token(a), Map.of("productId", p.getId(), "quantity", 2), 200);
    JsonNode order =
        request(post("/api/orders").header("Idempotency-Key", key), token(a), address(), 201);
    assertEquals(new BigDecimal("3120.0"), order.path("total").decimalValue().setScale(1));
    assertEquals(3, products.findById(p.getId()).orElseThrow().getStock());
    JsonNode retry =
        request(post("/api/orders").header("Idempotency-Key", key), token(a), address(), 201);
    assertEquals(order.path("id").asLong(), retry.path("id").asLong());
    Map<String, String> changed = new HashMap<>(address());
    changed.put("city", "Sylhet");
    request(post("/api/orders").header("Idempotency-Key", key), token(a), changed, 409);
    assertEquals(0, request(get("/api/cart"), token(a), null, 200).path("items").size());
    String path = "/api/orders/" + order.path("id").asLong();
    request(get(path), token(b), null, 404);
    request(post(path + "/cancel"), token(b), null, 404);
    request(post(path + "/cancel"), token(a), null, 200);
    request(post(path + "/cancel"), token(a), null, 200);
    assertEquals(5, products.findById(p.getId()).orElseThrow().getStock());
  }

  @Test
  void checkoutRollsBackAllItemsWhenOneIsUnavailable() throws Exception {
    JsonNode a = account();
    Product first = product(3), second = product(2);
    carts.add(uid(a), first.getId(), 1);
    carts.add(uid(a), second.getId(), 2);
    second.setStock(0);
    products.saveAndFlush(second);
    request(
        post("/api/orders").header("Idempotency-Key", UUID.randomUUID().toString()),
        token(a),
        address(),
        409);
    assertEquals(3, products.findById(first.getId()).orElseThrow().getStock());
    assertEquals(2, carts.get(uid(a)).items().size());
    assertEquals(0, orders.list(uid(a), false, 0).totalElements());
  }

  @Test
  void concurrentCustomersCannotBuyTheSameLastUnit() throws Exception {
    JsonNode a = account(), b = account();
    Product p = product(1);
    carts.add(uid(a), p.getId(), 1);
    carts.add(uid(b), p.getId(), 1);
    CountDownLatch ready = new CountDownLatch(2), start = new CountDownLatch(1);
    try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
      List<Future<Boolean>> results = new ArrayList<>();
      for (long user : List.of(uid(a), uid(b)))
        results.add(
            executor.submit(
                () -> {
                  ready.countDown();
                  if (!start.await(10, TimeUnit.SECONDS))
                    throw new IllegalStateException("Start timeout");
                  try {
                    orders.checkout(user, UUID.randomUUID().toString(), checkoutRequest());
                    return true;
                  } catch (ApiException e) {
                    if (e.getStatus().value() != 409) throw e;
                    return false;
                  }
                }));
      assertTrue(ready.await(10, TimeUnit.SECONDS));
      start.countDown();
      int successes = 0;
      for (Future<Boolean> result : results) if (result.get(15, TimeUnit.SECONDS)) successes++;
      assertEquals(1, successes);
      assertEquals(0, products.findById(p.getId()).orElseThrow().getStock());
    }
  }

  @Test
  void snapshotsSurviveProductChangesAndFulfillmentIsRestricted() throws Exception {
    JsonNode a = account();
    String admin = admin();
    Product p = product(8);
    String oldName = p.getName();
    carts.add(uid(a), p.getId(), 4);
    Map<String, String> delivery = new HashMap<>(address());
    delivery.put("expectedTotal", "6000.00");
    JsonNode order =
        request(
            post("/api/orders").header("Idempotency-Key", UUID.randomUUID().toString()),
            token(a),
            delivery,
            201);
    assertEquals(0, order.path("shipping").asDouble());
    p = products.findById(p.getId()).orElseThrow();
    p.setName("Updated name");
    p.setPrice(new BigDecimal("9999.00"));
    products.saveAndFlush(p);
    String path = "/api/admin/orders/" + order.path("id").asLong() + "/status";
    request(patch(path), token(a), Map.of("status", "SHIPPED"), 403);
    request(patch(path), admin, Map.of("status", "DELIVERED"), 409);
    request(patch(path), admin, Map.of("status", "SHIPPED"), 200);
    request(post("/api/orders/" + order.path("id").asLong() + "/cancel"), token(a), null, 409);
    JsonNode delivered = request(patch(path), admin, Map.of("status", "DELIVERED"), 200);
    assertEquals("PAID", delivered.path("paymentStatus").asText());
    assertEquals(oldName, delivered.path("items").get(0).path("name").asText());
    assertEquals(1500, delivered.path("items").get(0).path("price").asInt());
    assertTrue(
        request(get("/api/admin/dashboard"), admin, null, 200).path("revenue").asDouble() >= 6000);
  }

  @Test
  void checkoutRejectsChangedPricesWithoutChargingAnUnreviewedTotal() throws Exception {
    JsonNode a = account();
    Product p = product(2);
    carts.add(uid(a), p.getId(), 1);
    request(
        post("/api/orders").header("Idempotency-Key", UUID.randomUUID().toString()),
        token(a),
        address(),
        409);
    assertEquals(2, products.findById(p.getId()).orElseThrow().getStock());
    assertEquals(1, carts.get(uid(a)).items().size());
  }

  @Test
  void adminCatalogValidatesAndSoftDeletesProducts() throws Exception {
    String admin = admin();
    Map<String, Object> data =
        new HashMap<>(
            Map.of(
                "name",
                "Admin product " + UUID.randomUUID(),
                "description",
                "A tested product",
                "price",
                999.50,
                "stock",
                3,
                "category",
                "Tests",
                "image",
                "/assets/mug.svg",
                "active",
                true));
    JsonNode created = request(post("/api/admin/products"), admin, data, 201);
    long id = created.path("id").asLong();
    data.put("price", -10);
    request(put("/api/admin/products/" + id), admin, data, 400);
    data.put("price", 1000);
    data.put("image", "javascript:alert(1)");
    request(put("/api/admin/products/" + id), admin, data, 400);
    request(delete("/api/admin/products/" + id), admin, null, 204);
    request(get("/api/products/" + id), null, null, 404);
    assertTrue(products.existsById(id));
    JsonNode page =
        request(
            get("/api/products").param("q", "Admin product").param("size", "1000"),
            null,
            null,
            200);
    assertEquals(0, page.path("items").size());
  }

  @Test
  void staleAdminEditsCannotOverwritePurchasedOrRestoredInventory() throws Exception {
    String admin = admin();
    JsonNode customer = account();
    Product p = product(5);
    Map<String, Object> edit =
        new HashMap<>(
            Map.of(
                "name",
                p.getName(),
                "description",
                "Updated description",
                "price",
                p.getPrice(),
                "stock",
                5,
                "category",
                p.getCategory(),
                "image",
                p.getImage(),
                "active",
                true));
    String path = "/api/admin/products/" + p.getId();
    request(put(path), admin, edit, 400);
    edit.put("version", p.getVersion());

    carts.add(uid(customer), p.getId(), 1);
    var order = orders.checkout(uid(customer), UUID.randomUUID().toString(), checkoutRequest());
    request(put(path), admin, edit, 409);
    Product purchased = products.findById(p.getId()).orElseThrow();
    assertEquals(4, purchased.getStock());
    assertTrue(purchased.getVersion() > p.getVersion());

    edit.put("stock", 4);
    edit.put("version", purchased.getVersion());
    orders.transition(uid(customer), order.id(), "CANCELLED", false);
    request(put(path), admin, edit, 409);
    Product restored = products.findById(p.getId()).orElseThrow();
    assertEquals(5, restored.getStock());
    edit.put("stock", 5);
    edit.put("version", restored.getVersion());
    JsonNode saved = request(put(path), admin, edit, 200);
    assertTrue(saved.path("version").asLong() > restored.getVersion());
    request(put(path), admin, edit, 409);
    assertEquals(5, products.findById(p.getId()).orElseThrow().getStock());
  }

  @Test
  void checkoutConfirmationCanBeRecoveredOnlyByItsOwner() throws Exception {
    JsonNode customer = account(), other = account();
    Product p = product(3);
    String key = UUID.randomUUID().toString();
    String path = "/api/orders/checkout/" + key;
    request(get(path), null, null, 401);
    request(get(path), token(customer), null, 404);
    carts.add(uid(customer), p.getId(), 1);
    var placed = orders.checkout(uid(customer), key, checkoutRequest());
    JsonNode recovered = request(get(path), token(customer), null, 200);
    assertEquals(placed.id(), recovered.path("id").asLong());
    request(get(path), token(other), null, 404);
    assertEquals(1, orders.list(uid(customer), false, 0).totalElements());
    assertEquals(2, products.findById(p.getId()).orElseThrow().getStock());
  }
}
