package com.example.demo.controller;

import com.example.demo.dto.*;
import com.example.demo.dto.Views.*;
import com.example.demo.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AuthController {
  private final AuthService auth;

  public AuthController(AuthService auth) {
    this.auth = auth;
  }

  @PostMapping("/auth/register")
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  public AuthView register(@Valid @RequestBody RegisterRequest req) {
    return auth.register(req);
  }

  @PostMapping("/auth/login")
  public AuthView login(@Valid @RequestBody LoginRequest req) {
    return auth.login(req);
  }

  @PostMapping("/auth/refresh")
  public AuthView refresh(@Valid @RequestBody RefreshRequest req) {
    return auth.refresh(req.getRefreshToken());
  }

  @PostMapping("/auth/logout")
  @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
  public void logout(@AuthenticationPrincipal Jwt jwt) {
    auth.logout(jwt.getId());
  }

  @GetMapping("/users/me")
  public UserView me(@AuthenticationPrincipal Jwt jwt) {
    return auth.me(((Number) jwt.getClaim("uid")).longValue());
  }
}
