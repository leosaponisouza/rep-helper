package com.alpendre.backend.finance;

import com.alpendre.backend.config.UserPrincipal;
import com.alpendre.backend.finance.FinanceDTOs.AdjustBalanceInput;
import com.alpendre.backend.finance.FinanceDTOs.FinancialDashboardSummaryView;
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
public class HouseFinanceController {

    private final FinanceService financeService;

    public HouseFinanceController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @PostMapping("/{houseId}/adjust-balance")
    public ResponseEntity<FinancialDashboardSummaryView> adjustBalance(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID houseId,
            @Valid @RequestBody AdjustBalanceInput request
    ) {
        return ResponseEntity.ok(financeService.adjustBalance(principal.getUid(), houseId, request));
    }
}
