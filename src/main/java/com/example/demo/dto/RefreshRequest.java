package com.example.demo.dto;

import jakarta.validation.constraints.*;

public class RefreshRequest {
  @NotBlank
  @Size(max = 200)
  private String refreshToken;

  public RefreshRequest() {}

  public String getRefreshToken() {
    return refreshToken;
  }

  public void setRefreshToken(String refreshToken) {
    this.refreshToken = refreshToken;
  }
}
