# Caso de Uso [UC16]: Personalizar Interface do Aplicativo

- **Requisitos Relacionados**: `[RF026]`
- **Regras deInterface**: `[RI003]`, `[RI004]`
- **Atores**: Morador (`ROLE_MORADOR`) / Administrador (`ROLE_ADMIN`)
- **Pré-condições**: O usuário deve estar autenticado no aplicativo.
- **Pós-condições**: O tema visual (Claro/Escuro) e as preferências de visualização do Dashboard do usuário são aplicados imediatamente e persistidos.

---

## 1. Fluxo Principal

1. O usuário acessa **"Configurações > Aparência e Interface"** (ou utiliza o botão rápido de alternância de tema no cabeçalho do aplicativo).
2. O usuário seleciona suas preferências visuais:
   - **Tema de Cores**: `Modo Claro (Light)`, `Modo Escuro (Dark)` ou `Seguir Padrão do Sistema Operacional`;
   - **Ordem dos Cards no Dashboard**: Permite escolher quais resumos aparecem no topo da tela inicial (ex.: priorizar *Caixa & Minha Mensalidade* e *Minhas Tarefas*).
3. O usuário clica em **"Salvar Preferências"**.
4. O sistema aplica instantaneamente as variáveis CSS do tema escolhido no front-end React (salvando em `localStorage` e no perfil do usuário na API) para manter a mesma aparência em qualquer dispositivo.
