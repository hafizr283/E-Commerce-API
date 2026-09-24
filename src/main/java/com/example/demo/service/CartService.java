package com.example.demo.service;

import com.example.demo.dto.Views.*;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CartService {
  private final CartRepository carts;
  private final ProductRepository products;
  private final UserRepository users;

  public CartService(CartRepository carts, ProductRepository products, UserRepository users) {
    this.carts = carts;
    this.products = products;
    this.users = users;
  }

  @Transactional(readOnly = true)
  public CartView get(Long userId) {
    List<CartItemView> items =
        carts.findByUserIdOrderById(userId).stream()
            .map(
                c ->
                    new CartItemView(
                        c.getId(),
                        ProductService.view(c.getProduct()),
                        c.getQuantity(),
                        c.getProduct().getPrice().multiply(BigDecimal.valueOf(c.getQuantity()))))
            .toList();
    BigDecimal subtotal =
        items.stream().map(CartItemView::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal shipping = shipping(subtotal);
    return new CartView(items, subtotal, shipping, subtotal.add(shipping));
  }

  @Transactional
  public CartView add(Long userId, Long productId, int quantity) {
    lockUser(userId);
    Product product =
        products
            .findById(productId)
            .filter(Product::getActive)
            .orElseThrow(() -> ApiException.missing("Product not found."));
    Cart item =
        carts
            .findByUserIdAndProductId(userId, productId)
            .orElseGet(
                () -> {
                  Cart c = new Cart();
                  c.setUserId(userId);
                  c.setProduct(product);
                  return c;
                });
    int next = item.getQuantity() + quantity;
    validate(product, next);
    item.setQuantity(next);
    carts.saveAndFlush(item);
    return get(userId);
  }

  @Transactional
  public CartView update(Long userId, Long id, int quantity) {
    lockUser(userId);
    Cart item =
        carts
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> ApiException.missing("Cart item not found."));
    validate(item.getProduct(), quantity);
    item.setQuantity(quantity);
    return get(userId);
  }

  @Transactional
  public CartView remove(Long userId, Long id) {
    lockUser(userId);
    carts.delete(
        carts
            .findByIdAndUserId(id, userId)
            .orElseThrow(() -> ApiException.missing("Cart item not found.")));
    carts.flush();
    return get(userId);
  }

  @Transactional
  public void clear(Long userId) {
    lockUser(userId);
    carts.deleteByUserId(userId);
  }

  private void lockUser(Long id) {
    users.lockById(id).orElseThrow(() -> ApiException.missing("Account not found."));
  }

  private void validate(Product p, int qty) {
    if (!p.getActive() || qty < 1 || qty > 99 || qty > p.getStock())
      throw ApiException.conflict("Requested quantity is unavailable for " + p.getName() + ".");
  }

  public static BigDecimal shipping(BigDecimal subtotal) {
    return subtotal.signum() == 0 || subtotal.compareTo(new BigDecimal("5000")) >= 0
        ? new BigDecimal("0.00")
        : new BigDecimal("120.00");
  }
}
