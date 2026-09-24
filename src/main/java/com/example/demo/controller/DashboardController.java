package com.example.demo.controller;

import com.example.demo.repository.*;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/dashboard")
public class DashboardController {
  private final OrderRepository orders;
  private final ProductRepository products;

  public DashboardController(OrderRepository orders, ProductRepository products) {
    this.orders = orders;
    this.products = products;
  }

  @GetMapping
  public Map<String, Object> get() {
    return Map.of(
        "revenue",
        orders.paidRevenue(),
        "orders",
        orders.count(),
        "awaitingShipment",
        orders.countByStatus("CONFIRMED"),
        "activeProducts",
        products.countByActiveTrue(),
        "lowStock",
        products.countByActiveTrueAndStockLessThanEqual(5));
  }
}
