package com.rephelper.backend.task;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.rephelper.backend.user.User;
import com.rephelper.backend.user.UserDTO;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class TaskDTOs {

    private TaskDTOs() {}

    public record TaskView(
            Long id,
            String republicId,
            String title,
            String description,
            OffsetDateTime dueDate,
            String category,
            String status,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            List<UserDTO> assignedUsers,
            @JsonProperty("assigned_users") List<String> assignedUserIds,
            OffsetDateTime completedAt,
            UserDTO createdBy,
            boolean recurring,
            @JsonProperty("isRecurring") boolean isRecurring,
            String recurrenceType,
            Integer recurrenceInterval,
            OffsetDateTime recurrenceEndDate,
            Long parentTaskId
    ) {
        public static TaskView from(Task entity) {
            List<User> assignees = entity.getAssignedUsers().stream().toList();
            List<UserDTO> assigneeDtos = assignees.stream()
                    .map(u -> UserDTO.from(u, false))
                    .toList();
            List<String> assigneeIds = assignees.stream()
                    .map(u -> u.getUid().toString())
                    .toList();
            UserDTO creatorDto = entity.getCreatedBy() != null
                    ? UserDTO.from(entity.getCreatedBy(), false)
                    : null;

            return new TaskView(
                    entity.getId(),
                    entity.getRepublic().getId().toString(),
                    entity.getTitle(),
                    entity.getDescription(),
                    entity.getDueDate(),
                    entity.getCategory(),
                    entity.getStatus(),
                    entity.getCreatedAt(),
                    entity.getUpdatedAt(),
                    assigneeDtos,
                    assigneeIds,
                    entity.getCompletedAt(),
                    creatorDto,
                    entity.isRecurring(),
                    entity.isRecurring(),
                    entity.getRecurrenceType(),
                    entity.getRecurrenceInterval(),
                    entity.getRecurrenceEndDate(),
                    entity.getParentTaskId()
            );
        }
    }

    public record CreateTaskInput(
            @JsonAlias("republic_id") UUID republicId,
            @NotBlank @Size(max = 200) String title,
            String description,
            OffsetDateTime dueDate,
            @Size(max = 80) String category,
            @JsonAlias("assigned_users") List<UUID> assignedUsers,
            @JsonAlias("isRecurring") Boolean recurring,
            String recurrenceType,
            @Min(1) Integer recurrenceInterval,
            OffsetDateTime recurrenceEndDate
    ) {}

    public record UpdateTaskInput(
            @Size(max = 200) String title,
            String description,
            OffsetDateTime dueDate,
            @Size(max = 80) String category,
            String status,
            @JsonAlias("assigned_users") List<UUID> assignedUsers,
            @JsonAlias("isRecurring") Boolean recurring,
            String recurrenceType,
            @Min(1) Integer recurrenceInterval,
            OffsetDateTime recurrenceEndDate
    ) {}

    public record AssignUserInput(
            @NotNull @JsonAlias({"user_id", "uid"}) UUID userId
    ) {}

    public record TaskFilterInput(
            String status,
            String category,
            @JsonAlias("recurring") Boolean isRecurring,
            Boolean isOverdue,
            OffsetDateTime dueDateFrom,
            OffsetDateTime dueDateTo,
            OffsetDateTime createdAtFrom,
            OffsetDateTime createdAtTo,
            UUID assignedUserId,
            Boolean unassigned,
            UUID createdBy,
            String searchTerm,
            Integer page,
            Integer size,
            String sortBy,
            String sortDirection
    ) {}
}
