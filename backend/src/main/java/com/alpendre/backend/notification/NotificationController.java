package com.alpendre.backend.notification;

import com.alpendre.backend.config.UserPrincipal;
import com.alpendre.backend.notification.NotificationDTOs.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationView>> listAll(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(notificationService.listAll(principal.getUid()));
    }

    @GetMapping("/unread")
    public ResponseEntity<List<NotificationView>> listUnread(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(notificationService.listUnread(principal.getUid()));
    }

    @GetMapping("/count")
    public ResponseEntity<UnreadCountView> countUnread(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(new UnreadCountView(notificationService.countUnread(principal.getUid())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationView> getById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(notificationService.getOwned(principal.getUid(), id));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<NotificationView> markAsRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(notificationService.markAsRead(principal.getUid(), id));
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<Map<String, String>> markAllRead(@AuthenticationPrincipal UserPrincipal principal) {
        notificationService.markAllAsRead(principal.getUid());
        return ResponseEntity.ok(Map.of("message", "Todas as notificações foram marcadas como lidas."));
    }

    @PostMapping
    public ResponseEntity<NotificationView> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateNotificationInput request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(notificationService.create(principal.getUid(), principal.getCurrentHouseId(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        notificationService.deleteOwned(principal.getUid(), id);
        return ResponseEntity.ok(Map.of("message", "Notificação excluída com sucesso."));
    }

    @DeleteMapping("/clear-old")
    public ResponseEntity<Map<String, String>> clearOld(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "30") int days
    ) {
        notificationService.clearOld(principal.getUid(), days);
        return ResponseEntity.ok(Map.of("message", "Notificações antigas removidas."));
    }
}
