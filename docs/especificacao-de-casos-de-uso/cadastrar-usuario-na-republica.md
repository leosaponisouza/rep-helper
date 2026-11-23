# Caso de Uso [UC03]: Ingressar na República via Código de Convite

- **Requisitos Relacionados**: `[RF005]`
- **Regras de Negócio**: `[RN001]`, `[RN002]`
- **Atores**: Usuário autenticado (torna-se **Morador `ROLE_MORADOR`**)
- **Pré-condições**: O usuário deve estar logado no sistema, não pertencer a nenhuma república ativa (`[RN001]`) e possuir um código ou link de convite válido fornecido pelo Administrador da república.
- **Pós-condições**: O usuário é vinculado à república como `ROLE_MORADOR`, passa a compor a lista de membros ativos (para mensalidades, rodízio de tarefas e votações) e o Administrador é notificado.

---

## 1. Fluxo Principal

1. Na tela de Onboarding, o usuário seleciona a opção **"Entrar em uma República Existente"** (ou acessa diretamente o link de convite compartilhado pelo Administrador).
2. O usuário insere o **Código de Convite** (ex.: `REP-8F4K9`) e clica em **"Buscar República"**.
3. O sistema valida o código e exibe um card de confirmação com o **Nome da República**, **Cidade/Bairro** e o **Nome do Administrador atual**.
4. O usuário confirma o ingresso clicando em **"Confirmar Entrada na República"**.
5. O sistema cria o vínculo do usuário como `ROLE_MORADOR` na república (atribuindo inicialmente o valor base de mensalidade da casa, que o Admin pode personalizar por quarto em `[UC04]`), dispara uma notificação ao Administrador e redireciona o novo morador para o **Dashboard da República**.

---

## 2. Fluxos Alternativos e de Exceção

- **FE1 — Código de convite inválido, expirado ou revogado**: No passo 3, se o código informado não existir ou tiver sido regenerado/desativado pelo Administrador, o sistema exibe a mensagem *"Código de convite inválido ou expirado. Solicite o código atualizado ao Administrador da sua república"*.
- **FE2 — Limite de vagas atingido (opcional)**: Caso a república esteja com todas as vagas preenchidas, o sistema alerta que a capacidade configurada foi atingida e orienta o Administrador a ampliar o número de vagas nas configurações da república.
