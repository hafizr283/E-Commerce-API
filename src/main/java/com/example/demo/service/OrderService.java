package com.example.demo.service;

import com.example.demo.dto.CheckoutRequest;
import com.example.demo.dto.Views.*;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {
  private final jakarta.persistence.EntityManager entityManager;
  private final OrderRepository orders;
  private final CartRepository carts;
  private final ProductRepository products;
  private final UserRepository users;

  public OrderService(
      OrderRepository orders,
      CartRepository carts,
      ProductRepository products,
      UserRepository users,
      jakarta.persistence.EntityManager entityManager) {
    this.entityManager = entityManager;
    this.orders = orders;
    this.carts = carts;
    this.products = products;
    this.users = users;
  }

  @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
  public OrderView checkout(Long userId, String key, CheckoutRequest req) {
    if (!key.matches("[a-zA-Z0-9_-]{8,80}"))
      throw new ApiException(
          HttpStatus.BAD_REQUEST,
          "Supply an Idempotency-Key of 8–80 letters, digits, underscores or hyphens.");
    users.lockById(userId).orElseThrow(() -> ApiException.missing("Account not found."));
    String fingerprint =
        AuthService.hash(
            req.getRecipient().strip()
                + "\n"
                + req.getPhone().strip()
                + "\n"
                + req.getAddress().strip()
                + "\n"
                + req.getCity().strip()
                + "\n"
                + req.getExpectedTotal().stripTrailingZeros().toPlainString());
    Optional<Order> previous = orders.findByUserIdAndIdempotencyKey(userId, key);
    if (previous.isPresent()) {
      if (!previous.get().getFingerprint().equals(fingerprint))
        throw ApiException.conflict("This checkout key was used with different delivery details.");
      return view(previous.get());
    }
    List<Cart> cart = carts.findForCheckout(userId);
    if (cart.isEmpty()) throw ApiException.conflict("Your cart is empty.");
    // Lock products in a consistent order so concurrent checkouts cannot oversell or deadlock each
    // other.
    Map<Long, Product> locked = new HashMap<>();
    cart.stream()
        .map(c -> c.getProduct().getId())
        .sorted()
        .forEach(
            id -> {
              Product product =
                  products
                      .lockById(id)
                      .orElseThrow(() -> ApiException.missing("Product not found."));
              entityManager.refresh(product, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
              locked.put(id, product);
            });
    Order order = new Order();
    order.setUserId(userId);
    order.setIdempotencyKey(key);
    order.setFingerprint(fingerprint);
    order.setRecipient(req.getRecipient().strip());
    order.setPhone(req.getPhone().strip());
    order.setAddress(req.getAddress().strip());
    order.setCity(req.getCity().strip());
    BigDecimal subtotal = BigDecimal.ZERO;
    for (Cart c : cart) {
      Product p = locked.get(c.getProduct().getId());
      if (products.reserveStock(p.getId(), c.getQuantity()) != 1)
        throw ApiException.conflict(
            "Not enough stock for " + p.getName() + ". Please update your cart.");

      OrderItem item = new OrderItem();
      item.setOrder(order);
      item.setProductId(p.getId());
      item.setName(p.getName());
      item.setImage(p.getImage());
      item.setPrice(p.getPrice());
      item.setQuantity(c.getQuantity());
      order.getItems().add(item);
      subtotal = subtotal.add(p.getPrice().multiply(BigDecimal.valueOf(c.getQuantity())));
    }
    order.setSubtotal(subtotal);
    order.setShipping(CartService.shipping(subtotal));
    order.setTotal(subtotal.add(order.getShipping()));
    if (order.getTotal().compareTo(req.getExpectedTotal()) != 0)
      throw ApiException.conflict(
          "Prices have changed. Refresh your bag and review the new total before ordering.");
    orders.saveAndFlush(order);
    carts.deleteAll(cart);
    return view(order);
  }

  @Transactional(readOnly = true)
  public OrderView findCheckout(Long userId, String key) {
    return view(
        orders
            .findByUserIdAndIdempotencyKey(userId, key)
            .orElseThrow(() -> ApiException.missing("Order not found.")));
  }

  @Transactional(readOnly = true)
  public PageView<OrderView> list(Long userId, boolean admin, int page) {
    Pageable pageable = PageRequest.of(Math.max(0, page), 20, Sort.by("id").descending());
    Page<Order> result = admin ? orders.findAll(pageable) : orders.findByUserId(userId, pageable);
    return new PageView<>(
        result.map(OrderService::view).getContent(),
        result.getNumber(),
        result.getTotalPages(),
        result.getTotalElements());
  }

  @Transactional(readOnly = true)
  public OrderView get(Long userId, Long id, boolean admin) {
    Order order = orders.findById(id).orElseThrow(() -> ApiException.missing("Order not found."));
    checkOwner(order, userId, admin);
    return view(order);
  }

  @Transactional
  public OrderView transition(Long userId, Long id, String next, boolean admin) {
    Order order = orders.lockById(id).orElseThrow(() -> ApiException.missing("Order not found."));
    checkOwner(order, userId, admin);
    if (!admin && !next.equals("CANCELLED"))
      throw new ApiException(HttpStatus.FORBIDDEN, "Only an admin can change fulfillment status.");
    if (order.getStatus().equals(next)) return view(order);
    boolean allowed =
        order.getStatus().equals("CONFIRMED")
                && (next.equals("CANCELLED") || admin && next.equals("SHIPPED"))
            || admin && order.getStatus().equals("SHIPPED") && next.equals("DELIVERED");
    if (!allowed)
      throw ApiException.conflict(
          "This order cannot move from " + order.getStatus() + " to " + next + ".");
    if (next.equals("CANCELLED")) {
      order.getItems().stream()
          .sorted(Comparator.comparing(OrderItem::getProductId))
          .forEach(
              i -> {
                products.restoreStock(i.getProductId(), i.getQuantity());
              });
      order.setPaymentStatus("CANCELLED");
    }
    if (next.equals("DELIVERED")) order.setPaymentStatus("PAID");
    order.setStatus(next);
    return view(order);
  }

  private void checkOwner(Order order, Long userId, boolean admin) {
    if (!admin && !order.getUserId().equals(userId)) throw ApiException.missing("Order not found.");
  }

  public static OrderView view(Order o) {
    return new OrderView(
        o.getId(),
        o.getUserId(),
        o.getStatus(),
        o.getPaymentMethod(),
        o.getPaymentStatus(),
        o.getRecipient(),
        o.getPhone(),
        o.getAddress(),
        o.getCity(),
        o.getSubtotal(),
        o.getShipping(),
        o.getTotal(),
        o.getCreatedAt(),
        o.getItems().stream()
            .map(
                i ->
                    new OrderItemView(
                        i.getProductId(), i.getName(), i.getImage(), i.getPrice(), i.getQuantity()))
            .toList());
  }
}
