package com.example.demo.dto;

import jakarta.validation.constraints.*;

public class QuantityRequest {
  @NotNull
  @Min(1)
  @Max(99)
  private Integer quantity;

  public QuantityRequest() {}

  public Integer getQuantity() {
    return quantity;
  }

  public void setQuantity(Integer quantity) {
    this.quantity = quantity;
  }
}
