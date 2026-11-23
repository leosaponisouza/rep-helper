# Caso de Uso [UC15]: Configurar e Enviar Notificações

- **Requisitos Relacionados**: `[RF025]`
- **Regras de Negócio**: `[RN015]`
- **Atores**: Morador (`ROLE_MORADOR`) e Administrador (`ROLE_ADMIN`)
- **Pré-condições**: O usuário deve estar autenticado no aplicativo.
- **Pós-condições**: As preferências de canais e categorias de notificação do usuário são salvas, ou um comunicado geral é disparado pelo Administrador para a república.

---

## 1. Fluxo Principal — Personalizar Preferências de Notificação

1. O usuário acessa **"Configurações > Notificações"**.
2. O sistema exibe as chaves de ativação (*toggles*) por **Canal** (*Notificações In-App*, *Web Push no Navegador/Celular*, *E-mail*) e por **Categoria de Evento**:
   - Lembretes de vencimento da Mensalidade Fixa;
   - Atualizações sobre Solicitações de Reembolso (aprovado/reembolsado);
   - Novas Tarefas Domésticas atribuídas ou lembretes de prazo;
   - Alertas de itens em falta na Lista de Compras;
   - Novos Eventos, Reservas e Votações abertas na casa.
3. O usuário ajusta suas preferências e clica em **"Salvar Configurações"**.
4. O sistema persiste as preferências no perfil do usuário.

---

## 2. Fluxo Alternativo — Administrador Envia Comunicado Geral para a República

1. O Administrador acessa **"República > Enviar Comunicado"** (ou atalho no Dashboard).
2. Informa o título e a mensagem do aviso (ex.: *"Visita de dedetização agendada para sexta-feira às 14h"*) e marca se o aviso é urgente.
3. O sistema dispara a notificação imediatamente para todos os moradores ativos da república (`[RN015]`).
