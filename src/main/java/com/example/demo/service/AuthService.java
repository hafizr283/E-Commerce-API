package com.example.demo.service;

import com.example.demo.config.JwtUtil;
import com.example.demo.dto.*;
import com.example.demo.dto.Views.*;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private final UserRepository users;
  private final SessionRepository sessions;
  private final PasswordEncoder encoder;
  private final JwtUtil jwt;
  private final String dummyHash;

  public AuthService(
      UserRepository users, SessionRepository sessions, PasswordEncoder encoder, JwtUtil jwt) {
    this.users = users;
    this.sessions = sessions;
    this.encoder = encoder;
    this.jwt = jwt;
    this.dummyHash = encoder.encode(UUID.randomUUID().toString());
  }

  @Transactional
  public AuthView register(RegisterRequest req) {
    checkPassword(req.getPassword());
    String email = req.getEmail().strip().toLowerCase(Locale.ROOT);
    if (users.findByEmail(email).isPresent())
      throw ApiException.conflict("This email is already registered.");
    User user = new User();
    user.setName(req.getName().strip());
    user.setEmail(email);
    user.setPassword(encoder.encode(req.getPassword()));
    user.setRole(User.Role.USER);
    users.saveAndFlush(user);
    return newSession(user);
  }

  @Transactional
  public AuthView login(LoginRequest req) {
    checkPassword(req.getPassword());
    User user = users.findByEmail(req.getEmail().strip().toLowerCase(Locale.ROOT)).orElse(null);
    boolean matches =
        encoder.matches(req.getPassword(), user == null ? dummyHash : user.getPassword());
    if (user == null || !matches)
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect.");
    return newSession(user);
  }

  private AuthView newSession(User user) {
    String refresh = refreshToken();
    AuthSession s = new AuthSession();
    s.setId(UUID.randomUUID().toString());
    s.setUserId(user.getId());
    s.setRefreshHash(hash(refresh));
    s.setExpiresAt(Instant.now().plusSeconds(604800));
    sessions.save(s);
    return new AuthView(jwt.generateToken(user, s.getId()), refresh, view(user));
  }

  @Transactional
  public AuthView refresh(String token) {
    AuthSession session =
        sessions
            .lockByRefreshHash(hash(token))
            .filter(s -> s.getExpiresAt().isAfter(Instant.now()))
            .orElseThrow(
                () ->
                    new ApiException(
                        HttpStatus.UNAUTHORIZED, "Session expired. Please sign in again."));
    String next = refreshToken();
    session.setRefreshHash(hash(next));
    User user =
        users
            .findById(session.getUserId())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Account not found."));
    return new AuthView(jwt.generateToken(user, session.getId()), next, view(user));
  }

  @Transactional
  public void logout(String sessionId) {
    sessions.deleteById(sessionId);
  }

  @Transactional(readOnly = true)
  public UserView me(Long id) {
    return view(users.findById(id).orElseThrow(() -> ApiException.missing("Account not found.")));
  }

  public static UserView view(User user) {
    return new UserView(user.getId(), user.getName(), user.getEmail(), user.getRole().name());
  }

  public static String hash(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  private static String refreshToken() {
    byte[] bytes = new byte[48];
    new SecureRandom().nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private void checkPassword(String password) {
    if (password.getBytes(StandardCharsets.UTF_8).length > 72)
      throw new ApiException(
          HttpStatus.BAD_REQUEST, "Password must be no more than 72 UTF-8 bytes.");
  }
}
