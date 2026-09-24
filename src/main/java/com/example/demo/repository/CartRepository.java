package com.example.demo.repository;

import com.example.demo.model.Cart;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface CartRepository extends JpaRepository<Cart, Long> {
  @EntityGraph(attributePaths = "product")
  List<Cart> findByUserIdOrderById(Long userId);

  // Do not fetch product state before checkout acquires the inventory locks.
  @Query("select c from Cart c where c.userId = :userId order by c.product.id")
  List<Cart> findForCheckout(Long userId);

  Optional<Cart> findByUserIdAndProductId(Long userId, Long productId);

  Optional<Cart> findByIdAndUserId(Long id, Long userId);

  void deleteByUserId(Long userId);
}
