package com.rephelper.backend.finance;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rephelper.backend.AbstractIntegrationTest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class FinanceLedgerIntegrationTest extends AbstractIntegrationTest {

    @Test
    void shouldForbidRegularMemberFromApprovingReimbursingOrAdjustingBalance() throws Exception {
        RepublicFixture rep = createRepublic("fin-rbac", "República Finanças RBAC");
        AuthSession member = joinRepublic("fin-mem", rep.code());

        MvcResult expRes = mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(member.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Internet Fibra",
                                "amount", 150.00,
                                "expenseDate", "2026-11-10T12:00:00Z",
                                "category", "UTILIDADES",
                                "republicId", rep.id()
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
        RepublicFixture rep = createRepublic("fin-rej", "República Rejeição");

        mockMvc.perform(post("/api/v1/incomes")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Rateio Mensal",
                                "amount", 400.00,
                                "incomeDate", "2026-11-01T12:00:00Z",
                                "source", "RATEIO",
                                "republicId", rep.id()
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
                                "republicId", rep.id()
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
        RepublicFixture rep = createRepublic("fin-flt", "República Analytics");

        mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Água",
                                "amount", 95.50,
                                "expenseDate", "2026-11-15T12:00:00Z",
                                "category", "UTILIDADES",
                                "republicId", rep.id()
                        ))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/expenses/status/PENDING").param("republicId", rep.id())
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
        RepublicFixture rep = createRepublic("fin-inc", "República Receitas");

        MvcResult incRes = mockMvc.perform(post("/api/v1/incomes")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Mensalidade",
                                "amount", 300.00,
                                "incomeDate", "2026-11-05T12:00:00Z",
                                "source", "RATEIO",
                                "republicId", rep.id()
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
}
