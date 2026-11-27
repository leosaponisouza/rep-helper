package com.alpendre.backend.house;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alpendre.backend.AbstractIntegrationTest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class HouseRbacIntegrationTest extends AbstractIntegrationTest {

    @Test
    void shouldEnforceMultiTenantIsolationForOutsiders() throws Exception {
        HouseFixture rep = createHouse("iso-owner", "República Isolada");
        AuthSession outsider = signupUser("iso-outsider", "Outsider User");

        mockMvc.perform(get("/api/v1/houses/" + rep.id() + "/members")
                        .header("Authorization", bearer(outsider.token())))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/houses/" + rep.id() + "/regenerate-code")
                        .header("Authorization", bearer(outsider.token())))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + rep.id())
                        .header("Authorization", bearer(outsider.token())))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldAllowOwnerToPromoteAndDemoteAdminButNotSelfDemote() throws Exception {
        HouseFixture rep = createHouse("rbac-owner", "República RBAC");
        AuthSession member = joinHouse("rbac-member", rep.code());

        mockMvc.perform(post("/api/v1/houses/" + rep.id() + "/members/" + member.uid() + "/admin")
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isAdmin").value(true));

        mockMvc.perform(delete("/api/v1/houses/" + rep.id() + "/members/" + member.uid() + "/admin")
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isAdmin").value(false));

        // Owner cannot demote themselves
        mockMvc.perform(delete("/api/v1/houses/" + rep.id() + "/members/" + rep.owner().uid() + "/admin")
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldForbidRegularMemberFromPromotingOrRegeneratingInviteCode() throws Exception {
        HouseFixture rep = createHouse("mem-owner", "República Permissões");
        AuthSession member = joinHouse("mem-regular", rep.code());

        mockMvc.perform(post("/api/v1/houses/" + rep.id() + "/members/" + member.uid() + "/admin")
                        .header("Authorization", bearer(member.token())))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/houses/" + rep.id() + "/regenerate-code")
                        .header("Authorization", bearer(member.token())))
                .andExpect(status().isForbidden());
    }

    @Test
    void shouldRejectInvalidInviteCodeOnJoin() throws Exception {
        AuthSession newcomer = signupUser("badcode", "Newcomer");

        mockMvc.perform(post("/api/v1/houses/join")
                        .header("Authorization", bearer(newcomer.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("code", "ZZZ999"))))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldAllowOwnerToRegenerateCodeAndRemoveMember() throws Exception {
        HouseFixture rep = createHouse("regen-owner", "República Regen");
        AuthSession member = joinHouse("regen-member", rep.code());

        MvcResult regenRes = mockMvc.perform(post("/api/v1/houses/" + rep.id() + "/regenerate-code")
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").isNotEmpty())
                .andReturn();

        String newCode = readJson(regenRes).get("code").asText();
        assertThat(newCode).isNotEqualTo(rep.code());

        mockMvc.perform(delete("/api/v1/houses/" + rep.id() + "/members/" + member.uid())
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/houses/" + rep.id() + "/members")
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }
}
