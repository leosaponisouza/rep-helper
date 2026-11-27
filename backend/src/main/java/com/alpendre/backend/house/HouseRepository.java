package com.alpendre.backend.house;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface HouseRepository extends JpaRepository<House, UUID> {

    @Override
    @EntityGraph(attributePaths = {"owner"})
    Optional<House> findById(UUID id);

    @EntityGraph(attributePaths = {"owner"})
    Optional<House> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM House r WHERE r.id = :id")
    Optional<House> findByIdForUpdate(@Param("id") UUID id);
}
