package com.alpendre.backend.house;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

    @Test
    void shouldCreateHouseWithoutAddressUsingDefaultCoupleFamilyPresetAndAutoPromoteJoiningMember() throws Exception {
        AuthSession owner = signupUser("alpendre-couple-1", "Ana");
        MvcResult createRes = mockMvc.perform(post("/api/v1/houses")
                        .header("Authorization", bearer(owner.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Apê 42"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.house.presetType").value("COUPLE_FAMILY"))
                .andExpect(jsonPath("$.house.hasSharedFund").value(false))
                .andExpect(jsonPath("$.house.requireExpenseApproval").value(false))
                .andExpect(jsonPath("$.house.allMembersAdmin").value(true))
                .andExpect(jsonPath("$.house.address.fullAddress").value(""))
                .andReturn();

        var created = readJson(createRes);
        String houseId = created.get("house").get("id").asText();
        String code = created.get("house").get("code").asText();

        AuthSession partner = joinHouse("alpendre-couple-2", code);

        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", bearer(partner.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.isAdmin").value(true));

        mockMvc.perform(put("/api/v1/houses/" + houseId)
                        .header("Authorization", bearer(partner.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", "Nosso Apê 42"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Nosso Apê 42"));

        mockMvc.perform(delete("/api/v1/houses/" + houseId + "/members/" + owner.uid())
                        .header("Authorization", bearer(partner.token())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CANNOT_REMOVE_OWNER"));
    }

    @Test
    void shouldPromoteExistingActiveMembersWhenAllMembersAdminIsEnabledAndDetectCustomPreset() throws Exception {
        HouseFixture rep = createHouse("switch-gov-owner", "Casa Amigos");
        AuthSession member = joinHouse("switch-gov-mem", rep.code());

        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", bearer(member.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.isAdmin").value(false));

        mockMvc.perform(put("/api/v1/houses/" + rep.id())
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "hasSharedFund", true,
                                "requireExpenseApproval", false,
                                "allMembersAdmin", true
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.presetType").value("CUSTOM"))
                .andExpect(jsonPath("$.hasSharedFund").value(true))
                .andExpect(jsonPath("$.requireExpenseApproval").value(false))
                .andExpect(jsonPath("$.allMembersAdmin").value(true));

        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", bearer(member.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.isAdmin").value(true));

        mockMvc.perform(post("/api/v1/houses/" + rep.id() + "/regenerate-code")
                        .header("Authorization", bearer(member.token())))
                .andExpect(status().isOk());
    }
}
