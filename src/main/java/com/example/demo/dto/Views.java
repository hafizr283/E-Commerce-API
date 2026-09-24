package com.example.demo.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

// Java records are immutable response DTOs; no Lombok or annotation processing is used.
public final class Views {
  private Views() {}

  public record UserView(Long id, String name, String email, String role) {}

  public record AuthView(String token, String refreshToken, UserView user) {}

  public record ProductView(
      Long id,
      long version,
      String name,
      String description,
      BigDecimal price,
      int stock,
      String category,
      String image,
      boolean active) {}

  public record PageView<T>(List<T> items, int page, int totalPages, long totalElements) {}

  public record CartItemView(Long id, ProductView product, int quantity, BigDecimal lineTotal) {}

  public record CartView(
      List<CartItemView> items, BigDecimal subtotal, BigDecimal shipping, BigDecimal total) {}

  public record OrderItemView(
      Long productId, String name, String image, BigDecimal price, int quantity) {}

  public record OrderView(
      Long id,
      Long userId,
      String status,
      String paymentMethod,
      String paymentStatus,
      String recipient,
      String phone,
      String address,
      String city,
      BigDecimal subtotal,
      BigDecimal shipping,
      BigDecimal total,
      Instant createdAt,
      List<OrderItemView> items) {}
}
