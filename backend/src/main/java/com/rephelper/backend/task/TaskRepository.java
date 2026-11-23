package com.rephelper.backend.task;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    @EntityGraph(attributePaths = {"assignedUsers", "createdBy"})
    Optional<Task> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"assignedUsers", "createdBy"})
    List<Task> findByRepublicIdOrderByDueDateAscCreatedAtDesc(UUID republicId);

    @EntityGraph(attributePaths = {"assignedUsers", "createdBy"})
    @Query("SELECT DISTINCT t FROM Task t JOIN t.assignedUsers a WHERE a.uid = :userUid AND (:republicId IS NULL OR t.republic.id = :republicId) ORDER BY t.dueDate ASC, t.createdAt DESC")
    List<Task> findAssignedToUser(@Param("userUid") UUID userUid, @Param("republicId") UUID republicId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Task t WHERE t.id = :id")
    Optional<Task> findByIdForUpdate(@Param("id") Long id);
}
