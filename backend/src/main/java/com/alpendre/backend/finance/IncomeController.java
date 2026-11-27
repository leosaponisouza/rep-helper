package com.alpendre.backend.finance;

import com.alpendre.backend.config.UserPrincipal;
import com.alpendre.backend.finance.FinanceDTOs.*;
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
@RequestMapping("/api/v1/incomes")
public class IncomeController {

    private final FinanceService financeService;

    public IncomeController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @GetMapping
    public ResponseEntity<List<IncomeView>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID houseId
    ) {
        return ResponseEntity.ok(financeService.listIncomes(principal.getUid(), houseId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<IncomeView> getById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(financeService.getIncome(principal.getUid(), id));
    }

    @PostMapping
    public ResponseEntity<IncomeView> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateIncomeInput request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(financeService.createIncome(principal.getUid(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<IncomeView> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody UpdateIncomeInput request
    ) {
        return ResponseEntity.ok(financeService.updateIncome(principal.getUid(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        financeService.deleteIncome(principal.getUid(), id);
        return ResponseEntity.ok(Map.of("message", "Receita excluída com sucesso."));
    }
}
