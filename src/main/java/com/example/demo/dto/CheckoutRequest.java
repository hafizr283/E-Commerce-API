package com.example.demo.dto;

import jakarta.validation.constraints.*;

public class CheckoutRequest {
  @NotNull
  @DecimalMin("0.01")
  private java.math.BigDecimal expectedTotal;

  public java.math.BigDecimal getExpectedTotal() {
    return expectedTotal;
  }

  public void setExpectedTotal(java.math.BigDecimal expectedTotal) {
    this.expectedTotal = expectedTotal;
  }

  @NotBlank
  @Size(max = 120)
  private String recipient;

  @NotBlank
  @Pattern(regexp = "^[+0-9 ()-]{7,30}$", message = "Enter a valid phone number")
  private String phone;

  @NotBlank
  @Size(max = 500)
  private String address;

  @NotBlank
  @Size(max = 100)
  private String city;

  public CheckoutRequest() {}

  public String getRecipient() {
    return recipient;
  }

  public void setRecipient(String recipient) {
    this.recipient = recipient;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getAddress() {
    return address;
  }

  public void setAddress(String address) {
    this.address = address;
  }

  public String getCity() {
    return city;
  }

  public void setCity(String city) {
    this.city = city;
  }
}
