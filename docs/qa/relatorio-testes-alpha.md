# Relatório de Testes Alpha E2E — RepHelper Web

**Data da execução:** 23/11/2026  
**Escopo:** Testes end-to-end da aplicação completa (`frontend` Expo Web + `backend` Spring Boot 3.4.3 / Java 21 + Flyway + H2 modo PostgreSQL) executados em navegador real, cobrindo autenticação, validação de formulários, onboarding de república, painel inicial, tarefas recorrentes, fluxo completo de finanças, agenda/eventos, notificações, atalhos, configurações, alteração de tema, perfil, troca de senha e recuperação de senha em duas etapas.

---

## Ambiente Executado

- **Backend (`backend/`)**: `mvn spring-boot:test-run` com perfil `test` (`jdbc:h2:mem:rephelper_test`, Flyway `V1__init_schema.sql`), escutando em `http://localhost:8080`.
- **Frontend (`frontend/`)**: `npx expo start --web --port 8081` com `EXPO_PUBLIC_API_BASE_URL=http://localhost:8080`, escutando em `http://localhost:8081`.
- **Cliente:** Navegador automatizado (Chromium WebView).

---

## Inventário de Capturas (`alpha/`)

| # | Arquivo | Tela / Fluxo Validado | API / Validação / Mensagem Observada | Status |
|---|---|---|---|---|
| 01 | [01-login-erro-credenciais.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/01-login-erro-credenciais.png) | Login com credenciais inválidas | `POST /api/v1/auth/login` -> `401`; banner `"Email ou senha incorretos."` | OK |
| 02 | [02-esqueci-senha-confirmacao.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/02-esqueci-senha-confirmacao.png) | Esqueci minha senha (Etapa 1 -> Etapa 2) | Banner verde `"Se existir uma conta associada a este email..."` + toast `"Solicitação enviada"` + inputs de código/nova senha | OK |
| 03 | [03-cadastro-validacao.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/03-cadastro-validacao.png) | Cadastro (`Sign Up`) com erro de validação Zod | Dados `Maria Silva` (`Mari`, `maria.alpha@rephelper.local`); validação `"As senhas não coincidem"` | OK |
| 04 | [04-republica-escolha-erro.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/04-republica-escolha-erro.png) | Escolha de República + código inválido | `POST /api/v1/auth/signup` -> `201`; código inválido `ABC999` exibe erro `"República não encontrada. Verifique o código e tente novamente."` | OK |
| 05 | [05-republica-criada-modal.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/05-republica-criada-modal.png) | Criação de república (`República Alpha`) + modal de convite | `POST /api/v1/republics` -> `201`; modal `"República Criada!"` exibindo código `124741` | OK |
| 06 | [06-painel-home.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/06-painel-home.png) | Painel Home inicial + cópia de código de convite | `/(panel)/home`; toast `"Código copiado para a área de transferência!"`, `República Alpha`, `Bem-vindo, Mari`, `R$ 0,00` | OK |
| 07 | [07-tarefas-criar-recorrente.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/07-tarefas-criar-recorrente.png) | Formulário de criação de tarefa recorrente | `Limpar Cozinha`, categoria `Limpeza`, vencimento `24/11/2026`, recorrência `Semanal` | OK |
| 08 | [08-tarefas-recorrencia-lista.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/08-tarefas-recorrencia-lista.png) | Lista de tarefas após conclusão e recorrência | `POST /tasks` (`201`) -> `PUT /tasks/1` (`200`) -> `POST /tasks/1/complete` (`200`); Tarefa #1 (`24 de nov`, `FEITO`) + nova Tarefa #2 (`1 de dez`, `PENDENTE`) gerada automaticamente | OK |
| 09 | [09-financas-dashboard.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/09-financas-dashboard.png) | Dashboard financeiro com receita e despesa pendente | `POST /incomes` (`201`, `Mensalidade Novembro` `R$ 500,00`) + `POST /expenses` (`201`, `Conta de Luz` `R$ 120,00` `PENDING`); `SALDO TOTAL` mantido em `R$ 500,00` até reembolso | OK |
| 10 | [10-financas-despesa-reembolsada.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/10-financas-despesa-reembolsada.png) | Detalhes da despesa após aprovação e reembolso | `/finances/expenses/1`; `POST /approve` (`200`) -> `POST /reimburse` (`200`); toast `"Reembolso registrado"`, badge `REEMBOLSADA`, botão `Redefinir status` e linha do tempo | OK |
| 11 | [11-eventos-agenda.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/11-eventos-agenda.png) | Agenda após verificação de saldo `R$ 380,00` e criação de evento | `POST /api/v1/events` -> `201`; evento `"Churrasco Alpha"` em `23 de novembro`, `18:00 – 22:00`, `Área gourmet`, badge `AGENDADO`, `1` confirmado (`Você vai`) | OK |
| 12 | [12-evento-detalhes.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/12-evento-detalhes.png) | Detalhes do evento e fluxo de confirmação (RSVP) | `GET /api/v1/events/1` (`200`); `PUT /api/v1/events/1/respond` (`200`) para `DECLINED` (toast `"Participação atualizada — Convite recusado."`) e retorno a `CONFIRMED` | OK |
| 13 | [13-financas-saldo-ajustado.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/13-financas-saldo-ajustado.png) | Ajuste manual de saldo (`R$ 380,00` -> `R$ 1.000,00`) | Modal `Ajustar Saldo` -> `POST /api/v1/finances/{id}/adjust-balance` (`200`); `SALDO TOTAL` atualizado para `R$ 1.000,00` (`POSITIVO`) e gráfico atualizado | OK |
| 14 | [14-painel-home-populado.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/14-painel-home-populado.png) | Home atualizada com dados reais persistidos | KPIs `TAREFAS: 1`, `AGENDA: 1`, `SALDO ATUAL: R$ 1.000,00 • EM DIA`, `Limpar Cozinha` (`1 de dez`) e `Churrasco Alpha` (`23 NOV · 15:00`) | OK |
| 15 | [15-acoes-rapidas.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/15-acoes-rapidas.png) | Modal de Notificações (inspecionado) + tela de Ações Rápidas | `GET /api/v1/notifications/unread` (`200`) e `/notifications/count` (`200`, `count: 0`); tela `/(panel)/quick-actions` exibindo os 8 atalhos | OK |
| 16 | [16-configuracoes-menu.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/16-configuracoes-menu.png) | Menu principal de Configurações | `/(panel)/settings` com seções `CONTA`, `REPÚBLICA`, `APLICATIVO`, botão `Sair da Conta` e rodapé `RepHelper v1.0.0` | OK |
| 17 | [17-configuracoes-republica.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/17-configuracoes-republica.png) | Configurações da República | `GET /api/v1/republics/{id}` (`200`) e `/code-length` (`200`); exibição de código `124741`, nome `República Alpha` e endereço completo | OK |
| 18 | [18-configuracoes-membros.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/18-configuracoes-membros.png) | Membros da República | `GET /api/v1/republics/{id}/members` (`200`); código `124741`, busca e lista com `Mari (Você)` (`PROPRIETÁRIO`) | OK |
| 19 | [19-configuracoes-conta.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/19-configuracoes-conta.png) | Perfil (`Minha Conta`) com apelido atualizado | Edição de `Apelido` de `Mari` para `Mari Alpha`; `PUT /api/v1/users/{uid}` -> `200`; resumo e campo atualizados | OK |
| 20 | [20-configuracoes-aparencia.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/20-configuracoes-aparencia.png) | Alteração de senha + tela de Aparência (Modo Escuro) | `POST /api/v1/auth/change-password` -> `200` (toast `"Senha alterada — Sua senha foi alterada com sucesso."`) + prévia ao vivo `MODO ESCURO` | OK |
| 21 | [21-tema-claro-aparencia.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/21-tema-claro-aparencia.png) | Aparência com Tema Claro (`Claro`) ativado | Troca de tema para `Claro` atualizando toda a interface e `PRÉVIA AO VIVO · MODO CLARO` com contraste adequado | OK |
| 22 | [22-relogin-pos-reset.png](file:///c:/Users/Admin/rep-helper-frontend/alpha/22-relogin-pos-reset.png) | Home após Logout + Reset de Senha em 2 etapas + Re-login | `POST /auth/logout` (`204`) -> `POST /auth/forgot-password` (`200`, código real `556247` no log backend) -> `POST /auth/reset-password` (`200`, toast `"Senha redefinida"`) -> `POST /auth/login` (`200`); `Bem-vindo, Mari Alpha` e todos os dados preservados | OK |

---

## Achados de QA, Inconsistências e Avisos Observados

1. **Inconsistência de fuso horário em eventos (`/events` vs `/events/1` e `/home`)** — *Médio*  
   O evento `"Churrasco Alpha"` enviado às `18:00–22:00` com sufixo UTC (`Z`: `2026-11-23T18:00:00Z` a `2026-11-23T22:00:00Z`) foi exibido como `18:00 – 22:00` na lista da Agenda (`/(panel)/events`), porém convertido para o fuso local `UTC-3` nos Detalhes do Evento (`/(panel)/events/1`: `Hoje, 15:00` / `Término: Hoje, 19:00`) e na Home (`15:00`).

2. **Atualização tardia de cache após mutações (`/tasks` e `/finances`)** — *Médio*  
   Ao concluir tarefa (`/tasks/1`) ou registrar/reembolsar despesa (`/finances/expenses/...`) e voltar às telas de resumo, os valores em memória só refletiram imediatamente após alternar filtros (ex.: aba `Todas`) ou recarregar a página. Já o modal `Ajustar Saldo` (`POST /adjust-balance`) atualizou o `SALDO TOTAL` imediatamente de `R$ 380,00` para `R$ 1.000,00`.

3. **Persistência momentânea de erro entre telas de autenticação (`/sign-in` -> `/sign-up`)** — *Baixo*  
   O banner de erro `"Email ou senha incorretos."` vindo de uma tentativa inválida no login permaneceu brevemente visível ao navegar para `/sign-up` até a interação com os campos de cadastro.

4. **Log enganoso em tentativa de login inválido (401)** — *Baixo*  
   Quando `POST /api/v1/auth/login` retornou `401`, o interceptor registrou `[WARNING] [AUTHENTICATION] Sessão expirada. Faça login novamente.` no console apesar de ser uma tentativa inicial não autenticada (a UI exibiu corretamente `"Email ou senha incorretos."`).

5. **Spinner ativo atrás do modal `"República Criada!"` (`/(republic)/new`)** — *Baixo*  
   Enquanto o modal de confirmação com o código `124741` era exibido, o botão de fundo `"Criar República"` continuou mostrando indicador de carregamento.

6. **Inicial do avatar na lista de tarefas (`/(panel)/tasks`)** — *Baixo*  
   O badge do responsável exibiu `"VO"` (iniciais de `"Você"`) em vez das iniciais reais do usuário (`"MA"` de `Mari`).

7. **Salvamento de perfil no Web (`/(panel)/settings/account`)** — *Baixo*  
   Clicar em `Salvar Alterações` disparou duas requisições `PUT /api/v1/users/{uid}` (`200`) sem exibir toast visível no Web (embora o cartão do perfil e a Home tenham atualizado imediatamente para `Mari Alpha`). A tela também não oferece ação de exclusão de conta (`Excluir Conta`).

8. **Feedback visual/navegação e controle de RSVP em eventos** — *Cosmético*  
   - Na tela `Detalhes do Evento`, a participação possui apenas opções binárias (`Confirmar participação` / `Recusar participação`), sem opção `"Talvez"`.
   - Criação de evento (`POST /api/v1/events`) e ajuste de saldo (`POST /adjust-balance`) concluíram sem toast visível após redirecionar/fechar o modal (diferente de ações como reembolso, troca de senha, redefinição, cópia de código e recusa de evento, que exibiram toasts claros).
   - O `document.title` do navegador permaneceu `localhost:8081/quick-actions` após navegar pelas abas de configurações.

9. **Avisos de React DOM / Acessibilidade no Web** — *Baixo*  
   - Ícones SVG customizados (`GoogleIcon` em `/sign-in` e `InstagramIcon` em `/settings/about`) emitem avisos de props desconhecidas no DOM (`accessibilityElementsHidden`, `importantForAccessibility`).
   - `TouchableMixin is deprecated` e props de responder em `Circle` do `react-native-chart-kit` geram warnings no console Web.
   - Itens `role="radio"` na tela `Aparência` alteram o estilo visual corretamente, mas não expõem `aria-checked="true"` no DOM Web.

10. **Registro adicional de ambiente durante a execução em `Membros`** — *Observação de sessão*  
    Durante a leitura de `GET /api/v1/republics/{id}/members`, o backend retornou `2` membros ativos (`Mari (Você)` como `PROPRIETÁRIO` e `Xiado` / `sleo028@gmail.com` como `MEMBRO`), confirmado via busca no código-fonte que não provém de dados estáticos nem scripts de seed do repositório.

---

## Cobertura Adicional Verificada

- **Notificações:** Modal aberto na Home (`Não lidas` e `Todas`), validando `GET /api/v1/notifications/unread` (`200`) e `GET /api/v1/notifications/count` (`200`) com estado vazio bem tratado (`TUDO EM DIA` / `Sem notificações não lidas`).
- **Configurações Informativas:** Telas `Sobre o App` (`/(panel)/settings/about`) e `Ajuda` (`/(panel)/settings/help`) abertas e navegadas sem erros de API ou quebras de layout.
- **Persistência pós-logout:** Após alteração de senha (`SenhaForte123` -> `NovaSenha456!`), logout (`POST /auth/logout` -> `204`), solicitação de redefinição (`POST /auth/forgot-password` -> `200`, OTP real `556247` capturado via log de `HttpEmailSenderAdapter`), reset (`POST /auth/reset-password` -> `200` para `FinalPass789!`) e novo login, a Home exibiu integralmente `República Alpha`, `Bem-vindo, Mari Alpha`, `R$ 1.000,00`, `Limpar Cozinha` e `Churrasco Alpha`.
