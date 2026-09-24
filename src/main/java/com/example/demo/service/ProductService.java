package com.example.demo.service;

import com.example.demo.dto.*;
import com.example.demo.dto.Views.*;
import com.example.demo.model.Product;
import com.example.demo.repository.ProductRepository;
import java.util.List;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {
  private final ProductRepository products;

  public ProductService(ProductRepository products) {
    this.products = products;
  }

  @Transactional(readOnly = true)
  public PageView<ProductView> list(
      String q, String category, String sort, int page, int size, boolean admin) {
    Sort ordering =
        switch (sort) {
          case "priceAsc" -> Sort.by("price").ascending();
          case "priceDesc" -> Sort.by("price").descending();
          case "name" -> Sort.by("name");
          default -> Sort.by("id").descending();
        };
    Page<Product> result =
        products.search(
            q.strip(),
            category.strip(),
            admin,
            PageRequest.of(
                Math.max(0, page), Math.min(48, Math.max(1, size)), ordering.and(Sort.by("id"))));
    return new PageView<>(
        result.map(ProductService::view).getContent(),
        result.getNumber(),
        result.getTotalPages(),
        result.getTotalElements());
  }

  @Transactional(readOnly = true)
  public ProductView get(Long id) {
    return view(
        products
            .findById(id)
            .filter(Product::getActive)
            .orElseThrow(() -> ApiException.missing("Product not found.")));
  }

  public List<String> categories() {
    return products.categories();
  }

  @Transactional
  public ProductView save(Long id, ProductRequest req) {
    if (id != null && req.getVersion() == null)
      throw new ApiException(
          org.springframework.http.HttpStatus.BAD_REQUEST,
          "Include the product version when updating a product.");
    Product p =
        id == null
            ? new Product()
            : products.lockById(id).orElseThrow(() -> ApiException.missing("Product not found."));
    if (id != null && p.getVersion() != req.getVersion())
      throw ApiException.conflict(
          "This product changed while you were editing. Reopen it to review the latest stock and"
              + " details.");
    p.setName(req.getName().strip());
    p.setDescription(req.getDescription().strip());
    p.setCategory(req.getCategory().strip());
    p.setPrice(req.getPrice());
    p.setStock(req.getStock());
    p.setImage(req.getImage());
    p.setActive(req.getActive());
    return view(products.saveAndFlush(p));
  }

  @Transactional
  public void delete(Long id) {
    products
        .lockById(id)
        .orElseThrow(() -> ApiException.missing("Product not found."))
        .setActive(false);
  }

  public static ProductView view(Product p) {
    return new ProductView(
        p.getId(),
        p.getVersion(),
        p.getName(),
        p.getDescription(),
        p.getPrice(),
        p.getStock(),
        p.getCategory(),
        p.getImage(),
        p.getActive());
  }
}
