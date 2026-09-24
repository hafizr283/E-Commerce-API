package com.example.demo.repository;

import com.example.demo.model.Order;
import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;

public interface OrderRepository extends JpaRepository<Order, Long> {
  long countByStatus(String status);

  @Query("select coalesce(sum(o.total), 0) from Order o where o.paymentStatus = 'PAID'")
  java.math.BigDecimal paidRevenue();

  Optional<Order> findByUserIdAndIdempotencyKey(Long userId, String idempotencyKey);

  Page<Order> findByUserId(Long userId, Pageable pageable);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select o from Order o where o.id = :id")
  Optional<Order> lockById(Long id);
}
