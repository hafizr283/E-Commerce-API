package com.example.demo.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "auth_sessions")
public class AuthSession {
  @Id
  @Column(length = 36)
  private String id;

  @Column(nullable = false)
  private Long userId;

  @Column(nullable = false, unique = true, length = 64)
  private String refreshHash;

  @Column(nullable = false)
  private Instant expiresAt;

  public AuthSession() {}

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public Long getUserId() {
    return userId;
  }

  public void setUserId(Long userId) {
    this.userId = userId;
  }

  public String getRefreshHash() {
    return refreshHash;
  }

  public void setRefreshHash(String refreshHash) {
    this.refreshHash = refreshHash;
  }

  public Instant getExpiresAt() {
    return expiresAt;
  }

  public void setExpiresAt(Instant expiresAt) {
    this.expiresAt = expiresAt;
  }
}
