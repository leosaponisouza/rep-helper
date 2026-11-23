# Relatório de Testes E2E (Alpha) — RepHelper Web

**Data da execução:** 23/11/2026  
**Escopo:** Testes end-to-end da aplicação completa (`frontend` Expo Web + `backend` Spring Boot 3.4.3 / Java 21 + Flyway + H2 modo PostgreSQL) executados em navegador real, cobrindo autenticação, validação de formulários, onboarding de república, painel inicial, tarefas recorrentes, fluxo completo de finanças, agenda/eventos, notificações, atalhos, configurações, alteração de tema, perfil, troca de senha e recuperação de senha em duas etapas.

---

## Ambiente Executado

- **Backend (`backend/`)**: `mvn spring-boot:test-run` com perfil `test` (`jdbc:h2:mem:rephelper_test`, Flyway `V1__init_schema.sql`), escutando em `http://localhost:8080`.
- **Frontend (`frontend/`)**: `npx expo start --web --port 8081` com `EXPO_PUBLIC_API_BASE_URL=http://localhost:8080`, escutando em `http://localhost:8081`.
- **Cliente:** Navegador automatizado (Chromium WebView).

---

## Inventário de Capturas (`docs/qa/`)

| # | Captura | Tela / Fluxo Validado | API / Validação / Mensagem Observada | Status |
|---|---|---|---|---|
| 01 | [01-login-erro-credenciais.png](./01-login-erro-credenciais.png) | Login com credenciais inválidas | `POST /api/v1/auth/login` → `401`; banner `"Email ou senha incorretos."` | OK |
| 02 | [02-esqueci-senha-confirmacao.png](./02-esqueci-senha-confirmacao.png) | Esqueci minha senha (Etapa 1 → Etapa 2) | Banner verde + toast `"Solicitação enviada"` + inputs de código/nova senha | OK |
| 03 | [03-cadastro-validacao.png](./03-cadastro-validacao.png) | Cadastro (`Sign Up`) com erro de validação Zod | Validação `"As senhas não coincidem"` | OK |
| 04 | [04-republica-escolha-erro.png](./04-republica-escolha-erro.png) | Escolha de República + código inválido | `POST /api/v1/auth/signup` → `201`; código inválido `ABC999` exibe erro contextual | OK |
| 05 | [05-republica-criada-modal.png](./05-republica-criada-modal.png) | Criação de república (`República Alpha`) + modal de convite | `POST /api/v1/republics` → `201`; modal `"República Criada!"` exibindo código `124741` | OK |
| 06 | [06-painel-home.png](./06-painel-home.png) | Painel Home inicial + cópia de código de convite | Toast `"Código copiado para a área de transferência!"`, `República Alpha`, `R$ 0,00` | OK |
| 07 | [07-tarefas-criar-recorrente.png](./07-tarefas-criar-recorrente.png) | Formulário de criação de tarefa recorrente | `Limpar Cozinha`, `Limpeza`, `24/11/2026`, recorrência `Semanal` | OK |
| 08 | [08-tarefas-recorrencia-lista.png](./08-tarefas-recorrencia-lista.png) | Lista de tarefas após conclusão e recorrência | `POST /tasks` (`201`) → `PUT /tasks/1` (`200`) → `POST /tasks/1/complete` (`200`); Tarefa #1 `FEITO` + Tarefa #2 `PENDENTE` gerada automaticamente | OK |
| 09 | [09-financas-dashboard.png](./09-financas-dashboard.png) | Dashboard financeiro com receita e despesa pendente | `POST /incomes` (`201`, `+R$ 500,00`) + `POST /expenses` (`201`, `R$ 120,00` `PENDING`); saldo mantido em `R$ 500,00` até reembolso | OK |
| 10 | [10-financas-despesa-reembolsada.png](./10-financas-despesa-reembolsada.png) | Detalhes da despesa após aprovação e reembolso | `POST /approve` (`200`) → `POST /reimburse` (`200`); toast `"Reembolso registrado"`, badge `REEMBOLSADA` e linha do tempo | OK |
| 11 | [11-eventos-agenda.png](./11-eventos-agenda.png) | Agenda após verificação de saldo `R$ 380,00` e criação de evento | `POST /api/v1/events` → `201`; `"Churrasco Alpha"` em `23 de novembro`, badge `AGENDADO` | OK |
| 12 | [12-evento-detalhes.png](./12-evento-detalhes.png) | Detalhes do evento e fluxo de confirmação (RSVP) | `GET /api/v1/events/1` (`200`); `PUT /api/v1/events/1/respond` (`200`) `DECLINED` → `CONFIRMED` | OK |
| 13 | [13-financas-saldo-ajustado.png](./13-financas-saldo-ajustado.png) | Ajuste manual de saldo (`R$ 380,00` → `R$ 1.000,00`) | `POST /api/v1/finances/{id}/adjust-balance` (`200`); `SALDO TOTAL` atualizado para `R$ 1.000,00` | OK |
| 14 | [14-painel-home-populado.png](./14-painel-home-populado.png) | Home atualizada com dados reais persistidos | `TAREFAS: 1`, `AGENDA: 1`, `SALDO ATUAL: R$ 1.000,00 • EM DIA`, `Limpar Cozinha` e `Churrasco Alpha` | OK |
| 15 | [15-acoes-rapidas.png](./15-acoes-rapidas.png) | Modal de Notificações + tela de Ações Rápidas | `GET /api/v1/notifications/unread` (`200`), `/count` (`200`) e 8 atalhos em `/(panel)/quick-actions` | OK |
| 16 | [16-configuracoes-menu.png](./16-configuracoes-menu.png) | Menu principal de Configurações | Seções `CONTA`, `REPÚBLICA`, `APLICATIVO`, `Sair da Conta` e `RepHelper v1.0.0` | OK |
| 17 | [17-configuracoes-republica.png](./17-configuracoes-republica.png) | Configurações da República | `GET /api/v1/republics/{id}` (`200`); código `124741`, nome `República Alpha` e endereço completo | OK |
| 18 | [18-configuracoes-membros.png](./18-configuracoes-membros.png) | Membros da República | `GET /api/v1/republics/{id}/members` (`200`); código `124741`, busca e lista com papéis | OK |
| 19 | [19-configuracoes-conta.png](./19-configuracoes-conta.png) | Perfil (`Minha Conta`) com apelido atualizado | `PUT /api/v1/users/{uid}` → `200`; `Apelido` atualizado para `Mari Alpha` | OK |
| 20 | [20-configuracoes-aparencia.png](./20-configuracoes-aparencia.png) | Alteração de senha + Aparência (Modo Escuro) | `POST /api/v1/auth/change-password` → `200` (toast `"Senha alterada"`) + prévia `MODO ESCURO` | OK |
| 21 | [21-tema-claro-aparencia.png](./21-tema-claro-aparencia.png) | Aparência com Tema Claro (`Claro`) ativado | Troca de tema para `Claro` atualizando toda a interface e `PRÉVIA AO VIVO · MODO CLARO` | OK |
| 22 | [22-relogin-pos-reset.png](./22-relogin-pos-reset.png) | Home após Logout + Reset de Senha em 2 etapas + Re-login | `POST /auth/logout` (`204`) → `POST /auth/forgot-password` (`200`, OTP `556247`) → `POST /auth/reset-password` (`200`) → `POST /auth/login` (`200`); dados preservados | OK |

---

## Rastreamento de Apontamentos de QA

Todos os apontamentos funcionais, de cache, UX e acessibilidade levantados na execução Alpha foram corrigidos e validados pela suíte automatizada (`npm run typecheck`, `125` testes Jest e `27` testes de integração Spring Boot):

| # | Severidade | Apontamento | Resolução | Status |
|---|---|---|---|---|
| 1 | Médio | Inconsistência de fuso horário em eventos (`/events` vs `/events/1` e `/home`) | `formatToBackendDateTime` passou a enviar ISO-8601 com offset (`XXX`); `EventItem` e `Calendar` passaram a usar `formatTime`/`formatLocalDate` via `parseISO`. Coberto por teste unitário (`dateUtils.test.ts`) e teste de integração (`EventAndNotificationIntegrationTest`). | **Corrigido** |
| 2 | Médio | Cache desatualizado ao voltar para `/tasks` e `/finances` pós-mutação | Adicionado `useFocusEffect` com guard de foco inicial (`hasFocusedOnceRef`) em `tasks-list.tsx` e `finances/index.tsx` para revalidar dados ao retornar à tela. | **Corrigido** |
| 3 | Baixo | Persistência momentânea do erro de `/sign-in` ao abrir `/sign-up` | `SignUpScreen` limpa `AuthContext` (`clearError()`) no mount. | **Corrigido** |
| 4 | Baixo | Log `"Sessão expirada"` em `401` de tentativa de login inválido | `ErrorHandler` diferencia endpoints de credenciais (`/auth/login`, `/auth/google`, `/auth/change-password`), exibindo a mensagem do servidor (`"Email ou senha incorretos."`). | **Corrigido** |
| 5 | Baixo | Spinner ativo atrás do modal `"República Criada!"` (`(republic)/new`) | `setIsSubmitting(false)` executado antes de abrir `showRepublicCodeDialog`, mantendo `hasCompletedRef` contra duplo envio. | **Corrigido** |
| 6 | Baixo | Badge do avatar na lista de tarefas exibindo `"VO"` (de `"Você"`) | `<Avatar>` em `TaskItem.tsx` passou a receber `assignedUser.nickname \|\| assignedUser.name`. | **Corrigido** |
| 7 | Baixo | Disparo duplicado de `PUT /api/v1/users/{uid}` ao salvar perfil no Web | Adicionado guard síncrono `isSavingRef` em `handleSaveProfile` (`account.tsx`). | **Corrigido** |
| 8 | Baixo | Warnings de DOM em `GoogleIcon`/`InstagramIcon` e ausência de `aria-checked` em `role="radio"` | `BrandIcons.tsx` usa `aria-hidden` na Web e props nativas apenas em iOS/Android; `appearance.tsx` expõe `checked: isSelected` em `accessibilityState`. | **Corrigido** |
| 9 | Cosmético | Warnings internos de bibliotecas de terceiros no Web (`TouchableMixin`, `react-native-chart-kit`) e opção `"Talvez"` em RSVP | Restrições upstream de `react-native-chart-kit` / modelo binário de RSVP (`CONFIRMED`/`DECLINED`) mantidos conscientemente no escopo atual. | **Mapeado** |
