package com.alpendre.backend.house;

import com.alpendre.backend.config.UserPrincipal;
import com.alpendre.backend.house.HousePayloads.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/houses")
public class HouseController {

    private final HouseCommandHandler commandHandler;
    private final MembershipUseCase membershipUseCase;

    public HouseController(
            HouseCommandHandler commandHandler,
            MembershipUseCase membershipUseCase
    ) {
        this.commandHandler = commandHandler;
        this.membershipUseCase = membershipUseCase;
    }

    @GetMapping("/code-length")
    public ResponseEntity<CodeLengthOutput> getCodeLength() {
        return ResponseEntity.ok(new CodeLengthOutput(InviteCodeGenerator.CODE_SIZE, InviteCodeGenerator.CODE_SIZE));
    }

    @PostMapping
    public ResponseEntity<CreatedOutput> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateInput request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commandHandler.createHouse(principal.getUid(), request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<HouseView> getById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(commandHandler.fetchHouse(id, principal.getUid()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HouseView> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateInput request
    ) {
        return ResponseEntity.ok(commandHandler.updateHouse(id, principal.getUid(), request));
    }

    @PostMapping("/join")
    public ResponseEntity<JoinedOutput> join(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody JoinInput request
    ) {
        return ResponseEntity.ok(commandHandler.joinByInvite(principal.getUid(), request.code()));
    }

    @GetMapping("/{id}/members")
    public ResponseEntity<List<MemberView>> listMembers(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(membershipUseCase.listActive(id, principal.getUid()));
    }

    @PostMapping("/{id}/members/{memberId}/admin")
    public ResponseEntity<MemberView> promoteToAdmin(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID memberId
    ) {
        return ResponseEntity.ok(membershipUseCase.toggleAdmin(id, memberId, principal.getUid(), true));
    }

    @DeleteMapping("/{id}/members/{memberId}/admin")
    public ResponseEntity<MemberView> demoteFromAdmin(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID memberId
    ) {
        return ResponseEntity.ok(membershipUseCase.toggleAdmin(id, memberId, principal.getUid(), false));
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public ResponseEntity<Map<String, String>> removeMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID memberId
    ) {
        membershipUseCase.evict(id, memberId, principal.getUid());
        return ResponseEntity.ok(Map.of("message", "Morador removido com sucesso."));
    }

    @PostMapping("/{id}/regenerate-code")
    public ResponseEntity<CodeOutput> regenerateInviteCode(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody(required = false) RegenerateCodeInput request
    ) {
        return ResponseEntity.ok(commandHandler.changeInviteCode(id, principal.getUid(), request));
    }
}
