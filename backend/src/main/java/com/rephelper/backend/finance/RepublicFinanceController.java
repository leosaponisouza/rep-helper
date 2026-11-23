package com.rephelper.backend.finance;

import com.rephelper.backend.config.UserPrincipal;
import com.rephelper.backend.finance.FinanceDTOs.AdjustBalanceInput;
import com.rephelper.backend.finance.FinanceDTOs.FinancialDashboardSummaryView;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/finances")
public class RepublicFinanceController {

    private final FinanceService financeService;

    public RepublicFinanceController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @PostMapping("/{republicId}/adjust-balance")
    public ResponseEntity<FinancialDashboardSummaryView> adjustBalance(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID republicId,
            @Valid @RequestBody AdjustBalanceInput request
    ) {
        return ResponseEntity.ok(financeService.adjustBalance(principal.getUid(), republicId, request));
    }
}
