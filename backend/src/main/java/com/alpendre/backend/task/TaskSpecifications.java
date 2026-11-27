package com.alpendre.backend.task;

import com.alpendre.backend.task.TaskDTOs.TaskFilterInput;
import com.alpendre.backend.user.User;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.domain.Specification;

public final class TaskSpecifications {

    private TaskSpecifications() {}

    public static Specification<Task> withFilter(UUID houseId, UUID forcedAssigneeUid, TaskFilterInput filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("house").get("id"), houseId));

            if (forcedAssigneeUid != null) {
                Join<Task, User> assigneeJoin = root.join("assignedUsers", JoinType.INNER);
                predicates.add(cb.equal(assigneeJoin.get("uid"), forcedAssigneeUid));
                if (query != null) {
                    query.distinct(true);
                }
            }

            if (filter == null) {
                return cb.and(predicates.toArray(new Predicate[0]));
            }

            if (filter.status() != null && !filter.status().isBlank()) {
                predicates.add(cb.equal(root.get("status"), filter.status().trim().toUpperCase()));
            }
            if (filter.category() != null && !filter.category().isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("category")), filter.category().trim().toLowerCase()));
            }
            if (filter.isRecurring() != null) {
                predicates.add(cb.equal(root.get("recurring"), filter.isRecurring()));
            }
            if (Boolean.TRUE.equals(filter.isOverdue())) {
                OffsetDateTime now = OffsetDateTime.now();
                Predicate pastDue = cb.and(
                        cb.lessThan(root.get("dueDate"), now),
                        cb.not(root.get("status").in("COMPLETED", "CANCELLED"))
                );
                predicates.add(cb.or(cb.equal(root.get("status"), "OVERDUE"), pastDue));
            } else if (Boolean.FALSE.equals(filter.isOverdue())) {
                OffsetDateTime now = OffsetDateTime.now();
                predicates.add(cb.or(
                        root.get("dueDate").isNull(),
                        cb.greaterThanOrEqualTo(root.get("dueDate"), now),
                        root.get("status").in("COMPLETED", "CANCELLED")
                ));
            }

            if (filter.dueDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dueDate"), filter.dueDateFrom()));
            }
            if (filter.dueDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dueDate"), filter.dueDateTo()));
            }
            if (filter.createdAtFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), filter.createdAtFrom()));
            }
            if (filter.createdAtTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), filter.createdAtTo()));
            }

            if (forcedAssigneeUid == null && filter.assignedUserId() != null) {
                Join<Task, User> assigneeJoin = root.join("assignedUsers", JoinType.INNER);
                predicates.add(cb.equal(assigneeJoin.get("uid"), filter.assignedUserId()));
                if (query != null) {
                    query.distinct(true);
                }
            }
            if (Boolean.TRUE.equals(filter.unassigned())) {
                predicates.add(cb.isEmpty(root.get("assignedUsers")));
            } else if (Boolean.FALSE.equals(filter.unassigned())) {
                predicates.add(cb.isNotEmpty(root.get("assignedUsers")));
            }
            if (filter.createdBy() != null) {
                predicates.add(cb.equal(root.get("createdBy").get("uid"), filter.createdBy()));
            }

            if (filter.searchTerm() != null && !filter.searchTerm().isBlank()) {
                String pattern = "%" + filter.searchTerm().trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
