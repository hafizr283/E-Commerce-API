package com.example.demo.dto;

import jakarta.validation.constraints.*;

public class CartRequest {
  @NotNull @Positive private Long productId;

  @NotNull
  @Min(1)
  @Max(99)
  private Integer quantity;

  public CartRequest() {}

  public Long getProductId() {
    return productId;
  }

  public void setProductId(Long productId) {
    this.productId = productId;
  }

  public Integer getQuantity() {
    return quantity;
  }

  public void setQuantity(Integer quantity) {
    this.quantity = quantity;
  }
}
