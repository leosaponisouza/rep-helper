package com.alpendre.backend.finance;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IncomeRepository extends JpaRepository<Income, Long> {

    @EntityGraph(attributePaths = {"creator", "contributor", "house"})
    Optional<Income> findWithDetailsById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Income i WHERE i.id = :id")
    Optional<Income> findByIdForUpdate(@Param("id") Long id);

    @EntityGraph(attributePaths = {"creator", "contributor", "house"})
    List<Income> findByHouseIdOrderByIncomeDateDescCreatedAtDesc(UUID houseId);
}
