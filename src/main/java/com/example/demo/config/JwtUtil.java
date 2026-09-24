package com.example.demo.config;

import com.example.demo.model.User;
import java.time.Instant;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;

@Component
public class JwtUtil {
  private final JwtEncoder encoder;

  public JwtUtil(JwtEncoder encoder) {
    this.encoder = encoder;
  }

  public String generateToken(User user, String sessionId) {
    Instant now = Instant.now();
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer("atelier-api")
            .subject(user.getEmail())
            .id(sessionId)
            .issuedAt(now)
            .expiresAt(now.plusSeconds(900))
            .claim("uid", user.getId())
            .claim("role", user.getRole().name())
            .build();
    return encoder
        .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
        .getTokenValue();
  }
}
