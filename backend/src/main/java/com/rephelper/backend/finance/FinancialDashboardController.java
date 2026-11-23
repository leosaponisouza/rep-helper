package com.rephelper.backend.finance;

import com.rephelper.backend.config.UserPrincipal;
import com.rephelper.backend.finance.FinanceDTOs.*;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/financial-dashboard")
public class FinancialDashboardController {

    private final FinanceService financeService;

    public FinancialDashboardController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @GetMapping("/summary/{republicId}")
    public ResponseEntity<FinancialDashboardSummaryView> getSummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID republicId
    ) {
        return ResponseEntity.ok(financeService.getDashboardSummary(principal.getUid(), republicId));
    }

    @GetMapping("/expenses/monthly/{republicId}")
    public ResponseEntity<MonthlyChartView> getMonthlyExpenses(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID republicId,
            @RequestParam(defaultValue = "6") int numberOfMonths
    ) {
        return ResponseEntity.ok(financeService.getMonthlyChart(principal.getUid(), republicId, numberOfMonths));
    }

    @GetMapping("/pending-actions/{republicId}")
    public ResponseEntity<PendingActionsView> getPendingActions(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID republicId
    ) {
        return ResponseEntity.ok(financeService.getPendingActions(principal.getUid(), republicId));
    }
}
