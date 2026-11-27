package com.alpendre.backend.event;

import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<Event, Long> {

    @EntityGraph(attributePaths = {"creator", "house", "invitations", "invitations.user"})
    Optional<Event> findWithDetailsById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Event e WHERE e.id = :id")
    Optional<Event> findByIdForUpdate(@Param("id") Long id);

    @EntityGraph(attributePaths = {"creator", "house", "invitations", "invitations.user"})
    List<Event> findByHouseIdOrderByStartDateAsc(UUID houseId);

    @EntityGraph(attributePaths = {"creator", "house", "invitations", "invitations.user"})
    @Query("SELECT e FROM Event e WHERE e.house.id = :houseId AND e.endDate >= :now ORDER BY e.startDate ASC")
    List<Event> findUpcomingByHouseId(
            @Param("houseId") UUID houseId,
            @Param("now") OffsetDateTime now
    );

    @EntityGraph(attributePaths = {"creator", "house", "invitations", "invitations.user"})
    @Query("SELECT DISTINCT e FROM Event e JOIN e.invitations inv WHERE e.house.id = :houseId AND inv.user.uid = :userUid AND inv.status = :status ORDER BY e.startDate ASC")
    List<Event> findByHouseAndInvitationStatus(
            @Param("houseId") UUID houseId,
            @Param("userUid") UUID userUid,
            @Param("status") String status
    );
}
