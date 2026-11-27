package com.alpendre.backend.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alpendre.backend.AbstractIntegrationTest;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class EventAndNotificationIntegrationTest extends AbstractIntegrationTest {

    @Test
    void shouldPreserveOffsetDateTimeInstantAndSupportRsvpTransitions() throws Exception {
        HouseFixture rep = createHouse("evt-rsvp", "República Eventos");

        MvcResult createRes = mockMvc.perform(post("/api/v1/events")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Churrasco da Rep",
                                "description", "Integração de semestre",
                                "startDate", "2026-12-10T18:00:00-03:00",
                                "endDate", "2026-12-10T22:00:00-03:00",
                                "location", "Área gourmet",
                                "houseId", rep.id()
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        long eventId = readJson(createRes).get("id").asLong();
        OffsetDateTime returnedStart = OffsetDateTime.parse(readJson(createRes).get("startDate").asText());
        assertThat(returnedStart.toInstant())
                .isEqualTo(OffsetDateTime.parse("2026-12-10T21:00:00Z").toInstant());

        mockMvc.perform(put("/api/v1/events/" + eventId + "/respond")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "DECLINED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invitations[0].status").value("DECLINED"));

        mockMvc.perform(put("/api/v1/events/" + eventId + "/respond")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "CONFIRMED"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invitations[0].status").value("CONFIRMED"));

        mockMvc.perform(get("/api/v1/events/confirmed")
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void shouldInviteMemberAndDeliverReadableNotifications() throws Exception {
        HouseFixture rep = createHouse("evt-notif", "República Notificações");
        AuthSession member = joinHouse("evt-guest", rep.code());

        MvcResult createRes = mockMvc.perform(post("/api/v1/events")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Reunião Geral",
                                "description", "Alinhamento de contas",
                                "startDate", "2026-12-15T19:00:00-03:00",
                                "endDate", "2026-12-15T20:30:00-03:00",
                                "location", "Sala",
                                "houseId", rep.id()
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        long eventId = readJson(createRes).get("id").asLong();

        mockMvc.perform(post("/api/v1/events/" + eventId + "/invite")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("userIds", List.of(member.uid())))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invitations.length()").value(2));

        MvcResult unreadRes = mockMvc.perform(get("/api/v1/notifications/unread")
                        .header("Authorization", bearer(member.token())))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(readJson(unreadRes).size()).isGreaterThanOrEqualTo(1);

        mockMvc.perform(post("/api/v1/notifications/mark-all-read")
                        .header("Authorization", bearer(member.token())))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/notifications/count")
                        .header("Authorization", bearer(member.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));
    }

    @Test
    void shouldUpdateAndDeleteEvent() throws Exception {
        HouseFixture rep = createHouse("evt-upd", "República Editar Evento");

        MvcResult createRes = mockMvc.perform(post("/api/v1/events")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Noite de Jogos",
                                "description", "Boardgames",
                                "startDate", "2026-12-20T20:00:00-03:00",
                                "endDate", "2026-12-20T23:00:00-03:00",
                                "location", "Sala",
                                "houseId", rep.id()
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        long eventId = readJson(createRes).get("id").asLong();

        mockMvc.perform(put("/api/v1/events/" + eventId)
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Noite de Jogos (Atualizado)",
                                "location", "Varanda"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Noite de Jogos (Atualizado)"))
                .andExpect(jsonPath("$.location").value("Varanda"));

        mockMvc.perform(delete("/api/v1/events/" + eventId)
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/events/" + eventId)
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldForbidOutsiderFromAccessingEventDetails() throws Exception {
        HouseFixture rep = createHouse("evt-iso", "República Evento Privado");
        AuthSession outsider = signupUser("evt-outsider", "Event Outsider");

        MvcResult createRes = mockMvc.perform(post("/api/v1/events")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Reunião Interna",
                                "description", "Apenas moradores",
                                "startDate", "2026-12-22T18:00:00-03:00",
                                "endDate", "2026-12-22T19:00:00-03:00",
                                "location", "Sala",
                                "houseId", rep.id()
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        long eventId = readJson(createRes).get("id").asLong();

        mockMvc.perform(get("/api/v1/events/" + eventId)
                        .header("Authorization", bearer(outsider.token())))
                .andExpect(status().isForbidden());
    }
}
