package com.alpendre.backend.house;

import com.alpendre.backend.common.BusinessException;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class HouseSecurityService {

    private final HouseMemberRepository memberRepository;

    public HouseSecurityService(HouseMemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    public HouseMember requireActiveMember(UUID houseId, UUID userUid) {
        if (houseId == null) {
            throw BusinessException.badRequest("NO_ACTIVE_HOUSE", "Você não está vinculado a nenhuma casa ativa.");
        }
        return memberRepository
                .findByHouseIdAndUserUidAndStatus(houseId, userUid, "ACTIVE")
                .orElseThrow(() -> BusinessException.forbidden(
                        "NOT_HOUSE_MEMBER",
                        "Você não tem permissão para acessar esta casa."
                ));
    }

    public HouseMember requireAdmin(UUID houseId, UUID userUid) {
        HouseMember membership = requireActiveMember(houseId, userUid);
        boolean effectiveAdmin = membership.isAdmin()
                || membership.isOwner()
                || (membership.getHouse() != null && membership.getHouse().isAllMembersAdmin());
        if (!effectiveAdmin) {
            throw BusinessException.forbidden(
                    "ADMIN_REQUIRED",
                    "Apenas administradores ou o criador da casa podem realizar esta ação."
            );
        }
        return membership;
    }

    public HouseMember requireOwner(UUID houseId, UUID userUid) {
        HouseMember membership = requireActiveMember(houseId, userUid);
        if (!membership.isOwner()) {
            throw BusinessException.forbidden(
                    "OWNER_REQUIRED",
                    "Apenas o criador da casa pode realizar esta ação."
            );
        }
        return membership;
    }
}
