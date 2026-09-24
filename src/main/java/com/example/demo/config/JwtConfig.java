package com.example.demo.config;

import com.example.demo.repository.SessionRepository;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

@Configuration
public class JwtConfig {
  @Bean
  public SecretKeySpec signingKey(@Value("${jwt.secret}") String secret) {
    if (secret.getBytes(StandardCharsets.UTF_8).length < 32)
      throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
    return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
  }

  @Bean
  public JwtEncoder jwtEncoder(SecretKeySpec key) {
    return new NimbusJwtEncoder(new ImmutableSecret<>(key));
  }

  @Bean
  public JwtDecoder jwtDecoder(SecretKeySpec key, SessionRepository sessions) {
    NimbusJwtDecoder decoder =
        NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    OAuth2TokenValidator<Jwt> sessionValidator =
        jwt -> {
          String id = jwt.getId();
          if (id != null
              && sessions
                  .findById(id)
                  .filter(s -> s.getExpiresAt().isAfter(Instant.now()))
                  .isPresent()) return OAuth2TokenValidatorResult.success();
          return OAuth2TokenValidatorResult.failure(
              new OAuth2Error("invalid_token", "Session expired or revoked", null));
        };
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer("atelier-api"), sessionValidator));
    return decoder;
  }
}
