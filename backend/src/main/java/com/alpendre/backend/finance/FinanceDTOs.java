package com.alpendre.backend.finance;

import com.alpendre.backend.user.User;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class FinanceDTOs {

    private FinanceDTOs() {}

    public record ExpenseView(
            Long id,
            String description,
            BigDecimal amount,
            OffsetDateTime date,
            OffsetDateTime expenseDate,
            String category,
            String status,
            String houseId,
            String houseName,
            String creatorId,
            String creatorName,
            String creatorNickname,
            String creatorProfilePictureUrl,
            String receiptUrl,
            String notes,
            OffsetDateTime approvalDate,
            OffsetDateTime reimbursementDate,
            String rejectionReason,
            String approverId,
            String approverName,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String type
    ) {
        public static ExpenseView from(Expense e) {
            User creator = e.getCreator();
            User approver = e.getApprover();
            return new ExpenseView(
                    e.getId(),
                    e.getDescription(),
                    e.getAmount(),
                    e.getExpenseDate(),
                    e.getExpenseDate(),
                    e.getCategory(),
                    e.getStatus(),
                    e.getHouse().getId().toString(),
                    e.getHouse().getName(),
                    creator.getUid().toString(),
                    creator.getName(),
                    creator.getNickname(),
                    creator.getProfilePictureUrl(),
                    e.getReceiptUrl(),
                    e.getNotes(),
                    e.getApprovalDate(),
                    e.getReimbursementDate(),
                    e.getRejectionReason(),
                    approver != null ? approver.getUid().toString() : null,
                    approver != null ? approver.getName() : null,
                    e.getCreatedAt(),
                    e.getUpdatedAt(),
                    "EXPENSE"
            );
        }
    }

    public record IncomeView(
            Long id,
            String description,
            BigDecimal amount,
            OffsetDateTime date,
            OffsetDateTime incomeDate,
            String source,
            String houseId,
            String houseName,
            String creatorId,
            String creatorName,
            String creatorNickname,
            String creatorProfilePictureUrl,
            String contributorId,
            String contributorName,
            String contributorProfilePictureUrl,
            String receiptUrl,
            String notes,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            String type
    ) {
        public static IncomeView from(Income i) {
            User creator = i.getCreator();
            User contributor = i.getContributor();
            return new IncomeView(
                    i.getId(),
                    i.getDescription(),
                    i.getAmount(),
                    i.getIncomeDate(),
                    i.getIncomeDate(),
                    i.getSource(),
                    i.getHouse().getId().toString(),
                    i.getHouse().getName(),
                    creator.getUid().toString(),
                    creator.getName(),
                    creator.getNickname(),
                    creator.getProfilePictureUrl(),
                    contributor != null ? contributor.getUid().toString() : null,
                    contributor != null ? contributor.getName() : null,
                    contributor != null ? contributor.getProfilePictureUrl() : null,
                    i.getReceiptUrl(),
                    i.getNotes(),
                    i.getCreatedAt(),
                    i.getUpdatedAt(),
                    "INCOME"
            );
        }
    }

    public record FinancialDashboardSummaryView(
            BigDecimal currentBalance,
            BigDecimal totalExpenses,
            BigDecimal totalIncomes,
            BigDecimal pendingExpensesAmount,
            BigDecimal approvedExpensesAmount,
            BigDecimal rejectedExpenses,
            BigDecimal reimbursedExpenses,
            BigDecimal totalExpensesCurrentMonth,
            BigDecimal totalIncomesCurrentMonth,
            boolean hasSharedFund,
            boolean requireExpenseApproval
    ) {}

    public record MonthlyPointView(String month, BigDecimal expenses, BigDecimal incomes) {}

    public record MonthlyChartView(List<MonthlyPointView> monthlyData) {}

    public record PendingActionView(
            Long id,
            String description,
            BigDecimal amount,
            OffsetDateTime expenseDate,
            String status,
            String creatorId,
            String creatorName,
            String creatorNickname,
            String creatorProfilePictureUrl,
            String category,
            OffsetDateTime approvalDate,
            String receiptUrl,
            OffsetDateTime reimbursementDate,
            String rejectionReason,
            String houseId,
            String houseName,
            OffsetDateTime createdAt
    ) {
        public static PendingActionView from(Expense e) {
            User creator = e.getCreator();
            return new PendingActionView(
                    e.getId(),
                    e.getDescription(),
                    e.getAmount(),
                    e.getExpenseDate(),
                    e.getStatus(),
                    creator.getUid().toString(),
                    creator.getName(),
                    creator.getNickname(),
                    creator.getProfilePictureUrl(),
                    e.getCategory(),
                    e.getApprovalDate(),
                    e.getReceiptUrl(),
                    e.getReimbursementDate(),
                    e.getRejectionReason(),
                    e.getHouse().getId().toString(),
                    e.getHouse().getName(),
                    e.getCreatedAt()
            );
        }
    }

    public record PendingActionsView(
            List<PendingActionView> pendingExpenses,
            int pendingExpensesCount,
            BigDecimal pendingExpensesTotal
    ) {}

    public record CreateExpenseInput(
            @NotBlank @Size(max = 255) String description,
            @NotNull @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal amount,
            @NotNull OffsetDateTime expenseDate,
            @NotBlank @Size(max = 80) String category,
            @Size(max = 500) String receiptUrl,
            @NotNull UUID houseId,
            String notes
    ) {}

    public record UpdateExpenseInput(
            @Size(max = 255) String description,
            @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal amount,
            OffsetDateTime expenseDate,
            @Size(max = 80) String category,
            @Size(max = 500) String receiptUrl,
            String notes
    ) {}

    public record RejectExpenseInput(
            @NotBlank @Size(max = 500) String reason
    ) {}

    public record CreateIncomeInput(
            @NotBlank @Size(max = 255) String description,
            @NotNull @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal amount,
            @NotNull OffsetDateTime incomeDate,
            @NotBlank @Size(max = 100) String source,
            @NotNull UUID houseId,
            UUID contributorId,
            @Size(max = 500) String receiptUrl,
            String notes
    ) {}

    public record UpdateIncomeInput(
            @Size(max = 255) String description,
            @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal amount,
            OffsetDateTime incomeDate,
            @Size(max = 100) String source,
            @Size(max = 500) String receiptUrl,
            String notes
    ) {}

    public record AdjustBalanceInput(
            @NotNull @Digits(integer = 12, fraction = 2) BigDecimal amount,
            @Size(max = 300) String description
    ) {}
}
