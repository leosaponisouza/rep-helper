package com.alpendre.backend.finance;

import com.alpendre.backend.common.BusinessException;
import com.alpendre.backend.finance.FinanceDTOs.*;
import com.alpendre.backend.house.House;
import com.alpendre.backend.house.HouseMember;
import com.alpendre.backend.house.HouseRepository;
import com.alpendre.backend.house.HouseSecurityService;
import com.alpendre.backend.media.MediaStorageService;
import com.alpendre.backend.notification.NotificationService;
import com.alpendre.backend.user.User;
import com.alpendre.backend.user.UserRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FinanceService {

    private static final Set<String> ALLOWED_EXPENSE_STATUSES = Set.of(
            "PENDING", "APPROVED", "REJECTED", "REIMBURSED"
    );

    private final ExpenseRepository expenseRepo;
    private final IncomeRepository incomeRepo;
    private final HouseRepository houseRepo;
    private final HouseSecurityService security;
    private final HouseBalanceLedger balanceLedger;
    private final UserRepository userRepo;
    private final MediaStorageService mediaService;
    private final NotificationService notificationService;

    public FinanceService(
            ExpenseRepository expenseRepo,
            IncomeRepository incomeRepo,
            HouseRepository houseRepo,
            HouseSecurityService security,
            HouseBalanceLedger balanceLedger,
            UserRepository userRepo,
            MediaStorageService mediaService,
            NotificationService notificationService
    ) {
        this.expenseRepo = expenseRepo;
        this.incomeRepo = incomeRepo;
        this.houseRepo = houseRepo;
        this.security = security;
        this.balanceLedger = balanceLedger;
        this.userRepo = userRepo;
        this.mediaService = mediaService;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<ExpenseView> listExpenses(UUID callerUid, UUID requestedHouseId) {
        UUID houseId = resolveHouseId(callerUid, requestedHouseId);
        security.requireActiveMember(houseId, callerUid);
        return expenseRepo.findByHouseIdOrderByExpenseDateDescCreatedAtDesc(houseId)
                .stream()
                .map(ExpenseView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ExpenseView> listExpensesByStatus(UUID callerUid, String status, UUID requestedHouseId) {
        String normalizedStatus = status != null ? status.trim().toUpperCase() : "";
        if (!ALLOWED_EXPENSE_STATUSES.contains(normalizedStatus)) {
            throw BusinessException.badRequest("INVALID_STATUS", "Status de despesa inválido.");
        }
        UUID houseId = resolveHouseId(callerUid, requestedHouseId);
        security.requireActiveMember(houseId, callerUid);
        return expenseRepo.findByHouseIdAndStatusOrderByExpenseDateDescCreatedAtDesc(houseId, normalizedStatus)
                .stream()
                .map(ExpenseView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ExpenseView getExpense(UUID callerUid, Long expenseId) {
        Expense expense = expenseRepo.findWithDetailsById(expenseId)
                .orElseThrow(() -> BusinessException.notFound("EXPENSE_NOT_FOUND", "Despesa não encontrada."));
        security.requireActiveMember(expense.getHouse().getId(), callerUid);
        return ExpenseView.from(expense);
    }

    @Transactional
    public ExpenseView createExpense(UUID callerUid, CreateExpenseInput input) {
        UUID houseId = input.houseId();
        security.requireActiveMember(houseId, callerUid);
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
        User creator = userRepo.findById(callerUid)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));

        Expense expense = new Expense();
        expense.setHouse(house);
        expense.setCreator(creator);
        expense.setDescription(input.description().trim());
        expense.setAmount(input.amount());
        expense.setExpenseDate(input.expenseDate());
        expense.setCategory(input.category().trim());
        expense.setReceiptUrl(trimToNull(input.receiptUrl()));
        expense.setNotes(trimToNull(input.notes()));
        expense.setSharedFund(house.isHasSharedFund());

        OffsetDateTime now = OffsetDateTime.now();
        if (house.isRequireExpenseApproval()) {
            expense.setStatus("PENDING");
        } else if (house.isHasSharedFund()) {
            expense.setStatus("REIMBURSED");
            expense.setApprover(creator);
            expense.setApprovalDate(now);
            expense.setReimbursementDate(now);
        } else {
            expense.setStatus("APPROVED");
            expense.setApprover(creator);
            expense.setApprovalDate(now);
        }

        Expense saved = expenseRepo.save(expense);
        if ("REIMBURSED".equals(saved.getStatus()) && house.isHasSharedFund()) {
            balanceLedger.applyDelta(houseId, saved.getAmount().negate());
        }
        return ExpenseView.from(saved);
    }

    @Transactional
    public ExpenseView updateExpense(UUID callerUid, Long expenseId, UpdateExpenseInput input) {
        Expense expense = expenseRepo.findByIdForUpdate(expenseId)
                .orElseThrow(() -> BusinessException.notFound("EXPENSE_NOT_FOUND", "Despesa não encontrada."));
        UUID houseId = expense.getHouse().getId();
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
        HouseMember caller = security.requireActiveMember(houseId, callerUid);
        requireCreatorOrAdmin(expense.getCreator().getUid(), callerUid, caller);

        boolean canEditCurrentStatus = "PENDING".equals(expense.getStatus())
                || (!house.isRequireExpenseApproval() && !"REJECTED".equals(expense.getStatus()));
        if (!canEditCurrentStatus) {
            throw BusinessException.badRequest("EXPENSE_NOT_EDITABLE", "Esta despesa não pode ser editada no status atual.");
        }

        if (input.description() != null && !input.description().isBlank()) {
            expense.setDescription(input.description().trim());
        }
        if (input.amount() != null) {
            BigDecimal previousAmount = expense.getAmount();
            if ("REIMBURSED".equals(expense.getStatus()) && house.isHasSharedFund() && expense.isSharedFund()) {
                BigDecimal ledgerDelta = previousAmount.subtract(input.amount());
                if (ledgerDelta.compareTo(BigDecimal.ZERO) != 0) {
                    balanceLedger.applyDelta(houseId, ledgerDelta);
                }
            }
            expense.setAmount(input.amount());
        }
        if (input.expenseDate() != null) {
            expense.setExpenseDate(input.expenseDate());
        }
        if (input.category() != null && !input.category().isBlank()) {
            expense.setCategory(input.category().trim());
        }
        if (input.notes() != null) {
            expense.setNotes(trimToNull(input.notes()));
        }
        if (input.receiptUrl() != null) {
            String previousReceipt = expense.getReceiptUrl();
            String nextReceipt = trimToNull(input.receiptUrl());
            if (!Objects.equals(previousReceipt, nextReceipt)) {
                expense.setReceiptUrl(nextReceipt);
                if (previousReceipt != null) {
                    mediaService.deleteSupersededUrl(previousReceipt, expense.getCreator().getUid());
                }
            }
        }

        return ExpenseView.from(expenseRepo.save(expense));
    }

    @Transactional
    public ExpenseView approveExpense(UUID callerUid, Long expenseId) {
        Expense expense = expenseRepo.findByIdForUpdate(expenseId)
                .orElseThrow(() -> BusinessException.notFound("EXPENSE_NOT_FOUND", "Despesa não encontrada."));
        UUID houseId = expense.getHouse().getId();
        security.requireAdmin(houseId, callerUid);

        if (!"PENDING".equals(expense.getStatus())) {
            throw BusinessException.badRequest("INVALID_EXPENSE_STATUS", "Apenas despesas pendentes podem ser aprovadas.");
        }

        User approver = userRepo.findById(callerUid)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));
        expense.setStatus("APPROVED");
        expense.setApprover(approver);
        expense.setApprovalDate(OffsetDateTime.now());
        expense.setRejectionReason(null);

        Expense saved = expenseRepo.save(expense);
        notifyCreator(saved, callerUid, "Despesa aprovada", "Sua despesa \"" + saved.getDescription() + "\" foi aprovada.", "EXPENSE_APPROVED");
        return ExpenseView.from(saved);
    }

    @Transactional
    public ExpenseView rejectExpense(UUID callerUid, Long expenseId, RejectExpenseInput input) {
        Expense expense = expenseRepo.findByIdForUpdate(expenseId)
                .orElseThrow(() -> BusinessException.notFound("EXPENSE_NOT_FOUND", "Despesa não encontrada."));
        UUID houseId = expense.getHouse().getId();
        security.requireAdmin(houseId, callerUid);
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));

        if (!house.isRequireExpenseApproval() && !"PENDING".equals(expense.getStatus())) {
            throw BusinessException.badRequest("APPROVAL_NOT_ENABLED", "Esta casa não exige aprovação de despesas.");
        }

        if (!"PENDING".equals(expense.getStatus()) && !"APPROVED".equals(expense.getStatus())) {
            throw BusinessException.badRequest("INVALID_EXPENSE_STATUS", "Não é possível rejeitar esta despesa no status atual.");
        }

        User approver = userRepo.findById(callerUid)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));
        expense.setStatus("REJECTED");
        expense.setApprover(approver);
        expense.setRejectionReason(input.reason().trim());

        Expense saved = expenseRepo.save(expense);
        notifyCreator(saved, callerUid, "Despesa rejeitada", "Sua despesa \"" + saved.getDescription() + "\" foi rejeitada: " + saved.getRejectionReason(), "EXPENSE_REJECTED");
        return ExpenseView.from(saved);
    }

    @Transactional
    public ExpenseView reimburseExpense(UUID callerUid, Long expenseId) {
        Expense expense = expenseRepo.findByIdForUpdate(expenseId)
                .orElseThrow(() -> BusinessException.notFound("EXPENSE_NOT_FOUND", "Despesa não encontrada."));
        UUID houseId = expense.getHouse().getId();
        security.requireAdmin(houseId, callerUid);
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
        requireSharedFundEnabled(house);

        if (!expense.isSharedFund()) {
            throw BusinessException.badRequest(
                    "EXPENSE_NOT_IN_SHARED_FUND",
                    "Esta despesa foi registrada fora do modo caixinha e não é reembolsável."
            );
        }

        if (!"APPROVED".equals(expense.getStatus())) {
            throw BusinessException.badRequest("INVALID_EXPENSE_STATUS", "A despesa precisa ser aprovada antes de ser reembolsada.");
        }

        expense.setStatus("REIMBURSED");
        expense.setReimbursementDate(OffsetDateTime.now());
        balanceLedger.applyDelta(houseId, expense.getAmount().negate());

        Expense saved = expenseRepo.save(expense);
        notifyCreator(saved, callerUid, "Despesa reembolsada", "Sua despesa \"" + saved.getDescription() + "\" foi marcada como reembolsada.", "EXPENSE_REIMBURSED");
        return ExpenseView.from(saved);
    }

    @Transactional
    public ExpenseView resetExpenseStatus(UUID callerUid, Long expenseId) {
        Expense expense = expenseRepo.findByIdForUpdate(expenseId)
                .orElseThrow(() -> BusinessException.notFound("EXPENSE_NOT_FOUND", "Despesa não encontrada."));
        UUID houseId = expense.getHouse().getId();
        security.requireAdmin(houseId, callerUid);
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));

        if (!house.isRequireExpenseApproval()) {
            throw BusinessException.badRequest("APPROVAL_NOT_ENABLED", "Esta casa não exige aprovação de despesas.");
        }

        if ("REIMBURSED".equals(expense.getStatus()) && house.isHasSharedFund() && expense.isSharedFund()) {
            balanceLedger.applyDelta(houseId, expense.getAmount());
        }

        expense.setStatus("PENDING");
        expense.setApprover(null);
        expense.setApprovalDate(null);
        expense.setReimbursementDate(null);
        expense.setRejectionReason(null);
        return ExpenseView.from(expenseRepo.save(expense));
    }

    @Transactional
    public void deleteExpense(UUID callerUid, Long expenseId) {
        Expense expense = expenseRepo.findByIdForUpdate(expenseId)
                .orElseThrow(() -> BusinessException.notFound("EXPENSE_NOT_FOUND", "Despesa não encontrada."));
        UUID houseId = expense.getHouse().getId();
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));

        if ("REIMBURSED".equals(expense.getStatus())) {
            if (house.isRequireExpenseApproval()) {
                security.requireAdmin(houseId, callerUid);
            } else {
                HouseMember caller = security.requireActiveMember(houseId, callerUid);
                requireCreatorOrAdmin(expense.getCreator().getUid(), callerUid, caller);
            }
            if (house.isHasSharedFund() && expense.isSharedFund()) {
                balanceLedger.applyDelta(houseId, expense.getAmount());
            }
        } else {
            HouseMember caller = security.requireActiveMember(houseId, callerUid);
            requireCreatorOrAdmin(expense.getCreator().getUid(), callerUid, caller);
        }

        String receiptUrl = expense.getReceiptUrl();
        UUID ownerUid = expense.getCreator().getUid();
        expenseRepo.delete(expense);
        if (receiptUrl != null) {
            mediaService.deleteSupersededUrl(receiptUrl, ownerUid);
        }
    }

    @Transactional(readOnly = true)
    public List<IncomeView> listIncomes(UUID callerUid, UUID requestedHouseId) {
        UUID houseId = resolveHouseId(callerUid, requestedHouseId);
        security.requireActiveMember(houseId, callerUid);
        return incomeRepo.findByHouseIdOrderByIncomeDateDescCreatedAtDesc(houseId)
                .stream()
                .map(IncomeView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public IncomeView getIncome(UUID callerUid, Long incomeId) {
        Income income = incomeRepo.findWithDetailsById(incomeId)
                .orElseThrow(() -> BusinessException.notFound("INCOME_NOT_FOUND", "Receita não encontrada."));
        security.requireActiveMember(income.getHouse().getId(), callerUid);
        return IncomeView.from(income);
    }

    @Transactional
    public IncomeView createIncome(UUID callerUid, CreateIncomeInput input) {
        UUID houseId = input.houseId();
        security.requireActiveMember(houseId, callerUid);
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
        requireSharedFundEnabled(house);
        User creator = userRepo.findById(callerUid)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));

        User contributor = creator;
        if (input.contributorId() != null) {
            HouseMember contributorMember = security.requireActiveMember(houseId, input.contributorId());
            contributor = contributorMember.getUser();
        }

        Income income = new Income();
        income.setHouse(house);
        income.setCreator(creator);
        income.setContributor(contributor);
        income.setDescription(input.description().trim());
        income.setAmount(input.amount());
        income.setIncomeDate(input.incomeDate());
        income.setSource(input.source().trim());
        income.setReceiptUrl(trimToNull(input.receiptUrl()));
        income.setNotes(trimToNull(input.notes()));

        Income saved = incomeRepo.save(income);
        balanceLedger.applyDelta(houseId, saved.getAmount());
        return IncomeView.from(saved);
    }

    @Transactional
    public IncomeView updateIncome(UUID callerUid, Long incomeId, UpdateIncomeInput input) {
        Income income = incomeRepo.findByIdForUpdate(incomeId)
                .orElseThrow(() -> BusinessException.notFound("INCOME_NOT_FOUND", "Receita não encontrada."));
        UUID houseId = income.getHouse().getId();
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
        requireSharedFundEnabled(house);
        HouseMember caller = security.requireActiveMember(houseId, callerUid);
        requireCreatorOrAdmin(income.getCreator().getUid(), callerUid, caller);

        BigDecimal previousAmount = income.getAmount();
        if (input.description() != null && !input.description().isBlank()) {
            income.setDescription(input.description().trim());
        }
        if (input.amount() != null) {
            BigDecimal delta = input.amount().subtract(previousAmount);
            if (delta.compareTo(BigDecimal.ZERO) != 0) {
                balanceLedger.applyDelta(houseId, delta);
            }
            income.setAmount(input.amount());
        }
        if (input.incomeDate() != null) {
            income.setIncomeDate(input.incomeDate());
        }
        if (input.source() != null && !input.source().isBlank()) {
            income.setSource(input.source().trim());
        }
        if (input.notes() != null) {
            income.setNotes(trimToNull(input.notes()));
        }
        if (input.receiptUrl() != null) {
            String previousReceipt = income.getReceiptUrl();
            String nextReceipt = trimToNull(input.receiptUrl());
            if (!Objects.equals(previousReceipt, nextReceipt)) {
                income.setReceiptUrl(nextReceipt);
                if (previousReceipt != null) {
                    mediaService.deleteSupersededUrl(previousReceipt, income.getCreator().getUid());
                }
            }
        }

        return IncomeView.from(incomeRepo.save(income));
    }

    @Transactional
    public void deleteIncome(UUID callerUid, Long incomeId) {
        Income income = incomeRepo.findByIdForUpdate(incomeId)
                .orElseThrow(() -> BusinessException.notFound("INCOME_NOT_FOUND", "Receita não encontrada."));
        UUID houseId = income.getHouse().getId();
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
        requireSharedFundEnabled(house);
        HouseMember caller = security.requireActiveMember(houseId, callerUid);
        requireCreatorOrAdmin(income.getCreator().getUid(), callerUid, caller);

        balanceLedger.applyDelta(houseId, income.getAmount().negate());
        String receiptUrl = income.getReceiptUrl();
        UUID ownerUid = income.getCreator().getUid();
        incomeRepo.delete(income);
        if (receiptUrl != null) {
            mediaService.deleteSupersededUrl(receiptUrl, ownerUid);
        }
    }

    @Transactional(readOnly = true)
    public FinancialDashboardSummaryView getDashboardSummary(UUID callerUid, UUID houseId) {
        security.requireActiveMember(houseId, callerUid);
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));

        List<Expense> expenses = expenseRepo.findByHouseIdOrderByExpenseDateDescCreatedAtDesc(houseId);
        List<Income> incomes = incomeRepo.findByHouseIdOrderByIncomeDateDescCreatedAtDesc(houseId);

        YearMonth currentMonth = YearMonth.now(ZoneOffset.UTC);
        BigDecimal totalExpenses = BigDecimal.ZERO;
        BigDecimal pendingAmount = BigDecimal.ZERO;
        BigDecimal approvedAmount = BigDecimal.ZERO;
        BigDecimal rejectedAmount = BigDecimal.ZERO;
        BigDecimal reimbursedAmount = BigDecimal.ZERO;
        BigDecimal currentMonthExpenses = BigDecimal.ZERO;

        for (Expense e : expenses) {
            BigDecimal amt = e.getAmount();
            switch (e.getStatus()) {
                case "PENDING" -> pendingAmount = pendingAmount.add(amt);
                case "APPROVED" -> approvedAmount = approvedAmount.add(amt);
                case "REJECTED" -> rejectedAmount = rejectedAmount.add(amt);
                case "REIMBURSED" -> reimbursedAmount = reimbursedAmount.add(amt);
                default -> { }
            }
            if (!"REJECTED".equals(e.getStatus())) {
                totalExpenses = totalExpenses.add(amt);
                if (toUtcMonth(e.getExpenseDate()).equals(currentMonth)) {
                    currentMonthExpenses = currentMonthExpenses.add(amt);
                }
            }
        }

        BigDecimal totalIncomes = BigDecimal.ZERO;
        BigDecimal currentMonthIncomes = BigDecimal.ZERO;
        for (Income i : incomes) {
            totalIncomes = totalIncomes.add(i.getAmount());
            if (toUtcMonth(i.getIncomeDate()).equals(currentMonth)) {
                currentMonthIncomes = currentMonthIncomes.add(i.getAmount());
            }
        }

        return new FinancialDashboardSummaryView(
                house.getCurrentBalance(),
                totalExpenses,
                totalIncomes,
                pendingAmount,
                approvedAmount,
                rejectedAmount,
                reimbursedAmount,
                currentMonthExpenses,
                currentMonthIncomes,
                house.isHasSharedFund(),
                house.isRequireExpenseApproval()
        );
    }

    @Transactional(readOnly = true)
    public MonthlyChartView getMonthlyChart(UUID callerUid, UUID houseId, int numberOfMonths) {
        security.requireActiveMember(houseId, callerUid);
        int months = Math.min(Math.max(numberOfMonths, 1), 24);
        YearMonth currentMonth = YearMonth.now(ZoneOffset.UTC);

        Map<YearMonth, BigDecimal> expensesByMonth = new LinkedHashMap<>();
        Map<YearMonth, BigDecimal> incomesByMonth = new LinkedHashMap<>();
        for (int i = months - 1; i >= 0; i--) {
            YearMonth ym = currentMonth.minusMonths(i);
            expensesByMonth.put(ym, BigDecimal.ZERO);
            incomesByMonth.put(ym, BigDecimal.ZERO);
        }

        for (Expense e : expenseRepo.findByHouseIdOrderByExpenseDateDescCreatedAtDesc(houseId)) {
            if ("REJECTED".equals(e.getStatus())) continue;
            YearMonth ym = toUtcMonth(e.getExpenseDate());
            if (expensesByMonth.containsKey(ym)) {
                expensesByMonth.put(ym, expensesByMonth.get(ym).add(e.getAmount()));
            }
        }
        for (Income inc : incomeRepo.findByHouseIdOrderByIncomeDateDescCreatedAtDesc(houseId)) {
            YearMonth ym = toUtcMonth(inc.getIncomeDate());
            if (incomesByMonth.containsKey(ym)) {
                incomesByMonth.put(ym, incomesByMonth.get(ym).add(inc.getAmount()));
            }
        }

        List<MonthlyPointView> points = new ArrayList<>();
        for (YearMonth ym : expensesByMonth.keySet()) {
            points.add(new MonthlyPointView(ym.toString(), expensesByMonth.get(ym), incomesByMonth.get(ym)));
        }
        return new MonthlyChartView(points);
    }

    @Transactional(readOnly = true)
    public PendingActionsView getPendingActions(UUID callerUid, UUID houseId) {
        security.requireActiveMember(houseId, callerUid);
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));

        List<String> actionableStatuses = house.isHasSharedFund()
                ? List.of("PENDING", "APPROVED")
                : List.of("PENDING");
        List<Expense> pending = expenseRepo.findByHouseIdAndStatusInOrderByExpenseDateDescCreatedAtDesc(
                        houseId, actionableStatuses
                )
                .stream()
                .filter(e -> "PENDING".equals(e.getStatus()) || (house.isHasSharedFund() && e.isSharedFund()))
                .toList();
        List<PendingActionView> items = pending.stream().map(PendingActionView::from).toList();
        BigDecimal total = pending.stream().map(Expense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new PendingActionsView(items, items.size(), total);
    }

    @Transactional
    public FinancialDashboardSummaryView adjustBalance(UUID callerUid, UUID houseId, AdjustBalanceInput input) {
        security.requireAdmin(houseId, callerUid);
        House house = houseRepo.findById(houseId)
                .orElseThrow(() -> BusinessException.notFound("HOUSE_NOT_FOUND", "Casa não encontrada."));
        requireSharedFundEnabled(house);
        balanceLedger.setTargetBalance(houseId, callerUid, input.amount(), input.description());
        return getDashboardSummary(callerUid, houseId);
    }

    private void requireSharedFundEnabled(House house) {
        if (!house.isHasSharedFund()) {
            throw BusinessException.badRequest(
                    "SHARED_FUND_DISABLED",
                    "Esta casa está configurada sem caixinha compartilhada."
            );
        }
    }

    private UUID resolveHouseId(UUID callerUid, UUID providedHouseId) {
        if (providedHouseId != null) {
            return providedHouseId;
        }
        return userRepo.findById(callerUid)
                .map(User::getCurrentHouseId)
                .orElseThrow(() -> BusinessException.badRequest("HOUSE_REQUIRED", "Usuário não pertence a nenhuma casa ativa."));
    }

    private void requireCreatorOrAdmin(UUID ownerUid, UUID callerUid, HouseMember caller) {
        boolean isEffectiveAdmin = caller.isAdmin()
                || caller.isOwner()
                || (caller.getHouse() != null && caller.getHouse().isAllMembersAdmin());
        if (!ownerUid.equals(callerUid) && !isEffectiveAdmin) {
            throw BusinessException.forbidden("FORBIDDEN", "Apenas o criador ou um administrador pode realizar esta ação.");
        }
    }

    private YearMonth toUtcMonth(OffsetDateTime timestamp) {
        return YearMonth.from(timestamp.withOffsetSameInstant(ZoneOffset.UTC));
    }

    private void notifyCreator(Expense expense, UUID actorUid, String title, String message, String type) {
        UUID creatorUid = expense.getCreator().getUid();
        if (!creatorUid.equals(actorUid)) {
            notificationService.notifyUsers(
                    List.of(creatorUid),
                    expense.getHouse().getId(),
                    title,
                    message,
                    type,
                    "EXPENSE",
                    String.valueOf(expense.getId())
            );
        }
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
