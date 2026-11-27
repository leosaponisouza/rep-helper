package com.alpendre.backend.event;

import com.alpendre.backend.common.BusinessException;
import com.alpendre.backend.event.EventDTOs.*;
import com.alpendre.backend.house.House;
import com.alpendre.backend.house.HouseMember;
import com.alpendre.backend.house.HouseMemberRepository;
import com.alpendre.backend.house.HouseRepository;
import com.alpendre.backend.house.HouseSecurityService;
import com.alpendre.backend.notification.NotificationService;
import com.alpendre.backend.user.User;
import com.alpendre.backend.user.UserRepository;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventService {

    private static final Set<String> ALLOWED_INVITATION_STATUSES = Set.of(
            "INVITED", "CONFIRMED", "DECLINED"
    );

    private final EventRepository eventRepo;
    private final HouseRepository houseRepo;
    private final HouseMemberRepository memberRepo;
    private final HouseSecurityService security;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    public EventService(
            EventRepository eventRepo,
            HouseRepository houseRepo,
            HouseMemberRepository memberRepo,
            HouseSecurityService security,
            UserRepository userRepo,
            NotificationService notificationService
    ) {
        this.eventRepo = eventRepo;
        this.houseRepo = houseRepo;
        this.memberRepo = memberRepo;
        this.security = security;
        this.userRepo = userRepo;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<EventView> listAll(UUID callerUid) {
        UUID houseId = findCurrentHouseId(callerUid);
        if (houseId == null) return List.of();
        security.requireActiveMember(houseId, callerUid);
        return eventRepo.findByHouseIdOrderByStartDateAsc(houseId)
                .stream()
                .map(EventView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EventView> listUpcoming(UUID callerUid) {
        UUID houseId = findCurrentHouseId(callerUid);
        if (houseId == null) return List.of();
        security.requireActiveMember(houseId, callerUid);
        return eventRepo.findUpcomingByHouseId(houseId, OffsetDateTime.now())
                .stream()
                .map(EventView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EventView> listByMyInvitationStatus(UUID callerUid, String status) {
        UUID houseId = findCurrentHouseId(callerUid);
        if (houseId == null) return List.of();
        security.requireActiveMember(houseId, callerUid);
        return eventRepo.findByHouseAndInvitationStatus(houseId, callerUid, status)
                .stream()
                .map(EventView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventView getById(UUID callerUid, Long eventId) {
        Event event = eventRepo.findWithDetailsById(eventId)
                .orElseThrow(() -> BusinessException.notFound("EVENT_NOT_FOUND", "Evento não encontrado."));
        security.requireActiveMember(event.getHouse().getId(), callerUid);
        return EventView.from(event);
    }

    @Transactional
    public EventView create(UUID callerUid, CreateEventInput input) {
        validateDates(input.startDate(), input.endDate());
        UUID houseId = input.houseId();
        security.requireActiveMember(houseId, callerUid);

        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
        User creator = userRepo.findById(callerUid)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));

        boolean requireRsvp = input.requireRsvp() == null || input.requireRsvp();

        Event event = new Event();
        event.setHouse(house);
        event.setCreator(creator);
        event.setTitle(input.title().trim());
        event.setDescription(input.description().trim());
        event.setStartDate(input.startDate());
        event.setEndDate(input.endDate());
        event.setLocation(input.location().trim());
        event.setRequireRsvp(requireRsvp);

        Event saved = eventRepo.save(event);

        if (requireRsvp) {
            EventInvitation creatorInv = new EventInvitation(saved, creator, "CONFIRMED");
            creatorInv.setRespondedAt(OffsetDateTime.now());
            saved.getInvitations().add(creatorInv);

            if (input.invitedUserIds() != null && !input.invitedUserIds().isEmpty()) {
                addInvitationsAndNotify(saved, callerUid, input.invitedUserIds());
            }
        } else if (input.invitedUserIds() != null && !input.invitedUserIds().isEmpty()) {
            notifyAgendaMembersWithoutRsvp(saved, callerUid, input.invitedUserIds());
        }

        return EventView.from(eventRepo.save(saved));
    }

    @Transactional
    public EventView update(UUID callerUid, Long eventId, UpdateEventInput input) {
        Event event = eventRepo.findByIdForUpdate(eventId)
                .orElseThrow(() -> BusinessException.notFound("EVENT_NOT_FOUND", "Evento não encontrado."));
        HouseMember caller = security.requireActiveMember(event.getHouse().getId(), callerUid);
        requireCreatorOrAdmin(event.getCreator().getUid(), callerUid, caller);

        OffsetDateTime nextStart = input.startDate() != null ? input.startDate() : event.getStartDate();
        OffsetDateTime nextEnd = input.endDate() != null ? input.endDate() : event.getEndDate();
        validateDates(nextStart, nextEnd);

        if (input.title() != null && !input.title().isBlank()) {
            event.setTitle(input.title().trim());
        }
        if (input.description() != null && !input.description().isBlank()) {
            event.setDescription(input.description().trim());
        }
        if (input.location() != null && !input.location().isBlank()) {
            event.setLocation(input.location().trim());
        }
        if (input.requireRsvp() != null) {
            boolean nextRsvp = input.requireRsvp();
            if (!nextRsvp) {
                event.getInvitations().clear();
            } else if (!event.isRequireRsvp() && event.getInvitations().isEmpty()) {
                EventInvitation creatorInv = new EventInvitation(event, event.getCreator(), "CONFIRMED");
                creatorInv.setRespondedAt(OffsetDateTime.now());
                event.getInvitations().add(creatorInv);
            }
            event.setRequireRsvp(nextRsvp);
        }
        event.setStartDate(nextStart);
        event.setEndDate(nextEnd);

        return EventView.from(eventRepo.save(event));
    }

    @Transactional
    public void delete(UUID callerUid, Long eventId) {
        Event event = eventRepo.findByIdForUpdate(eventId)
                .orElseThrow(() -> BusinessException.notFound("EVENT_NOT_FOUND", "Evento não encontrado."));
        HouseMember caller = security.requireActiveMember(event.getHouse().getId(), callerUid);
        requireCreatorOrAdmin(event.getCreator().getUid(), callerUid, caller);
        eventRepo.delete(event);
    }

    @Transactional
    public EventView respond(UUID callerUid, Long eventId, RespondEventInput input) {
        String normalized = input.status() != null ? input.status().trim().toUpperCase() : "";
        if (!ALLOWED_INVITATION_STATUSES.contains(normalized)) {
            throw BusinessException.badRequest("INVALID_STATUS", "Status de resposta inválido.");
        }

        Event event = eventRepo.findByIdForUpdate(eventId)
                .orElseThrow(() -> BusinessException.notFound("EVENT_NOT_FOUND", "Evento não encontrado."));
        security.requireActiveMember(event.getHouse().getId(), callerUid);

        if (!event.isRequireRsvp()) {
            throw BusinessException.badRequest(
                    "RSVP_NOT_ENABLED",
                    "Este compromisso não utiliza confirmação de presença."
            );
        }

        EventInvitation invitation = event.getInvitations().stream()
                .filter(inv -> inv.getUser().getUid().equals(callerUid))
                .findFirst()
                .orElse(null);

        if (invitation == null) {
            User callerUser = userRepo.findById(callerUid)
                    .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));
            invitation = new EventInvitation(event, callerUser, normalized);
            event.getInvitations().add(invitation);
        } else {
            invitation.setStatus(normalized);
        }
        invitation.setRespondedAt(OffsetDateTime.now());

        return EventView.from(eventRepo.save(event));
    }

    @Transactional
    public EventView inviteUsers(UUID callerUid, Long eventId, InviteUsersInput input) {
        Event event = eventRepo.findByIdForUpdate(eventId)
                .orElseThrow(() -> BusinessException.notFound("EVENT_NOT_FOUND", "Evento não encontrado."));
        security.requireActiveMember(event.getHouse().getId(), callerUid);

        if (!event.isRequireRsvp()) {
            throw BusinessException.badRequest(
                    "RSVP_NOT_ENABLED",
                    "Este compromisso não utiliza confirmação de presença."
            );
        }

        addInvitationsAndNotify(event, callerUid, input.userIds());
        return EventView.from(eventRepo.save(event));
    }

    private void addInvitationsAndNotify(Event event, UUID actorUid, List<UUID> requestedUids) {
        if (requestedUids == null || requestedUids.isEmpty()) {
            return;
        }
        UUID houseId = event.getHouse().getId();
        Map<UUID, User> activeMembersByUid = resolveActiveMembersMap(houseId);

        Set<UUID> alreadyInvited = event.getInvitations().stream()
                .map(inv -> inv.getUser().getUid())
                .collect(Collectors.toSet());

        List<UUID> newlyInvitedUids = new ArrayList<>();
        for (UUID uid : requestedUids) {
            User member = activeMembersByUid.get(uid);
            if (member == null) {
                throw BusinessException.badRequest(
                        "INVALID_INVITEE",
                        "Todos os convidados devem ser moradores ativos da casa."
                );
            }
            if (alreadyInvited.add(uid)) {
                event.getInvitations().add(new EventInvitation(event, member, "INVITED"));
                if (!uid.equals(actorUid)) {
                    newlyInvitedUids.add(uid);
                }
            }
        }

        if (!newlyInvitedUids.isEmpty()) {
            notificationService.notifyUsers(
                    newlyInvitedUids,
                    houseId,
                    "Novo convite de evento",
                    "Você foi convidado para o evento \"" + event.getTitle() + "\".",
                    "EVENT_INVITATION",
                    "EVENT",
                    String.valueOf(event.getId())
            );
        }
    }

    private void notifyAgendaMembersWithoutRsvp(Event event, UUID actorUid, List<UUID> requestedUids) {
        UUID houseId = event.getHouse().getId();
        Map<UUID, User> activeMembersByUid = resolveActiveMembersMap(houseId);
        List<UUID> recipients = new ArrayList<>();
        for (UUID uid : requestedUids) {
            if (!activeMembersByUid.containsKey(uid)) {
                throw BusinessException.badRequest(
                        "INVALID_INVITEE",
                        "Todos os destinatários devem ser moradores ativos da casa."
                );
            }
            if (!uid.equals(actorUid) && !recipients.contains(uid)) {
                recipients.add(uid);
            }
        }
        if (!recipients.isEmpty()) {
            notificationService.notifyUsers(
                    recipients,
                    houseId,
                    "Novo compromisso na agenda",
                    "Novo compromisso registrado na agenda da casa: \"" + event.getTitle() + "\".",
                    "EVENT_NOTICE",
                    "EVENT",
                    String.valueOf(event.getId())
            );
        }
    }

    private Map<UUID, User> resolveActiveMembersMap(UUID houseId) {
        return memberRepo
                .findByHouseIdAndStatusOrderByJoinedAtAsc(houseId, "ACTIVE")
                .stream()
                .map(HouseMember::getUser)
                .collect(Collectors.toMap(User::getUid, Function.identity(), (a, b) -> a));
    }

    private UUID findCurrentHouseId(UUID callerUid) {
        return userRepo.findById(callerUid).map(User::getCurrentHouseId).orElse(null);
    }

    private void validateDates(OffsetDateTime start, OffsetDateTime end) {
        if (start == null || end == null || !end.isAfter(start)) {
            throw BusinessException.badRequest(
                    "INVALID_EVENT_DATES",
                    "A data de término deve ser posterior à data de início."
            );
        }
    }

    private void requireCreatorOrAdmin(UUID creatorUid, UUID callerUid, HouseMember caller) {
        boolean isEffectiveAdmin = caller.isAdmin()
                || caller.isOwner()
                || (caller.getHouse() != null && caller.getHouse().isAllMembersAdmin());
        if (!creatorUid.equals(callerUid) && !isEffectiveAdmin) {
            throw BusinessException.forbidden(
                    "FORBIDDEN",
                    "Apenas o criador ou um administrador pode alterar este evento."
            );
        }
    }
}
