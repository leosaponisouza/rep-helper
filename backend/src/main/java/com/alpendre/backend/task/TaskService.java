package com.alpendre.backend.task;

import com.alpendre.backend.common.BusinessException;
import com.alpendre.backend.common.PagedResponse;
import com.alpendre.backend.notification.NotificationService;
import com.alpendre.backend.house.House;
import com.alpendre.backend.house.HouseMember;
import com.alpendre.backend.house.HouseMemberRepository;
import com.alpendre.backend.house.HouseRepository;
import com.alpendre.backend.house.HouseSecurityService;
import com.alpendre.backend.task.TaskDTOs.*;
import com.alpendre.backend.user.User;
import com.alpendre.backend.user.UserRepository;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {

    private static final Set<String> ALLOWED_STATUSES = Set.of(
            "PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE", "CANCELLED"
    );
    private static final Set<String> ALLOWED_RECURRENCE = Set.of(
            "DAILY", "WEEKLY", "MONTHLY", "YEARLY"
    );
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "dueDate", "createdAt", "updatedAt", "title", "status", "category"
    );

    private final TaskRepository taskRepo;
    private final HouseRepository houseRepo;
    private final HouseMemberRepository memberRepo;
    private final HouseSecurityService security;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    public TaskService(
            TaskRepository taskRepo,
            HouseRepository houseRepo,
            HouseMemberRepository memberRepo,
            HouseSecurityService security,
            UserRepository userRepo,
            NotificationService notificationService
    ) {
        this.taskRepo = taskRepo;
        this.houseRepo = houseRepo;
        this.memberRepo = memberRepo;
        this.security = security;
        this.userRepo = userRepo;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public TaskView getById(UUID callerUid, Long taskId) {
        Task task = taskRepo.findWithDetailsById(taskId)
                .orElseThrow(() -> BusinessException.notFound("TASK_NOT_FOUND", "Tarefa não encontrada."));
        security.requireActiveMember(task.getHouse().getId(), callerUid);
        return TaskView.from(task);
    }

    @Transactional(readOnly = true)
    public List<TaskView> listAll(UUID callerUid, UUID requestedHouseId) {
        UUID houseId = resolveHouseId(callerUid, requestedHouseId);
        security.requireActiveMember(houseId, callerUid);
        return taskRepo.findByHouseIdOrderByDueDateAscCreatedAtDesc(houseId)
                .stream()
                .map(TaskView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<TaskView> filterTasks(UUID callerUid, UUID requestedHouseId, TaskFilterInput filter) {
        UUID houseId = resolveHouseId(callerUid, requestedHouseId);
        security.requireActiveMember(houseId, callerUid);
        Pageable pageable = buildPageable(filter);
        Specification<Task> spec = TaskSpecifications.withFilter(houseId, null, filter);
        Page<TaskView> page = taskRepo.findAll(spec, pageable).map(TaskView::from);
        return PagedResponse.from(page);
    }

    @Transactional(readOnly = true)
    public List<TaskView> listAssigned(UUID callerUid, UUID requestedHouseId) {
        UUID houseId = requestedHouseId != null ? requestedHouseId : findCurrentHouseId(callerUid);
        if (houseId != null) {
            security.requireActiveMember(houseId, callerUid);
        }
        return taskRepo.findAssignedToUser(callerUid, houseId)
                .stream()
                .map(TaskView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PagedResponse<TaskView> filterAssignedTasks(UUID callerUid, TaskFilterInput filter) {
        UUID houseId = resolveHouseId(callerUid, null);
        security.requireActiveMember(houseId, callerUid);
        Pageable pageable = buildPageable(filter);
        Specification<Task> spec = TaskSpecifications.withFilter(houseId, callerUid, filter);
        Page<TaskView> page = taskRepo.findAll(spec, pageable).map(TaskView::from);
        return PagedResponse.from(page);
    }

    @Transactional
    public TaskView create(UUID callerUid, CreateTaskInput input) {
        UUID houseId = resolveHouseId(callerUid, input.houseId());
        security.requireActiveMember(houseId, callerUid);
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
        User creator = userRepo.findById(callerUid)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));

        Task task = new Task();
        task.setHouse(house);
        task.setCreatedBy(creator);
        task.setTitle(input.title().trim());
        task.setDescription(trimToNull(input.description()));
        task.setDueDate(input.dueDate());
        task.setCategory(trimToNull(input.category()));
        task.setStatus("PENDING");

        boolean recurring = Boolean.TRUE.equals(input.recurring());
        applyRecurrence(task, recurring, input.recurrenceType(), input.recurrenceInterval(), input.recurrenceEndDate());

        if (input.assignedUsers() != null && !input.assignedUsers().isEmpty()) {
            task.setAssignedUsers(resolveActiveAssignees(houseId, input.assignedUsers()));
        }

        Task saved = taskRepo.save(task);
        notifyAssignees(saved.getAssignedUsers(), callerUid, houseId, saved.getTitle(), saved.getId());
        return TaskView.from(saved);
    }

    @Transactional
    public TaskView update(UUID callerUid, Long taskId, UpdateTaskInput input) {
        Task task = taskRepo.findByIdForUpdate(taskId)
                .orElseThrow(() -> BusinessException.notFound("TASK_NOT_FOUND", "Tarefa não encontrada."));
        UUID houseId = task.getHouse().getId();
        security.requireActiveMember(houseId, callerUid);

        if (input.title() != null) {
            if (input.title().isBlank()) {
                throw BusinessException.badRequest("INVALID_TITLE", "O título da tarefa não pode ser vazio.");
            }
            task.setTitle(input.title().trim());
        }
        if (input.description() != null) {
            task.setDescription(trimToNull(input.description()));
        }
        if (input.dueDate() != null) {
            task.setDueDate(input.dueDate());
        }
        if (input.category() != null) {
            task.setCategory(trimToNull(input.category()));
        }
        if (input.status() != null && !input.status().isBlank()) {
            String normalizedStatus = input.status().trim().toUpperCase();
            if (!ALLOWED_STATUSES.contains(normalizedStatus)) {
                throw BusinessException.badRequest("INVALID_STATUS", "Status de tarefa inválido.");
            }
            task.setStatus(normalizedStatus);
            if ("COMPLETED".equals(normalizedStatus) && task.getCompletedAt() == null) {
                task.setCompletedAt(OffsetDateTime.now());
            } else if (!"COMPLETED".equals(normalizedStatus)) {
                task.setCompletedAt(null);
            }
        }

        if (input.recurring() != null || input.recurrenceType() != null
                || input.recurrenceInterval() != null || input.recurrenceEndDate() != null) {
            boolean recurring = input.recurring() != null ? input.recurring() : task.isRecurring();
            String type = input.recurrenceType() != null ? input.recurrenceType() : task.getRecurrenceType();
            Integer interval = input.recurrenceInterval() != null ? input.recurrenceInterval() : task.getRecurrenceInterval();
            OffsetDateTime endDate = input.recurrenceEndDate() != null ? input.recurrenceEndDate() : task.getRecurrenceEndDate();
            applyRecurrence(task, recurring, type, interval, endDate);
        }

        if (input.assignedUsers() != null) {
            Set<UUID> previousUids = task.getAssignedUsers().stream().map(User::getUid).collect(Collectors.toSet());
            Set<User> nextAssignees = resolveActiveAssignees(houseId, input.assignedUsers());
            task.getAssignedUsers().clear();
            task.getAssignedUsers().addAll(nextAssignees);

            Set<User> newlyAdded = nextAssignees.stream()
                    .filter(u -> !previousUids.contains(u.getUid()))
                    .collect(Collectors.toSet());
            notifyAssignees(newlyAdded, callerUid, houseId, task.getTitle(), task.getId());
        }

        return TaskView.from(taskRepo.save(task));
    }

    @Transactional
    public TaskView complete(UUID callerUid, Long taskId) {
        Task task = taskRepo.findByIdForUpdate(taskId)
                .orElseThrow(() -> BusinessException.notFound("TASK_NOT_FOUND", "Tarefa não encontrada."));
        UUID houseId = task.getHouse().getId();
        security.requireActiveMember(houseId, callerUid);

        if ("CANCELLED".equals(task.getStatus())) {
            throw BusinessException.badRequest("TASK_CANCELLED", "Não é possível concluir uma tarefa cancelada.");
        }
        if ("COMPLETED".equals(task.getStatus())) {
            return TaskView.from(task);
        }

        OffsetDateTime now = OffsetDateTime.now();
        task.setStatus("COMPLETED");
        task.setCompletedAt(now);

        if (task.isRecurring() && task.getRecurrenceType() != null) {
            OffsetDateTime baseDue = task.getDueDate() != null ? task.getDueDate() : now;
            int interval = task.getRecurrenceInterval() != null ? task.getRecurrenceInterval() : 1;
            OffsetDateTime nextDue = advanceDueDate(baseDue, task.getRecurrenceType(), interval);

            if (task.getRecurrenceEndDate() == null || !nextDue.isAfter(task.getRecurrenceEndDate())) {
                Task next = new Task();
                next.setHouse(task.getHouse());
                next.setCreatedBy(task.getCreatedBy());
                next.setTitle(task.getTitle());
                next.setDescription(task.getDescription());
                next.setCategory(task.getCategory());
                next.setStatus("PENDING");
                next.setDueDate(nextDue);
                next.setRecurring(true);
                next.setRecurrenceType(task.getRecurrenceType());
                next.setRecurrenceInterval(interval);
                next.setRecurrenceEndDate(task.getRecurrenceEndDate());
                next.setParentTaskId(task.getId());
                next.setAssignedUsers(new LinkedHashSet<>(task.getAssignedUsers()));
                taskRepo.save(next);
            }
        }

        return TaskView.from(taskRepo.save(task));
    }

    @Transactional
    public TaskView cancel(UUID callerUid, Long taskId) {
        Task task = taskRepo.findByIdForUpdate(taskId)
                .orElseThrow(() -> BusinessException.notFound("TASK_NOT_FOUND", "Tarefa não encontrada."));
        security.requireActiveMember(task.getHouse().getId(), callerUid);
        if ("COMPLETED".equals(task.getStatus())) {
            throw BusinessException.badRequest("TASK_ALREADY_COMPLETED", "Não é possível cancelar uma tarefa já concluída.");
        }
        task.setStatus("CANCELLED");
        return TaskView.from(taskRepo.save(task));
    }

    @Transactional
    public void delete(UUID callerUid, Long taskId) {
        Task task = taskRepo.findByIdForUpdate(taskId)
                .orElseThrow(() -> BusinessException.notFound("TASK_NOT_FOUND", "Tarefa não encontrada."));
        security.requireActiveMember(task.getHouse().getId(), callerUid);
        taskRepo.delete(task);
    }

    @Transactional
    public TaskView assignUser(UUID callerUid, Long taskId, UUID targetUid) {
        Task task = taskRepo.findByIdForUpdate(taskId)
                .orElseThrow(() -> BusinessException.notFound("TASK_NOT_FOUND", "Tarefa não encontrada."));
        UUID houseId = task.getHouse().getId();
        security.requireActiveMember(houseId, callerUid);

        HouseMember member = memberRepo.findByHouseIdAndUserUidAndStatus(houseId, targetUid, "ACTIVE")
                .orElseThrow(() -> BusinessException.badRequest("INVALID_ASSIGNEE", "Usuário não é membro ativo desta república."));
        User targetUser = member.getUser();
        boolean added = task.getAssignedUsers().add(targetUser);
        Task saved = taskRepo.save(task);
        if (added) {
            notifyAssignees(Set.of(targetUser), callerUid, houseId, saved.getTitle(), saved.getId());
        }
        return TaskView.from(saved);
    }

    @Transactional
    public TaskView unassignUser(UUID callerUid, Long taskId, UUID targetUid) {
        Task task = taskRepo.findByIdForUpdate(taskId)
                .orElseThrow(() -> BusinessException.notFound("TASK_NOT_FOUND", "Tarefa não encontrada."));
        security.requireActiveMember(task.getHouse().getId(), callerUid);
        task.getAssignedUsers().removeIf(u -> u.getUid().equals(targetUid));
        return TaskView.from(taskRepo.save(task));
    }

    private UUID resolveHouseId(UUID callerUid, UUID providedHouseId) {
        if (providedHouseId != null) {
            return providedHouseId;
        }
        UUID current = findCurrentHouseId(callerUid);
        if (current == null) {
            throw BusinessException.badRequest("HOUSE_REQUIRED", "Usuário não pertence a nenhuma casa ativa.");
        }
        return current;
    }

    private UUID findCurrentHouseId(UUID callerUid) {
        return userRepo.findById(callerUid).map(User::getCurrentHouseId).orElse(null);
    }

    private Set<User> resolveActiveAssignees(UUID houseId, List<UUID> requestedUids) {
        if (requestedUids == null || requestedUids.isEmpty()) {
            return new LinkedHashSet<>();
        }
        Map<UUID, User> activeMembersByUid = memberRepo
                .findByHouseIdAndStatusOrderByJoinedAtAsc(houseId, "ACTIVE")
                .stream()
                .map(HouseMember::getUser)
                .collect(Collectors.toMap(User::getUid, Function.identity(), (a, b) -> a));

        Set<User> resolved = new LinkedHashSet<>();
        for (UUID uid : requestedUids) {
            User member = activeMembersByUid.get(uid);
            if (member == null) {
                throw BusinessException.badRequest(
                        "INVALID_ASSIGNEE",
                        "Todos os responsáveis devem ser moradores ativos da casa."
                );
            }
            resolved.add(member);
        }
        return resolved;
    }

    private void applyRecurrence(
            Task task,
            boolean recurring,
            String recurrenceType,
            Integer recurrenceInterval,
            OffsetDateTime recurrenceEndDate
    ) {
        if (!recurring) {
            task.setRecurring(false);
            task.setRecurrenceType(null);
            task.setRecurrenceInterval(null);
            task.setRecurrenceEndDate(null);
            return;
        }

        if (recurrenceType == null || recurrenceType.isBlank()) {
            throw BusinessException.badRequest("INVALID_RECURRENCE", "Informe o tipo de recorrência (DAILY, WEEKLY, MONTHLY ou YEARLY).");
        }
        String normalizedType = recurrenceType.trim().toUpperCase();
        if (!ALLOWED_RECURRENCE.contains(normalizedType)) {
            throw BusinessException.badRequest("INVALID_RECURRENCE", "Tipo de recorrência inválido.");
        }
        int interval = recurrenceInterval != null ? recurrenceInterval : 1;
        if (interval < 1) {
            throw BusinessException.badRequest("INVALID_RECURRENCE_INTERVAL", "O intervalo de recorrência deve ser maior que zero.");
        }
        task.setRecurring(true);
        task.setRecurrenceType(normalizedType);
        task.setRecurrenceInterval(interval);
        task.setRecurrenceEndDate(recurrenceEndDate);
    }

    private OffsetDateTime advanceDueDate(OffsetDateTime baseDue, String recurrenceType, int interval) {
        return switch (recurrenceType) {
            case "DAILY" -> baseDue.plusDays(interval);
            case "WEEKLY" -> baseDue.plusWeeks(interval);
            case "MONTHLY" -> baseDue.plusMonths(interval);
            case "YEARLY" -> baseDue.plusYears(interval);
            default -> throw BusinessException.badRequest("INVALID_RECURRENCE", "Tipo de recorrência inválido.");
        };
    }

    private Pageable buildPageable(TaskFilterInput filter) {
        int page = filter != null && filter.page() != null ? Math.max(filter.page(), 0) : 0;
        int size = filter != null && filter.size() != null ? Math.min(Math.max(filter.size(), 1), 100) : 20;
        String sortBy = filter != null && filter.sortBy() != null && ALLOWED_SORT_FIELDS.contains(filter.sortBy())
                ? filter.sortBy()
                : "dueDate";
        Sort.Direction direction = filter != null && "desc".equalsIgnoreCase(filter.sortDirection())
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;
        return PageRequest.of(page, size, Sort.by(direction, sortBy));
    }

    private void notifyAssignees(
            Set<User> assignees,
            UUID actorUid,
            UUID houseId,
            String taskTitle,
            Long taskId
    ) {
        List<UUID> targets = assignees.stream()
                .map(User::getUid)
                .filter(uid -> !uid.equals(actorUid))
                .toList();
        notificationService.notifyUsers(
                targets,
                houseId,
                "Nova tarefa atribuída",
                "Você foi atribuído à tarefa \"" + taskTitle + "\".",
                "TASK_ASSIGNED",
                "TASK",
                String.valueOf(taskId)
        );
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
