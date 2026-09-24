package com.example.demo.controller;

import com.example.demo.dto.*;
import com.example.demo.dto.Views.*;
import com.example.demo.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class OrderController {
  private final OrderService orders;

  public OrderController(OrderService orders) {
    this.orders = orders;
  }

  private Long uid(Jwt jwt) {
    return ((Number) jwt.getClaim("uid")).longValue();
  }

  @PostMapping("/orders")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public OrderView checkout(
      @AuthenticationPrincipal Jwt jwt,
      @RequestHeader("Idempotency-Key") String key,
      @Valid @RequestBody CheckoutRequest req) {
    return orders.checkout(uid(jwt), key, req);
  }

  @GetMapping("/orders")
  public PageView<OrderView> list(
      @AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "0") int page) {
    return orders.list(uid(jwt), false, page);
  }

  @GetMapping("/orders/{id}")
  public OrderView get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return orders.get(uid(jwt), id, false);
  }

  @GetMapping("/orders/checkout/{key}")
  public OrderView findCheckout(@AuthenticationPrincipal Jwt jwt, @PathVariable String key) {
    return orders.findCheckout(uid(jwt), key);
  }

  @PostMapping("/orders/{id}/cancel")
  public OrderView cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return orders.transition(uid(jwt), id, "CANCELLED", false);
  }

  @GetMapping("/admin/orders")
  public PageView<OrderView> adminList(
      @AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "0") int page) {
    return orders.list(uid(jwt), true, page);
  }

  @PatchMapping("/admin/orders/{id}/status")
  public OrderView status(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable Long id,
      @Valid @RequestBody StatusRequest req) {
    return orders.transition(uid(jwt), id, req.getStatus(), true);
  }
}
