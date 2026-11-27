package com.alpendre.backend.finance;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alpendre.backend.AbstractIntegrationTest;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class FinanceLedgerIntegrationTest extends AbstractIntegrationTest {

    @Test
    void shouldForbidRegularMemberFromApprovingReimbursingOrAdjustingBalance() throws Exception {
        HouseFixture rep = createHouse("fin-rbac", "República Finanças RBAC");
        AuthSession member = joinHouse("fin-mem", rep.code());

        MvcResult expRes = mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(member.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Internet Fibra",
                                "amount", 150.00,
                                "expenseDate", "2026-11-10T12:00:00Z",
                                "category", "UTILIDADES",
                                "houseId", rep.id()
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        long expenseId = readJson(expRes).get("id").asLong();

        mockMvc.perform(post("/api/v1/expenses/" + expenseId + "/approve")
                        .header("Authorization", bearer(member.token())))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/finances/" + rep.id() + "/adjust-balance")
                        .header("Authorization", bearer(member.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "amount", 999.00,
                                "description", "Tentativa sem permissão"
                        ))))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldRejectExpenseWithReasonWithoutAffectingBalance() throws Exception {
        HouseFixture rep = createHouse("fin-rej", "República Rejeição");

        mockMvc.perform(post("/api/v1/incomes")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Rateio Mensal",
                                "amount", 400.00,
                                "incomeDate", "2026-11-01T12:00:00Z",
                                "source", "RATEIO",
                                "houseId", rep.id()
                        ))))
                .andExpect(status().isCreated());

        MvcResult expRes = mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Item sem nota",
                                "amount", 80.00,
                                "expenseDate", "2026-11-02T12:00:00Z",
                                "category", "OUTROS",
                                "houseId", rep.id()
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        long expenseId = readJson(expRes).get("id").asLong();

        mockMvc.perform(post("/api/v1/expenses/" + expenseId + "/reject")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reason", "Comprovante ausente"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Comprovante ausente"));

        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + rep.id())
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(400.0));
    }

    @Test
    void shouldFilterExpensesByStatusAndServeDashboardAnalytics() throws Exception {
        HouseFixture rep = createHouse("fin-flt", "República Analytics");

        mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Água",
                                "amount", 95.50,
                                "expenseDate", "2026-11-15T12:00:00Z",
                                "category", "UTILIDADES",
                                "houseId", rep.id()
                        ))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/expenses/status/PENDING").param("houseId", rep.id())
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(get("/api/v1/financial-dashboard/pending-actions/" + rep.id())
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isMap());

        mockMvc.perform(get("/api/v1/financial-dashboard/expenses/monthly/" + rep.id())
                        .param("numberOfMonths", "6")
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk());
    }

    @Test
    void shouldUpdateAndDeleteIncomeRecalculatingBalance() throws Exception {
        HouseFixture rep = createHouse("fin-inc", "República Receitas");

        MvcResult incRes = mockMvc.perform(post("/api/v1/incomes")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Mensalidade",
                                "amount", 300.00,
                                "incomeDate", "2026-11-05T12:00:00Z",
                                "source", "RATEIO",
                                "houseId", rep.id()
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        long incomeId = readJson(incRes).get("id").asLong();

        mockMvc.perform(put("/api/v1/incomes/" + incomeId)
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Mensalidade Ajustada",
                                "amount", 450.00
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(450.0));

        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + rep.id())
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(450.0));

        mockMvc.perform(delete("/api/v1/incomes/" + incomeId)
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + rep.id())
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(0.0));
    }

    @Test
    void shouldTrackMonthlyExpensesWithoutSharedFundAndBlockIncomeAdjustAndReimburse() throws Exception {
        AuthSession owner = signupUser("fin-couple-1", "Clara");
        MvcResult houseRes = mockMvc.perform(post("/api/v1/houses")
                        .header("Authorization", bearer(owner.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Apê Clara & Leo",
                                "presetType", "COUPLE_FAMILY"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String houseId = readJson(houseRes).get("house").get("id").asText();
        String token = readJson(houseRes).get("token").asText();
        String nowIso = OffsetDateTime.now(ZoneOffset.UTC).toString();

        MvcResult expRes = mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Supermercado",
                                "amount", 180.00,
                                "expenseDate", nowIso,
                                "category", "MERCADO",
                                "houseId", houseId
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andReturn();
        long expenseId = readJson(expRes).get("id").asLong();

        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + houseId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasSharedFund").value(false))
                .andExpect(jsonPath("$.requireExpenseApproval").value(false))
                .andExpect(jsonPath("$.currentBalance").value(0.0))
                .andExpect(jsonPath("$.totalExpenses").value(180.0))
                .andExpect(jsonPath("$.totalExpensesCurrentMonth").value(180.0));

        mockMvc.perform(get("/api/v1/financial-dashboard/pending-actions/" + houseId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingExpensesCount").value(0));

        mockMvc.perform(put("/api/v1/expenses/" + expenseId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("amount", 220.00))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(220.0));

        mockMvc.perform(post("/api/v1/incomes")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Depósito",
                                "amount", 100.00,
                                "incomeDate", nowIso,
                                "source", "PIX",
                                "houseId", houseId
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SHARED_FUND_DISABLED"));

        mockMvc.perform(post("/api/v1/finances/" + houseId + "/adjust-balance")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("amount", 300.00, "description", "Teste"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SHARED_FUND_DISABLED"));

        mockMvc.perform(post("/api/v1/expenses/" + expenseId + "/reimburse")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SHARED_FUND_DISABLED"));

        mockMvc.perform(delete("/api/v1/expenses/" + expenseId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + houseId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalExpenses").value(0.0))
                .andExpect(jsonPath("$.currentBalance").value(0.0));
    }

    @Test
    void shouldRequireAdminApprovalWithoutSharedFundAndClearPendingQueueWithoutReimbursement() throws Exception {
        AuthSession owner = signupUser("fin-fam-owner", "Paulo");
        MvcResult houseRes = mockMvc.perform(post("/api/v1/houses")
                        .header("Authorization", bearer(owner.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Casa Família",
                                "hasSharedFund", false,
                                "requireExpenseApproval", true,
                                "allMembersAdmin", false
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String houseId = readJson(houseRes).get("house").get("id").asText();
        String code = readJson(houseRes).get("house").get("code").asText();
        String ownerToken = readJson(houseRes).get("token").asText();
        AuthSession member = joinHouse("fin-fam-child", code);

        MvcResult expRes = mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(member.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Farmácia",
                                "amount", 90.00,
                                "expenseDate", "2026-11-18T12:00:00Z",
                                "category", "SAUDE",
                                "houseId", houseId
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();
        long expenseId = readJson(expRes).get("id").asLong();

        mockMvc.perform(get("/api/v1/financial-dashboard/pending-actions/" + houseId)
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingExpensesCount").value(1));

        mockMvc.perform(post("/api/v1/expenses/" + expenseId + "/approve")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mockMvc.perform(get("/api/v1/financial-dashboard/pending-actions/" + houseId)
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingExpensesCount").value(0));

        mockMvc.perform(post("/api/v1/expenses/" + expenseId + "/reimburse")
                        .header("Authorization", bearer(ownerToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("SHARED_FUND_DISABLED"));
    }

    @Test
    void shouldImmediatelyDebitAndAdjustSharedFundWhenApprovalIsDisabled() throws Exception {
        AuthSession owner = signupUser("fin-direct-owner", "Julia");
        MvcResult houseRes = mockMvc.perform(post("/api/v1/houses")
                        .header("Authorization", bearer(owner.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Casa Caixinha Direta",
                                "hasSharedFund", true,
                                "requireExpenseApproval", false,
                                "allMembersAdmin", true
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String houseId = readJson(houseRes).get("house").get("id").asText();
        String token = readJson(houseRes).get("token").asText();

        mockMvc.perform(post("/api/v1/incomes")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Aporte Mensal",
                                "amount", 500.00,
                                "incomeDate", "2026-11-01T12:00:00Z",
                                "source", "PIX",
                                "houseId", houseId
                        ))))
                .andExpect(status().isCreated());

        MvcResult expRes = mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Gás",
                                "amount", 120.00,
                                "expenseDate", "2026-11-03T12:00:00Z",
                                "category", "UTILIDADES",
                                "houseId", houseId
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REIMBURSED"))
                .andReturn();
        long expenseId = readJson(expRes).get("id").asLong();

        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + houseId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(380.0));

        mockMvc.perform(put("/api/v1/expenses/" + expenseId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("amount", 150.00))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(150.0));

        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + houseId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(350.0));

        mockMvc.perform(delete("/api/v1/expenses/" + expenseId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + houseId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(500.0));
    }

    @Test
    void shouldProtectBalanceAndEligibilityAcrossModeTransitions() throws Exception {
        AuthSession owner = signupUser("fin-mode-switch", "Marina");
        MvcResult houseRes = mockMvc.perform(post("/api/v1/houses")
                        .header("Authorization", bearer(owner.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Casa Mutável",
                                "presetType", "COUPLE_FAMILY"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        String houseId = readJson(houseRes).get("house").get("id").asText();
        String token = readJson(houseRes).get("token").asText();

        // 1. Create a personal-tracking ("Registrada") expense while hasSharedFund=false, requireExpenseApproval=false
        MvcResult trackedExpRes = mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Padaria",
                                "amount", 60.00,
                                "expenseDate", "2026-11-10T12:00:00Z",
                                "category", "MERCADO",
                                "houseId", houseId
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.sharedFund").value(false))
                .andReturn();
        long trackedExpenseId = readJson(trackedExpRes).get("id").asLong();

        // Reject and reset must be blocked when requireExpenseApproval=false
        mockMvc.perform(post("/api/v1/expenses/" + trackedExpenseId + "/reject")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reason", "Indevido"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("APPROVAL_NOT_ENABLED"));

        mockMvc.perform(post("/api/v1/expenses/" + trackedExpenseId + "/reset")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("APPROVAL_NOT_ENABLED"));

        // 2. Switch house to REPUBLIC (hasSharedFund=true, requireExpenseApproval=true) and fund caixinha
        mockMvc.perform(put("/api/v1/houses/" + houseId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("presetType", "REPUBLIC"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasSharedFund").value(true))
                .andExpect(jsonPath("$.requireExpenseApproval").value(true));

        mockMvc.perform(post("/api/v1/incomes")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Fundo Inicial",
                                "amount", 500.00,
                                "incomeDate", "2026-11-11T12:00:00Z",
                                "source", "PIX",
                                "houseId", houseId
                        ))))
                .andExpect(status().isCreated());

        // Pre-existing non-fund "Registrada" expense must NOT enter pendingActions or be reimbursable
        mockMvc.perform(get("/api/v1/financial-dashboard/pending-actions/" + houseId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingExpensesCount").value(0));

        mockMvc.perform(post("/api/v1/expenses/" + trackedExpenseId + "/reimburse")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("EXPENSE_NOT_IN_SHARED_FUND"));

        // 3. Create, approve, and reimburse a real shared-fund expense (500 -> 380)
        MvcResult fundExpRes = mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Conta de Luz",
                                "amount", 120.00,
                                "expenseDate", "2026-11-12T12:00:00Z",
                                "category", "UTILIDADES",
                                "houseId", houseId
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sharedFund").value(true))
                .andReturn();
        long fundExpenseId = readJson(fundExpRes).get("id").asLong();

        mockMvc.perform(post("/api/v1/expenses/" + fundExpenseId + "/approve")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/expenses/" + fundExpenseId + "/reimburse")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + houseId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(380.0));

        // 4. Disable shared fund and delete the historical reimbursed expense -> balance must NOT mutate
        mockMvc.perform(put("/api/v1/houses/" + houseId)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "hasSharedFund", false,
                                "requireExpenseApproval", false,
                                "allMembersAdmin", true
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/expenses/" + fundExpenseId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + houseId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(380.0));
    }
}
