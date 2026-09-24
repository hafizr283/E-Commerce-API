package com.example.demo.controller;

import com.example.demo.dto.ProductRequest;
import com.example.demo.dto.Views.*;
import com.example.demo.service.ProductService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ProductController {
  private final ProductService products;

  public ProductController(ProductService products) {
    this.products = products;
  }

  @GetMapping("/products")
  public PageView<ProductView> list(
      @RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "") String category,
      @RequestParam(defaultValue = "newest") String sort,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "12") int size) {
    return products.list(q, category, sort, page, size, false);
  }

  @GetMapping("/products/{id}")
  public ProductView get(@PathVariable Long id) {
    return products.get(id);
  }

  @GetMapping("/categories")
  public List<String> categories() {
    return products.categories();
  }

  @GetMapping("/admin/products")
  public PageView<ProductView> adminList(
      @RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "0") int page) {
    return products.list(q, "", "newest", page, 20, true);
  }

  @PostMapping("/admin/products")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public ProductView create(@Valid @RequestBody ProductRequest req) {
    return products.save(null, req);
  }

  @PutMapping("/admin/products/{id}")
  public ProductView update(@PathVariable Long id, @Valid @RequestBody ProductRequest req) {
    return products.save(id, req);
  }

  @DeleteMapping("/admin/products/{id}")
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void delete(@PathVariable Long id) {
    products.delete(id);
  }
}
