package com.alpendre.backend.house;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HouseMemberRepository extends JpaRepository<HouseMember, UUID> {

    @EntityGraph(attributePaths = {"user", "house"})
    List<HouseMember> findByHouseIdAndStatusOrderByJoinedAtAsc(UUID houseId, String status);

    @EntityGraph(attributePaths = {"user", "house"})
    Optional<HouseMember> findByHouseIdAndUserUid(UUID houseId, UUID userUid);

    @EntityGraph(attributePaths = {"user", "house"})
    Optional<HouseMember> findByHouseIdAndUserUidAndStatus(UUID houseId, UUID userUid, String status);

    long countByHouseIdAndStatus(UUID houseId, String status);
}
