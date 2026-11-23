# Introdução

## 1. Propósito do Documento

Este **Documento de Visão** estabelece o posicionamento estratégico, o escopo funcional e as diretrizes de produto do **RepHelper** — uma plataforma web responsiva (PWA) voltada à gestão centralizada, financeira e operacional de repúblicas estudantis. O objetivo deste artefato é alinhar a visão do produto entre todas as partes interessadas (equipe de engenharia, produto, design e usuários finais), servindo como base conceitual para o [Documento de Requisitos](../documento-de-requisitos/introducao.md) e a [Arquitetura e Modelagem](../arquitetura-e-modelagem/visao-geral-arquitetura.md).

## 2. Contexto e Definições Essenciais

No cenário universitário brasileiro, milhares de estudantes migram de suas cidades de origem e passam a compartilhar imóveis — tradicionalmente denominados **repúblicas estudantis**. A gestão dessas moradias envolve movimentação financeira mensal (aluguel, contas de consumo, fundo de caixa comunitário, compras de reposição e reembolsos), manutenção de estoque doméstico, escalas de limpeza, preservação do imóvel alugado e decisões coletivas.

Para padronizar o vocabulário utilizado ao longo da documentação, adotam-se as seguintes definições:

- **República Estudantil**: Unidade habitacional compartilhada por estudantes universitários, dotada de regras próprias de convivência, rateio fixo mensal e gestão coletiva.
- **Morador (`ROLE_MORADOR`)**: Estudante cadastrado e vinculado a uma única república ativa no sistema, que contribui mensalmente para o caixa da casa, executa tarefas domésticas, consome e repõe materiais e participa das decisões coletivas.
- **Administrador da República (`ROLE_ADMIN`)**: Morador responsável pela criação ou administração atual da república no sistema. Além das atribuições normais de morador, gerencia o Caixa Comunitário, configura as mensalidades individuais, aprova solicitações de reembolso, audita tarefas e administra o quadro de membros.
- **Caixa Comunitário**: Fundo financeiro central da república, abastecido pelas mensalidades fixas dos moradores e utilizado para quitar despesas fixas da casa, manutenções e reembolsos de compras realizadas pelos moradores.

## 3. Referências

- **Censo da Educação Superior (INEP/MEC)**: Dados demográficos sobre matrículas e deslocamento estudantil no ensino superior brasileiro.
- **[Business Case do Projeto](../business-case/problema.md)**: Justificativa de negócio, indicadores de sucesso e análise de mercado.
- **[Documento de Requisitos](../documento-de-requisitos/introducao.md)**: Especificação detalhada de requisitos funcionais (`RF`), não-funcionais (`RNF`), de interface (`RI`) e regras de negócio (`RN`).
- **[Plano Metodológico](../plano-metodologico/introducao.md)**: Organização da equipe, metodologia híbrida (Cascata + Scrum/XP) e roadmap de releases.
