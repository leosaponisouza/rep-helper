# Partes Interessadas e Usuários

## 1. Demografia do Público-Alvo

Estudantes de graduação, pós-graduação e cursos técnicos (majoritariamente entre 18 e 30 anos) que residem em moradias compartilhadas (repúblicas, apartamentos divididos ou casas estudantis) e utilizam smartphones e notebooks diariamente.

## 2. Perfis de Usuários do Sistema (Atores Internos)

O sistema adota um modelo enxuto e claro de controle de acesso baseado em dois papéis (roles) vinculados à república:

| Papel no Sistema | Código Técnico | Descrição e Responsabilidades |
| :--- | :--- | :--- |
| **Morador** | `ROLE_MORADOR` | Usuário autenticado vinculado a uma república ativa. Pode visualizar o saldo e extrato do caixa comunitário, registrar pagamento de sua mensalidade, solicitar reembolso de compras feitas para a casa, controlar entrada/saída de materiais, criar/concluir tarefas domésticas, acumular pontos no ranking mensal, registrar problemas no imóvel, agendar eventos/espaços comuns e criar/votar em enquetes. |
| **Administrador da República** | `ROLE_ADMIN` | É o morador que criou a república no sistema (ou para quem a administração foi transferida). Possui **todas** as permissões de `ROLE_MORADOR`, acrescidas de poderes de governança: gerar código/link de convite, gerenciar membros (aprovar entrada, remover moradores sem pendências financeiras, transferir admin), configurar o valor da mensalidade fixa de cada morador/quarto, confirmar recebimento de mensalidades, lançar despesas pagas diretamente pelo caixa da casa, aprovar/rejeitar pedidos de reembolso (via Pix do caixa ou abatimento na mensalidade seguinte), criar rateios extras e auditar/estornar pontos de tarefas não cumpridas. |

> [!NOTE]
> **Regra de Unicidade de Vínculo**: Cada usuário ativo no sistema pode estar vinculado a **apenas 1 (uma) república ativa por vez**, garantindo foco na governança e integridade dos saldos financeiros e rankings.

## 3. Partes Interessadas Não-Usuárias (Stakeholders Externos e Equipe)

- **Proprietários de Imóveis e Imobiliárias (Stakeholder Externo Indireto)**: Não possuem conta ou login no aplicativo, mas são beneficiados diretamente pelos relatórios estruturados (PDF/link com fotos e histórico de manutenção) exportados pelos moradores através do módulo de Problemas no Imóvel.
- **Equipe de Engenharia e Produto**: Composta por 6 integrantes (Gerente de Projeto, Product Owner, Scrum Master, Desenvolvedores Full-Stack, UI/UX Designer e QA/Testador) responsáveis pela especificação, implementação e qualidade do software.

## 4. Ambiente do Usuário

- **Dispositivos**: Smartphones (Android e iOS) para uso rápido no dia a dia (mercado, limpeza, consulta rápida) e Desktops/Notebooks para visualização detalhada de relatórios e gestão administrativa.
- **Plataforma de Acesso**: Navegadores web modernos (Chrome, Safari, Edge, Firefox) com suporte a instalação como **PWA (Progressive Web App)**.
