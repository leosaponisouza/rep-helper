package com.rephelper.backend.republic;

import com.rephelper.backend.auth.AuthDTOs;
import com.rephelper.backend.auth.AuthService;
import com.rephelper.backend.common.BusinessException;
import com.rephelper.backend.republic.RepublicPayloads.*;
import com.rephelper.backend.user.User;
import com.rephelper.backend.user.UserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RepublicCommandHandler {

    private final RepublicRepository republicRepo;
    private final RepublicMemberRepository memberRepo;
    private final RepublicSecurityService security;
    private final UserRepository userRepo;
    private final AuthService authService;
    private final InviteCodeGenerator inviteGenerator;

    public RepublicCommandHandler(
            RepublicRepository republicRepo,
            RepublicMemberRepository memberRepo,
            RepublicSecurityService security,
            UserRepository userRepo,
            AuthService authService,
            InviteCodeGenerator inviteGenerator
    ) {
        this.republicRepo = republicRepo;
        this.memberRepo = memberRepo;
        this.security = security;
        this.userRepo = userRepo;
        this.authService = authService;
        this.inviteGenerator = inviteGenerator;
    }

    @Transactional
    public CreatedOutput createRepublic(UUID actorId, CreateInput in) {
        User owner = userRepo.findById(actorId)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));

        Republic house = new Republic();
        house.setName(in.name().trim());
        house.setCode(inviteGenerator.allocate(republicRepo::existsByCodeIgnoreCase));
        house.setOwner(owner);
        house.getAddress().apply(
                in.street(), in.number(), in.complement(),
                in.neighborhood(), in.city(), in.state(), in.zipCode(), true
        );
        house = republicRepo.save(house);

        RepublicMember link = new RepublicMember();
        link.setRepublic(house);
        link.setUser(owner);
        link.setAdmin(true);
        link.setOwner(true);
        link.setStatus("ACTIVE");
        memberRepo.save(link);

        owner.setCurrentRepublicId(house.getId());
        owner = userRepo.save(owner);

        AuthDTOs.AuthResponse session = authService.issueTokens(owner);
        return new CreatedOutput(RepublicView.of(house, 1L), session.user(), session.token(), session.refreshToken(), "República criada com sucesso!");
    }

    @Transactional(readOnly = true)
    public RepublicView fetchRepublic(UUID republicId, UUID actorId) {
        security.requireActiveMember(republicId, actorId);
        Republic house = republicRepo.findById(republicId)
                .orElseThrow(() -> BusinessException.notFound("REPUBLIC_NOT_FOUND", "República não encontrada."));
        return RepublicView.of(house, memberRepo.countByRepublicIdAndStatus(republicId, "ACTIVE"));
    }

    @Transactional
    public RepublicView updateRepublic(UUID republicId, UUID actorId, UpdateInput in) {
        security.requireOwner(republicId, actorId);
        Republic house = republicRepo.findById(republicId)
                .orElseThrow(() -> BusinessException.notFound("REPUBLIC_NOT_FOUND", "República não encontrada."));
        if (in.name() != null && !in.name().isBlank()) {
            house.setName(in.name().trim());
        }
        AddressView nested = in.address();
        if (nested != null) {
            house.getAddress().apply(nested.street(), nested.number(), nested.complement(),
                    nested.neighborhood(), nested.city(), nested.state(), nested.zipCode(), true);
        } else {
            house.getAddress().apply(in.street(), in.number(), in.complement(),
                    in.neighborhood(), in.city(), in.state(), in.zipCode(), false);
        }
        house = republicRepo.save(house);
        return RepublicView.of(house, memberRepo.countByRepublicIdAndStatus(republicId, "ACTIVE"));
    }

    @Transactional
    public JoinedOutput joinByInvite(UUID actorId, String inviteCode) {
        Republic house = republicRepo.findByCodeIgnoreCase(inviteCode.trim().toUpperCase())
                .orElseThrow(() -> BusinessException.notFound("REPUBLIC_NOT_FOUND", "República não encontrada."));
        User account = userRepo.findById(actorId)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));

        RepublicMember link = memberRepo.findByRepublicIdAndUserUid(house.getId(), actorId).orElse(null);
        if (link != null && "ACTIVE".equalsIgnoreCase(link.getStatus())) {
            throw BusinessException.badRequest("ALREADY_MEMBER", "Já é membro desta república.");
        }
        if (link != null && "BANNED".equalsIgnoreCase(link.getStatus())) {
            throw BusinessException.forbidden("MEMBER_BANNED", "Acesso negado.");
        }
        if (link == null) {
            link = new RepublicMember();
            link.setRepublic(house);
            link.setUser(account);
        }
        link.setStatus("ACTIVE");
        memberRepo.save(link);

        account.setCurrentRepublicId(house.getId());
        account = userRepo.save(account);

        AuthDTOs.AuthResponse session = authService.issueTokens(account);
        long count = memberRepo.countByRepublicIdAndStatus(house.getId(), "ACTIVE");
        return new JoinedOutput(session.token(), session.refreshToken(), session.user(), RepublicView.of(house, count), "Você entrou na república com sucesso!");
    }

    @Transactional
    public CodeOutput changeInviteCode(UUID republicId, UUID actorId, RegenerateCodeInput in) {
        security.requireAdmin(republicId, actorId);
        Republic house = republicRepo.findById(republicId)
                .orElseThrow(() -> BusinessException.notFound("REPUBLIC_NOT_FOUND", "República não encontrada."));

        String next = (in != null && in.customCode() != null && !in.customCode().isBlank())
                ? in.customCode().trim().toUpperCase()
                : inviteGenerator.allocate(republicRepo::existsByCodeIgnoreCase);

        if (next.length() != InviteCodeGenerator.CODE_SIZE || !next.matches("^[A-Z0-9]+$")) {
            throw BusinessException.badRequest("INVALID_INVITE_CODE", "Código inválido.");
        }
        if (!next.equalsIgnoreCase(house.getCode()) && republicRepo.existsByCodeIgnoreCase(next)) {
            throw BusinessException.conflict("INVITE_CODE_TAKEN", "Código já utilizado.");
        }
        house.setCode(next);
        republicRepo.save(house);
        return new CodeOutput(next, "Código de convite atualizado com sucesso!");
    }
}
