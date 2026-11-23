package com.rephelper.backend.republic;

import com.rephelper.backend.common.BusinessException;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class RepublicSecurityService {

    private final RepublicMemberRepository memberRepository;

    public RepublicSecurityService(RepublicMemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    public RepublicMember requireActiveMember(UUID republicId, UUID userUid) {
        if (republicId == null) {
            throw BusinessException.badRequest("NO_ACTIVE_REPUBLIC", "Você não está vinculado a nenhuma república ativa.");
        }
        return memberRepository
                .findByRepublicIdAndUserUidAndStatus(republicId, userUid, "ACTIVE")
                .orElseThrow(() -> BusinessException.forbidden(
                        "NOT_REPUBLIC_MEMBER",
                        "Você não tem permissão para acessar esta república."
                ));
    }

    public RepublicMember requireAdmin(UUID republicId, UUID userUid) {
        RepublicMember membership = requireActiveMember(republicId, userUid);
        if (!membership.isAdmin() && !membership.isOwner()) {
            throw BusinessException.forbidden(
                    "ADMIN_REQUIRED",
                    "Apenas administradores ou o proprietário podem realizar esta ação."
            );
        }
        return membership;
    }

    public RepublicMember requireOwner(UUID republicId, UUID userUid) {
        RepublicMember membership = requireActiveMember(republicId, userUid);
        if (!membership.isOwner()) {
            throw BusinessException.forbidden(
                    "OWNER_REQUIRED",
                    "Apenas o proprietário da república pode realizar esta ação."
            );
        }
        return membership;
    }
}
