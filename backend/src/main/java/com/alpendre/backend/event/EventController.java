package com.alpendre.backend.event;

import com.alpendre.backend.config.UserPrincipal;
import com.alpendre.backend.event.EventDTOs.*;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public ResponseEntity<List<EventView>> listAll(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(eventService.listAll(principal.getUid()));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<EventView>> listUpcoming(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(eventService.listUpcoming(principal.getUid()));
    }

    @GetMapping("/invited")
    public ResponseEntity<List<EventView>> listInvited(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(eventService.listByMyInvitationStatus(principal.getUid(), "INVITED"));
    }

    @GetMapping("/confirmed")
    public ResponseEntity<List<EventView>> listConfirmed(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(eventService.listByMyInvitationStatus(principal.getUid(), "CONFIRMED"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventView> getById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(eventService.getById(principal.getUid(), id));
    }

    @PostMapping
    public ResponseEntity<EventView> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateEventInput request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventService.create(principal.getUid(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventView> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody UpdateEventInput request
    ) {
        return ResponseEntity.ok(eventService.update(principal.getUid(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        eventService.delete(principal.getUid(), id);
        return ResponseEntity.ok(Map.of("message", "Evento excluído com sucesso."));
    }

    @PutMapping("/{id}/respond")
    public ResponseEntity<EventView> respond(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody RespondEventInput request
    ) {
        return ResponseEntity.ok(eventService.respond(principal.getUid(), id, request));
    }

    @PostMapping("/{id}/invite")
    public ResponseEntity<EventView> invite(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody InviteUsersInput request
    ) {
        return ResponseEntity.ok(eventService.inviteUsers(principal.getUid(), id, request));
    }
}
