package com.rephelper.backend.republic;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RepublicMemberRepository extends JpaRepository<RepublicMember, UUID> {

    @EntityGraph(attributePaths = {"user"})
    List<RepublicMember> findByRepublicIdAndStatusOrderByJoinedAtAsc(UUID republicId, String status);

    Optional<RepublicMember> findByRepublicIdAndUserUid(UUID republicId, UUID userUid);

    Optional<RepublicMember> findByRepublicIdAndUserUidAndStatus(UUID republicId, UUID userUid, String status);

    long countByRepublicIdAndStatus(UUID republicId, String status);
}
