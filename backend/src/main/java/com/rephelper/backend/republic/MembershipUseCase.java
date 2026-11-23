package com.rephelper.backend.republic;

import com.rephelper.backend.common.BusinessException;
import com.rephelper.backend.republic.RepublicPayloads.MemberView;
import com.rephelper.backend.user.User;
import com.rephelper.backend.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MembershipUseCase {

    private final RepublicMemberRepository memberRepo;
    private final RepublicSecurityService security;
    private final UserRepository userRepo;

    public MembershipUseCase(
            RepublicMemberRepository memberRepo,
            RepublicSecurityService security,
            UserRepository userRepo
    ) {
        this.memberRepo = memberRepo;
        this.security = security;
        this.userRepo = userRepo;
    }

    @Transactional(readOnly = true)
    public List<MemberView> listActive(UUID republicId, UUID callerUid) {
        security.requireActiveMember(republicId, callerUid);
        return memberRepo.findByRepublicIdAndStatusOrderByJoinedAtAsc(republicId, "ACTIVE")
                .stream()
                .map(MemberView::of)
                .toList();
    }

    @Transactional
    public MemberView toggleAdmin(UUID republicId, UUID targetUid, UUID callerUid, boolean grantAdmin) {
        if (grantAdmin) {
            security.requireAdmin(republicId, callerUid);
        } else {
            security.requireOwner(republicId, callerUid);
        }
        RepublicMember row = memberRepo
                .findByRepublicIdAndUserUidAndStatus(republicId, targetUid, "ACTIVE")
                .orElseThrow(() -> BusinessException.notFound("MEMBER_NOT_FOUND", "Membro não encontrado."));
        if (!grantAdmin && row.isOwner()) {
            throw BusinessException.badRequest("CANNOT_DEMOTE_OWNER", "O proprietário não pode perder permissão.");
        }
        row.setAdmin(grantAdmin);
        return MemberView.of(memberRepo.save(row));
    }

    @Transactional
    public void evict(UUID republicId, UUID targetUid, UUID callerUid) {
        RepublicMember caller = security.requireActiveMember(republicId, callerUid);
        if (!callerUid.equals(targetUid) && !caller.isAdmin() && !caller.isOwner()) {
            throw BusinessException.forbidden("ADMIN_REQUIRED", "Permissão insuficiente para remover membro.");
        }
        RepublicMember row = memberRepo
                .findByRepublicIdAndUserUidAndStatus(republicId, targetUid, "ACTIVE")
                .orElseThrow(() -> BusinessException.notFound("MEMBER_NOT_FOUND", "Membro não encontrado."));
        if (row.isOwner()) {
            throw BusinessException.badRequest("CANNOT_REMOVE_OWNER", "O proprietário não pode ser removido.");
        }
        row.setStatus("INACTIVE");
        row.setAdmin(false);
        memberRepo.save(row);

        User account = row.getUser();
        if (republicId.equals(account.getCurrentRepublicId())) {
            account.setCurrentRepublicId(null);
            userRepo.save(account);
        }
    }
}
