package com.rephelper.backend.republic;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RepublicRepository extends JpaRepository<Republic, UUID> {

    @Override
    @EntityGraph(attributePaths = {"owner"})
    Optional<Republic> findById(UUID id);

    @EntityGraph(attributePaths = {"owner"})
    Optional<Republic> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Republic r WHERE r.id = :id")
    Optional<Republic> findByIdForUpdate(@Param("id") UUID id);
}
