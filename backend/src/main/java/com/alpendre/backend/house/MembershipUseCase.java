package com.alpendre.backend.house;

import com.alpendre.backend.common.BusinessException;
import com.alpendre.backend.house.HousePayloads.MemberView;
import com.alpendre.backend.user.User;
import com.alpendre.backend.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MembershipUseCase {

    private final HouseMemberRepository memberRepo;
    private final HouseSecurityService security;
    private final UserRepository userRepo;

    public MembershipUseCase(
            HouseMemberRepository memberRepo,
            HouseSecurityService security,
            UserRepository userRepo
    ) {
        this.memberRepo = memberRepo;
        this.security = security;
        this.userRepo = userRepo;
    }

    @Transactional(readOnly = true)
    public List<MemberView> listActive(UUID houseId, UUID callerUid) {
        security.requireActiveMember(houseId, callerUid);
        return memberRepo.findByHouseIdAndStatusOrderByJoinedAtAsc(houseId, "ACTIVE")
                .stream()
                .map(MemberView::of)
                .toList();
    }

    @Transactional
    public MemberView toggleAdmin(UUID houseId, UUID targetUid, UUID callerUid, boolean grantAdmin) {
        if (grantAdmin) {
            security.requireAdmin(houseId, callerUid);
        } else {
            security.requireOwner(houseId, callerUid);
        }
        HouseMember row = memberRepo
                .findByHouseIdAndUserUidAndStatus(houseId, targetUid, "ACTIVE")
                .orElseThrow(() -> BusinessException.notFound("MEMBER_NOT_FOUND", "Morador não encontrado."));
        if (!grantAdmin && row.isOwner()) {
            throw BusinessException.badRequest("CANNOT_DEMOTE_OWNER", "O proprietário não pode perder permissão.");
        }
        if (!grantAdmin && row.getHouse() != null && row.getHouse().isAllMembersAdmin()) {
            throw BusinessException.badRequest(
                    "ALL_MEMBERS_ADMIN_ENABLED",
                    "Não é possível remover permissão de administrador enquanto todos os moradores administram a casa."
            );
        }
        row.setAdmin(grantAdmin);
        return MemberView.of(memberRepo.save(row));
    }

    @Transactional
    public void evict(UUID houseId, UUID targetUid, UUID callerUid) {
        HouseMember caller = security.requireActiveMember(houseId, callerUid);
        if (!callerUid.equals(targetUid) && !caller.isAdmin() && !caller.isOwner()) {
            throw BusinessException.forbidden("ADMIN_REQUIRED", "Permissão insuficiente para remover morador.");
        }
        HouseMember row = memberRepo
                .findByHouseIdAndUserUidAndStatus(houseId, targetUid, "ACTIVE")
                .orElseThrow(() -> BusinessException.notFound("MEMBER_NOT_FOUND", "Morador não encontrado."));
        if (row.isOwner()) {
            throw BusinessException.badRequest("CANNOT_REMOVE_OWNER", "O proprietário não pode ser removido.");
        }
        row.setStatus("INACTIVE");
        row.setAdmin(false);
        memberRepo.save(row);

        User account = row.getUser();
        if (houseId.equals(account.getCurrentHouseId())) {
            account.setCurrentHouseId(null);
            userRepo.save(account);
        }
    }
}
