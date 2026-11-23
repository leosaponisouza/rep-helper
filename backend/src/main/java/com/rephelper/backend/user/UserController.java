package com.rephelper.backend.user;

import com.fasterxml.jackson.databind.JsonNode;
import com.rephelper.backend.config.UserPrincipal;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, UserDTO>> currentUser(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(Map.of("user", userService.fetchAuthenticatedProfile(principal.getUid())));
    }

    @PutMapping("/{uid}")
    public ResponseEntity<UserDTO> updateUser(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID uid,
            @RequestBody JsonNode payload
    ) {
        return ResponseEntity.ok(userService.modifyProfile(principal.getUid(), uid, payload));
    }
}
