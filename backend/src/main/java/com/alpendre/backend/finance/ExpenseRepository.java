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

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    @EntityGraph(attributePaths = {"creator", "approver", "house"})
    Optional<Expense> findWithDetailsById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Expense e WHERE e.id = :id")
    Optional<Expense> findByIdForUpdate(@Param("id") Long id);

    @EntityGraph(attributePaths = {"creator", "approver", "house"})
    List<Expense> findByHouseIdOrderByExpenseDateDescCreatedAtDesc(UUID houseId);

    @EntityGraph(attributePaths = {"creator", "approver", "house"})
    List<Expense> findByHouseIdAndStatusOrderByExpenseDateDescCreatedAtDesc(UUID houseId, String status);

    @EntityGraph(attributePaths = {"creator", "approver", "house"})
    List<Expense> findByHouseIdAndStatusInOrderByExpenseDateDescCreatedAtDesc(UUID houseId, List<String> statuses);
}
