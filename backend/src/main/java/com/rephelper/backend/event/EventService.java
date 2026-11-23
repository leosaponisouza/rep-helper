package com.rephelper.backend.event;

import com.rephelper.backend.common.BusinessException;
import com.rephelper.backend.event.EventDTOs.*;
import com.rephelper.backend.notification.NotificationService;
import com.rephelper.backend.republic.Republic;
import com.rephelper.backend.republic.RepublicMember;
import com.rephelper.backend.republic.RepublicMemberRepository;
import com.rephelper.backend.republic.RepublicRepository;
import com.rephelper.backend.republic.RepublicSecurityService;
import com.rephelper.backend.user.User;
import com.rephelper.backend.user.UserRepository;
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
    private final RepublicRepository republicRepo;
    private final RepublicMemberRepository memberRepo;
    private final RepublicSecurityService security;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    public EventService(
            EventRepository eventRepo,
            RepublicRepository republicRepo,
            RepublicMemberRepository memberRepo,
            RepublicSecurityService security,
            UserRepository userRepo,
            NotificationService notificationService
    ) {
        this.eventRepo = eventRepo;
        this.republicRepo = republicRepo;
        this.memberRepo = memberRepo;
        this.security = security;
        this.userRepo = userRepo;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<EventView> listAll(UUID callerUid) {
        UUID republicId = findCurrentRepublicId(callerUid);
        if (republicId == null) return List.of();
        security.requireActiveMember(republicId, callerUid);
        return eventRepo.findByRepublicIdOrderByStartDateAsc(republicId)
                .stream()
                .map(EventView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EventView> listUpcoming(UUID callerUid) {
        UUID republicId = findCurrentRepublicId(callerUid);
        if (republicId == null) return List.of();
        security.requireActiveMember(republicId, callerUid);
        return eventRepo.findUpcomingByRepublicId(republicId, OffsetDateTime.now())
                .stream()
                .map(EventView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EventView> listByMyInvitationStatus(UUID callerUid, String status) {
        UUID republicId = findCurrentRepublicId(callerUid);
        if (republicId == null) return List.of();
        security.requireActiveMember(republicId, callerUid);
        return eventRepo.findByRepublicAndInvitationStatus(republicId, callerUid, status)
                .stream()
                .map(EventView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventView getById(UUID callerUid, Long eventId) {
        Event event = eventRepo.findWithDetailsById(eventId)
                .orElseThrow(() -> BusinessException.notFound("EVENT_NOT_FOUND", "Evento não encontrado."));
        security.requireActiveMember(event.getRepublic().getId(), callerUid);
        return EventView.from(event);
    }

    @Transactional
    public EventView create(UUID callerUid, CreateEventInput input) {
        validateDates(input.startDate(), input.endDate());
        UUID republicId = input.republicId();
        security.requireActiveMember(republicId, callerUid);

        Republic republic = republicRepo.findById(republicId)
                .orElseThrow(() -> BusinessException.notFound("REPUBLIC_NOT_FOUND", "República não encontrada."));
        User creator = userRepo.findById(callerUid)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));

        Event event = new Event();
        event.setRepublic(republic);
        event.setCreator(creator);
        event.setTitle(input.title().trim());
        event.setDescription(input.description().trim());
        event.setStartDate(input.startDate());
        event.setEndDate(input.endDate());
        event.setLocation(input.location().trim());

        Event saved = eventRepo.save(event);

        EventInvitation creatorInv = new EventInvitation(saved, creator, "CONFIRMED");
        creatorInv.setRespondedAt(OffsetDateTime.now());
        saved.getInvitations().add(creatorInv);

        if (input.invitedUserIds() != null && !input.invitedUserIds().isEmpty()) {
            addInvitationsAndNotify(saved, callerUid, input.invitedUserIds());
        }

        return EventView.from(eventRepo.save(saved));
    }

    @Transactional
    public EventView update(UUID callerUid, Long eventId, UpdateEventInput input) {
        Event event = eventRepo.findByIdForUpdate(eventId)
                .orElseThrow(() -> BusinessException.notFound("EVENT_NOT_FOUND", "Evento não encontrado."));
        RepublicMember caller = security.requireActiveMember(event.getRepublic().getId(), callerUid);
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
        event.setStartDate(nextStart);
        event.setEndDate(nextEnd);

        return EventView.from(eventRepo.save(event));
    }

    @Transactional
    public void delete(UUID callerUid, Long eventId) {
        Event event = eventRepo.findByIdForUpdate(eventId)
                .orElseThrow(() -> BusinessException.notFound("EVENT_NOT_FOUND", "Evento não encontrado."));
        RepublicMember caller = security.requireActiveMember(event.getRepublic().getId(), callerUid);
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
        security.requireActiveMember(event.getRepublic().getId(), callerUid);

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
        security.requireActiveMember(event.getRepublic().getId(), callerUid);

        addInvitationsAndNotify(event, callerUid, input.userIds());
        return EventView.from(eventRepo.save(event));
    }

    private void addInvitationsAndNotify(Event event, UUID actorUid, List<UUID> requestedUids) {
        if (requestedUids == null || requestedUids.isEmpty()) {
            return;
        }
        UUID republicId = event.getRepublic().getId();
        Map<UUID, User> activeMembersByUid = memberRepo
                .findByRepublicIdAndStatusOrderByJoinedAtAsc(republicId, "ACTIVE")
                .stream()
                .map(RepublicMember::getUser)
                .collect(Collectors.toMap(User::getUid, Function.identity(), (a, b) -> a));

        Set<UUID> alreadyInvited = event.getInvitations().stream()
                .map(inv -> inv.getUser().getUid())
                .collect(Collectors.toSet());

        List<UUID> newlyInvitedUids = new ArrayList<>();
        for (UUID uid : requestedUids) {
            User member = activeMembersByUid.get(uid);
            if (member == null) {
                throw BusinessException.badRequest(
                        "INVALID_INVITEE",
                        "Todos os convidados devem ser membros ativos da república."
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
                    republicId,
                    "Novo convite de evento",
                    "Você foi convidado para o evento \"" + event.getTitle() + "\".",
                    "EVENT_INVITATION",
                    "EVENT",
                    String.valueOf(event.getId())
            );
        }
    }

    private UUID findCurrentRepublicId(UUID callerUid) {
        return userRepo.findById(callerUid).map(User::getCurrentRepublicId).orElse(null);
    }

    private void validateDates(OffsetDateTime startDate, OffsetDateTime endDate) {
        if (startDate == null || endDate == null || !endDate.isAfter(startDate)) {
            throw BusinessException.badRequest(
                    "INVALID_EVENT_DATES",
                    "A data de término deve ser posterior à data de início."
            );
        }
    }

    private void requireCreatorOrAdmin(UUID creatorUid, UUID callerUid, RepublicMember caller) {
        if (!creatorUid.equals(callerUid) && !caller.isAdmin() && !caller.isOwner()) {
            throw BusinessException.forbidden("FORBIDDEN", "Apenas o criador ou um administrador pode alterar este evento.");
        }
    }
}
