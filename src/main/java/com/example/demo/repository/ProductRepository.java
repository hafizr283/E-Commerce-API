package com.example.demo.repository;

import com.example.demo.model.Product;
import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;

public interface ProductRepository extends JpaRepository<Product, Long> {
  @Modifying(flushAutomatically = true)
  @Query(
      value =
          "update products set stock = stock - :quantity, version = version + 1 where id = :id and"
              + " active = true and stock >= :quantity",
      nativeQuery = true)
  int reserveStock(Long id, int quantity);

  @Modifying(flushAutomatically = true)
  @Query(
      value = "update products set stock = stock + :quantity, version = version + 1 where id = :id",
      nativeQuery = true)
  int restoreStock(Long id, int quantity);

  long countByActiveTrue();

  long countByActiveTrueAndStockLessThanEqual(int threshold);

  @Query(
      "select p from Product p where (:admin = true or p.active = true) and (:category = '' or"
          + " p.category = :category) and lower(p.name) like lower(concat('%', :q, '%'))")
  Page<Product> search(String q, String category, boolean admin, Pageable pageable);

  @Query("select distinct p.category from Product p where p.active = true order by p.category")
  List<String> categories();

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from Product p where p.id = :id")
  Optional<Product> lockById(Long id);
}
