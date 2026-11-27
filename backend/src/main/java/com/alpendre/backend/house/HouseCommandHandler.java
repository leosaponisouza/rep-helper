package com.alpendre.backend.house;

import com.alpendre.backend.auth.AuthDTOs;
import com.alpendre.backend.auth.AuthService;
import com.alpendre.backend.common.BusinessException;
import com.alpendre.backend.house.HousePayloads.*;
import com.alpendre.backend.user.User;
import com.alpendre.backend.user.UserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HouseCommandHandler {

    private final HouseRepository houseRepo;
    private final HouseMemberRepository memberRepo;
    private final HouseSecurityService security;
    private final UserRepository userRepo;
    private final AuthService authService;
    private final InviteCodeGenerator inviteGenerator;

    public HouseCommandHandler(
            HouseRepository houseRepo,
            HouseMemberRepository memberRepo,
            HouseSecurityService security,
            UserRepository userRepo,
            AuthService authService,
            InviteCodeGenerator inviteGenerator
    ) {
        this.houseRepo = houseRepo;
        this.memberRepo = memberRepo;
        this.security = security;
        this.userRepo = userRepo;
        this.authService = authService;
        this.inviteGenerator = inviteGenerator;
    }

    @Transactional
    public CreatedOutput createHouse(UUID actorId, CreateInput in) {
        User owner = userRepo.findById(actorId)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));

        House house = new House();
        house.setName(in.name().trim());
        house.setCode(inviteGenerator.allocate(houseRepo::existsByCodeIgnoreCase));
        house.setOwner(owner);
        house.getAddress().apply(
                in.street(), in.number(), in.complement(),
                in.neighborhood(), in.city(), in.state(), in.zipCode(), true
        );
        house = houseRepo.save(house);

        HouseMember link = new HouseMember();
        link.setHouse(house);
        link.setUser(owner);
        link.setAdmin(true);
        link.setOwner(true);
        link.setStatus("ACTIVE");
        memberRepo.save(link);

        owner.setCurrentHouseId(house.getId());
        owner = userRepo.save(owner);

        AuthDTOs.AuthResponse session = authService.issueTokens(owner);
        return new CreatedOutput(HouseView.of(house, 1L), session.user(), session.token(), session.refreshToken(), "Casa criada com sucesso!");
    }

    @Transactional(readOnly = true)
    public HouseView fetchHouse(UUID houseId, UUID actorId) {
        security.requireActiveMember(houseId, actorId);
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
        return HouseView.of(house, memberRepo.countByHouseIdAndStatus(houseId, "ACTIVE"));
    }

    @Transactional
    public HouseView updateHouse(UUID houseId, UUID actorId, UpdateInput in) {
        security.requireOwner(houseId, actorId);
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
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
        house = houseRepo.save(house);
        return HouseView.of(house, memberRepo.countByHouseIdAndStatus(houseId, "ACTIVE"));
    }

    @Transactional
    public JoinedOutput joinByInvite(UUID actorId, String inviteCode) {
        House house = houseRepo.findByCodeIgnoreCase(inviteCode.trim().toUpperCase())
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
        User account = userRepo.findById(actorId)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));

        HouseMember link = memberRepo.findByHouseIdAndUserUid(house.getId(), actorId).orElse(null);
        if (link != null && "ACTIVE".equalsIgnoreCase(link.getStatus())) {
            throw BusinessException.badRequest("ALREADY_MEMBER", "Você já é morador desta casa.");
        }
        if (link != null && "BANNED".equalsIgnoreCase(link.getStatus())) {
            throw BusinessException.forbidden("MEMBER_BANNED", "Acesso negado.");
        }
        if (link == null) {
            link = new HouseMember();
            link.setHouse(house);
            link.setUser(account);
        }
        link.setStatus("ACTIVE");
        memberRepo.save(link);

        account.setCurrentHouseId(house.getId());
        account = userRepo.save(account);

        AuthDTOs.AuthResponse session = authService.issueTokens(account);
        long count = memberRepo.countByHouseIdAndStatus(house.getId(), "ACTIVE");
        return new JoinedOutput(session.token(), session.refreshToken(), session.user(), HouseView.of(house, count), "Você entrou na casa com sucesso!");
    }

    @Transactional
    public CodeOutput changeInviteCode(UUID houseId, UUID actorId, RegenerateCodeInput in) {
        security.requireAdmin(houseId, actorId);
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));

        String next = (in != null && in.customCode() != null && !in.customCode().isBlank())
                ? in.customCode().trim().toUpperCase()
                : inviteGenerator.allocate(houseRepo::existsByCodeIgnoreCase);

        if (next.length() != InviteCodeGenerator.CODE_SIZE || !next.matches("^[A-Z0-9]+$")) {
            throw BusinessException.badRequest("INVALID_INVITE_CODE", "Código inválido.");
        }
        if (!next.equalsIgnoreCase(house.getCode()) && houseRepo.existsByCodeIgnoreCase(next)) {
            throw BusinessException.conflict("INVITE_CODE_TAKEN", "Código já utilizado.");
        }
        house.setCode(next);
        houseRepo.save(house);
        return new CodeOutput(next, "Código de convite atualizado com sucesso!");
    }
}
