package com.example.demo.repository;

import com.example.demo.model.AuthSession;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;

public interface SessionRepository extends JpaRepository<AuthSession, String> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from AuthSession s where s.refreshHash = :hash")
  Optional<AuthSession> lockByRefreshHash(String hash);

  long deleteByExpiresAtBefore(java.time.Instant now);
}
