package com.example.demo.dto;

import jakarta.validation.constraints.*;

public class ProductRequest {
  @PositiveOrZero private Long version;

  public Long getVersion() {
    return version;
  }

  public void setVersion(Long version) {
    this.version = version;
  }

  @NotBlank
  @Size(max = 120)
  private String name;

  @NotBlank
  @Size(max = 2000)
  private String description;

  @NotNull
  @DecimalMin("0.01")
  @DecimalMax("9999999.99")
  @Digits(integer = 7, fraction = 2)
  private java.math.BigDecimal price;

  @NotNull
  @Min(0)
  @Max(1000000)
  private Integer stock;

  @NotBlank
  @Size(max = 60)
  private String category;

  @NotBlank
  @Size(max = 500)
  @Pattern(
      regexp = "^(/assets/[a-zA-Z0-9._/-]+|https://[^\\s]+)$",
      message = "Use an HTTPS image URL or a local asset path")
  private String image;

  @NotNull private Boolean active = true;

  public ProductRequest() {}

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public java.math.BigDecimal getPrice() {
    return price;
  }

  public void setPrice(java.math.BigDecimal price) {
    this.price = price;
  }

  public Integer getStock() {
    return stock;
  }

  public void setStock(Integer stock) {
    this.stock = stock;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public String getImage() {
    return image;
  }

  public void setImage(String image) {
    this.image = image;
  }

  public Boolean getActive() {
    return active;
  }

  public void setActive(Boolean active) {
    this.active = active;
  }
}
