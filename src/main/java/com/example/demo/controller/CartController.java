package com.example.demo.controller;

import com.example.demo.dto.*;
import com.example.demo.dto.Views.CartView;
import com.example.demo.service.CartService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
public class CartController {
  private final CartService carts;

  public CartController(CartService carts) {
    this.carts = carts;
  }

  private Long uid(Jwt jwt) {
    return ((Number) jwt.getClaim("uid")).longValue();
  }

  @GetMapping
  public CartView get(@AuthenticationPrincipal Jwt jwt) {
    return carts.get(uid(jwt));
  }

  @PostMapping("/items")
  public CartView add(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CartRequest req) {
    return carts.add(uid(jwt), req.getProductId(), req.getQuantity());
  }

  @PatchMapping("/items/{id}")
  public CartView update(
      @AuthenticationPrincipal Jwt jwt,
      @PathVariable Long id,
      @Valid @RequestBody QuantityRequest req) {
    return carts.update(uid(jwt), id, req.getQuantity());
  }

  @DeleteMapping("/items/{id}")
  public CartView remove(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return carts.remove(uid(jwt), id);
  }

  @DeleteMapping
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void clear(@AuthenticationPrincipal Jwt jwt) {
    carts.clear(uid(jwt));
  }
}
