package com.rephelper.backend.task;

import com.rephelper.backend.common.PagedResponse;
import com.rephelper.backend.config.UserPrincipal;
import com.rephelper.backend.task.TaskDTOs.*;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskView> getById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(taskService.getById(principal.getUid(), id));
    }

    @GetMapping
    public ResponseEntity<List<TaskView>> listAll(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID republicId
    ) {
        return ResponseEntity.ok(taskService.listAll(principal.getUid(), republicId));
    }

    @PostMapping("/filter")
    public ResponseEntity<PagedResponse<TaskView>> filter(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID republicId,
            @RequestBody(required = false) TaskFilterInput filter
    ) {
        return ResponseEntity.ok(taskService.filterTasks(principal.getUid(), republicId, filter));
    }

    @GetMapping("/assigned")
    public ResponseEntity<List<TaskView>> listAssigned(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID republicId
    ) {
        return ResponseEntity.ok(taskService.listAssigned(principal.getUid(), republicId));
    }

    @PostMapping("/assigned/filter")
    public ResponseEntity<PagedResponse<TaskView>> filterAssigned(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) TaskFilterInput filter
    ) {
        return ResponseEntity.ok(taskService.filterAssignedTasks(principal.getUid(), filter));
    }

    @PostMapping
    public ResponseEntity<TaskView> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateTaskInput request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskService.create(principal.getUid(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskView> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody UpdateTaskInput request
    ) {
        return ResponseEntity.ok(taskService.update(principal.getUid(), id, request));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<TaskView> complete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(taskService.complete(principal.getUid(), id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<TaskView> cancel(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(taskService.cancel(principal.getUid(), id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        taskService.delete(principal.getUid(), id);
        return ResponseEntity.ok(Map.of("message", "Tarefa excluída com sucesso."));
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<TaskView> assign(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody AssignUserInput request
    ) {
        return ResponseEntity.ok(taskService.assignUser(principal.getUid(), id, request.userId()));
    }

    @PostMapping("/{id}/unassign")
    public ResponseEntity<TaskView> unassign(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody AssignUserInput request
    ) {
        return ResponseEntity.ok(taskService.unassignUser(principal.getUid(), id, request.userId()));
    }
}
