package com.alpendre.backend.user;

import com.fasterxml.jackson.databind.JsonNode;
import com.alpendre.backend.auth.AuthService;
import com.alpendre.backend.common.BusinessException;
import com.alpendre.backend.media.MediaStorageService;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository users;
    private final AuthService authService;
    private final MediaStorageService mediaService;

    public UserService(
            UserRepository users,
            AuthService authService,
            MediaStorageService mediaService
    ) {
        this.users = users;
        this.authService = authService;
        this.mediaService = mediaService;
    }

    @Transactional(readOnly = true)
    public UserDTO fetchAuthenticatedProfile(UUID uid) {
        User account = users.findById(uid)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));
        return UserDTO.from(account, authService.resolveIsAdmin(account));
    }

    @Transactional
    public UserDTO modifyProfile(UUID actorUid, UUID targetUid, JsonNode payload) {
        if (!actorUid.equals(targetUid)) {
            throw BusinessException.forbidden("FORBIDDEN", "Você só pode alterar o seu próprio perfil.");
        }
        if (payload == null || !payload.isObject()) {
            throw BusinessException.badRequest("INVALID_PAYLOAD", "Corpo da requisição inválido.");
        }

        User account = users.findById(targetUid)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));

        if (payload.has("name")) {
            JsonNode nameNode = payload.get("name");
            if (nameNode.isNull() || nameNode.asText("").isBlank()) {
                throw BusinessException.badRequest("INVALID_NAME", "O nome não pode ser vazio.");
            }
            account.setName(nameNode.asText().trim());
        }
        if (payload.has("nickname")) {
            JsonNode nickNode = payload.get("nickname");
            String nick = nickNode.isNull() ? null : nickNode.asText("").trim();
            account.setNickname(nick == null || nick.isEmpty() ? null : nick);
        }
        if (payload.has("phoneNumber")) {
            JsonNode phoneNode = payload.get("phoneNumber");
            String phone = phoneNode.isNull() ? null : phoneNode.asText("").trim();
            account.setPhoneNumber(phone == null || phone.isEmpty() ? null : phone);
        }

        if (payload.has("profilePictureUrl")) {
            JsonNode picNode = payload.get("profilePictureUrl");
            String nextAvatar = picNode.isNull() ? null : picNode.asText("").trim();
            String sanitizedUrl = (nextAvatar == null || nextAvatar.isEmpty()) ? null : nextAvatar;
            String previousAvatar = account.getProfilePictureUrl();
            if (!Objects.equals(previousAvatar, sanitizedUrl)) {
                account.setProfilePictureUrl(sanitizedUrl);
                if (previousAvatar != null) {
                    mediaService.deleteSupersededUrl(previousAvatar, targetUid);
                }
            }
        }

        account = users.save(account);
        return UserDTO.from(account, authService.resolveIsAdmin(account));
    }
}
