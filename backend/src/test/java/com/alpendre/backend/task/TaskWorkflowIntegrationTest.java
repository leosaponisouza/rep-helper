package com.alpendre.backend.task;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.alpendre.backend.AbstractIntegrationTest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class TaskWorkflowIntegrationTest extends AbstractIntegrationTest {

    @Test
    void shouldSpawnNextOccurrenceWhenCompletingWeeklyRecurringTask() throws Exception {
        HouseFixture rep = createHouse("task-rec", "República Tarefas");

        MvcResult createRes = mockMvc.perform(post("/api/v1/tasks")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Limpar Cozinha",
                                "description", "Limpeza semanal completa",
                                "category", "Limpeza",
                                "dueDate", "2026-11-24T18:00:00Z",
                                "recurring", true,
                                "recurrenceType", "WEEKLY",
                                "recurrenceInterval", 1,
                                "houseId", rep.id(),
                                "assignedUsers", List.of(rep.owner().uid())
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.recurring").value(true))
                .andReturn();

        long taskId = readJson(createRes).get("id").asLong();

        mockMvc.perform(put("/api/v1/tasks/" + taskId)
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "IN_PROGRESS"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        mockMvc.perform(post("/api/v1/tasks/" + taskId + "/complete")
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        // Completing a weekly recurring task spawns a second PENDING occurrence
        mockMvc.perform(get("/api/v1/tasks").param("houseId", rep.id())
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void shouldFilterTasksWithPaginationAndStatus() throws Exception {
        HouseFixture rep = createHouse("task-flt", "República Filtros");

        mockMvc.perform(post("/api/v1/tasks")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Tirar Lixo",
                                "category", "Limpeza",
                                "dueDate", "2026-12-01T10:00:00Z",
                                "houseId", rep.id(),
                                "assignedUsers", List.of(rep.owner().uid())
                        ))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/tasks/filter").param("houseId", rep.id())
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "status", "PENDING",
                                "page", 0,
                                "size", 10
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Tirar Lixo"));

        mockMvc.perform(post("/api/v1/tasks/assigned/filter")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "status", "PENDING",
                                "page", 0,
                                "size", 10
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    void shouldCancelAndDeleteTask() throws Exception {
        HouseFixture rep = createHouse("task-del", "República Cancelar");

        MvcResult createRes = mockMvc.perform(post("/api/v1/tasks")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Trocar Lâmpada",
                                "category", "Manutenção",
                                "dueDate", "2026-12-05T15:00:00Z",
                                "houseId", rep.id()
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        long taskId = readJson(createRes).get("id").asLong();

        mockMvc.perform(post("/api/v1/tasks/" + taskId + "/cancel")
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        mockMvc.perform(delete("/api/v1/tasks/" + taskId)
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/tasks/" + taskId)
                        .header("Authorization", bearer(rep.owner().token())))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldForbidOutsiderFromReadingOrCompletingTask() throws Exception {
        HouseFixture rep = createHouse("task-iso", "República Privada");
        AuthSession outsider = signupUser("task-outsider", "Task Outsider");

        MvcResult createRes = mockMvc.perform(post("/api/v1/tasks")
                        .header("Authorization", bearer(rep.owner().token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Tarefa Interna",
                                "category", "Geral",
                                "dueDate", "2026-12-10T12:00:00Z",
                                "houseId", rep.id()
                        ))))
                .andExpect(status().isCreated())
                .andReturn();

        long taskId = readJson(createRes).get("id").asLong();

        mockMvc.perform(get("/api/v1/tasks/" + taskId)
                        .header("Authorization", bearer(outsider.token())))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/tasks/" + taskId + "/complete")
                        .header("Authorization", bearer(outsider.token())))
                .andExpect(status().isForbidden());
    }
}
