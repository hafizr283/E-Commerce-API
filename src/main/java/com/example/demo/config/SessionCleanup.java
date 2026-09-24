package com.example.demo.config;

import com.example.demo.repository.SessionRepository;
import java.time.Instant;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.*;
import org.springframework.transaction.annotation.Transactional;

@Configuration
@EnableScheduling
public class SessionCleanup {
  private final SessionRepository sessions;

  public SessionCleanup(SessionRepository sessions) {
    this.sessions = sessions;
  }

  @Scheduled(fixedDelay = 3600000)
  @Transactional
  public void clearExpired() {
    sessions.deleteByExpiresAtBefore(Instant.now());
  }
}
