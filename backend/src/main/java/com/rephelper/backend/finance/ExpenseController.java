package com.rephelper.backend.finance;

import com.rephelper.backend.config.UserPrincipal;
import com.rephelper.backend.finance.FinanceDTOs.*;
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
@RequestMapping("/api/v1/expenses")
public class ExpenseController {

    private final FinanceService financeService;

    public ExpenseController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @GetMapping
    public ResponseEntity<List<ExpenseView>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID republicId
    ) {
        return ResponseEntity.ok(financeService.listExpenses(principal.getUid(), republicId));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<ExpenseView>> listByStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String status,
            @RequestParam(required = false) UUID republicId
    ) {
        return ResponseEntity.ok(financeService.listExpensesByStatus(principal.getUid(), status, republicId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExpenseView> getById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(financeService.getExpense(principal.getUid(), id));
    }

    @PostMapping
    public ResponseEntity<ExpenseView> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateExpenseInput request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(financeService.createExpense(principal.getUid(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExpenseView> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody UpdateExpenseInput request
    ) {
        return ResponseEntity.ok(financeService.updateExpense(principal.getUid(), id, request));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ExpenseView> approve(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(financeService.approveExpense(principal.getUid(), id));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ExpenseView> reject(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody RejectExpenseInput request
    ) {
        return ResponseEntity.ok(financeService.rejectExpense(principal.getUid(), id, request));
    }

    @PostMapping("/{id}/reimburse")
    public ResponseEntity<ExpenseView> reimburse(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(financeService.reimburseExpense(principal.getUid(), id));
    }

    @PostMapping("/{id}/reset")
    public ResponseEntity<ExpenseView> reset(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(financeService.resetExpenseStatus(principal.getUid(), id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        financeService.deleteExpense(principal.getUid(), id);
        return ResponseEntity.ok(Map.of("message", "Despesa excluída com sucesso."));
    }
}
