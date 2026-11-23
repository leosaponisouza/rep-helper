# Visão Geral do Produto

O **RepHelper** é uma aplicação web progressiva (**PWA — Progressive Web App**) construída em **React** no front-end e **Java (Spring Boot)** com **PostgreSQL** no back-end. Projetada sob o paradigma *Mobile-First*, oferece experiência nativa tanto em smartphones (Android e iOS, podendo ser instalada na tela inicial) quanto em computadores desktop.

## Diagrama de Contexto do Produto

```mermaid
flowchart TD
    subgraph Usuarios["Usuários da República"]
        M["Morador (ROLE_MORADOR)"]
        A["Administrador (ROLE_ADMIN)"]
    end

    subgraph RepHelper["Plataforma RepHelper (PWA React + API Spring Boot)"]
        FIN["Módulo Financeiro\n(Caixa, Mensalidades, Reembolsos e Rateios)"]
        EST["Módulo de Materiais\n(Estoque e Lista de Compras)"]
        TAR["Módulo de Tarefas e Gamificação\n(Rodízio, Pontos e Ranking Mensal)"]
        IMO["Módulo de Imóvel\n(Problemas, Fotos e Relatório de Vistoria)"]
        CON["Módulo de Convivência\n(Eventos, Espaços Comuns e Votações)"]
        REL["Dashboards, Relatórios\ne Notificações"]
    end

    subgraph Externo["Atores e Serviços Externos"]
        IMO_EXT["Imobiliária / Proprietário\n(Recebe Relatório Exportado)"]
        MAIL["Serviço de E-mail / Web Push"]
        S3["Storage de Arquivos\n(Fotos e Comprovantes)"]
    end

    M --> FIN & EST & TAR & IMO & CON & REL
    A --> FIN & EST & TAR & IMO & CON & REL
    EST -->|Reposição gera pedido| FIN
    IMO -->|Exporta PDF / Resumo| IMO_EXT
    RepHelper --> MAIL
    RepHelper --> S3
```

## Principais Pilares de Valor

1. **Transparência Financeira Realista**: Substitui planilhas confusas pelo modelo real de **Caixa Comunitário + Mensalidades + Reembolsos aprovados pelo Admin**.
2. **Engajamento sem Atrito**: Transforma obrigações domésticas em uma dinâmica justa e mensurável por meio de rodízios automáticos e **Gamificação mensal**.
3. **Rastreabilidade e Segurança Jurídica**: Preserva o histórico de problemas estruturais do imóvel com fotos datadas para proteger os estudantes perante imobiliárias.
4. **Democracia Interna**: Centraliza enquetes, reservas de espaços e eventos da casa em um único ambiente.
