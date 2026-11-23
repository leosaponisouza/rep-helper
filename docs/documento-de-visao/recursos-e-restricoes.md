# Recursos e Restrições

## 1. Resumo dos Recursos do Produto (Features de Alto Nível)

1. **Gestão da República e Convites**: Criação de república, geração de código de convite exclusivo, controle de vagas/quartos, transferência de administração e validação de pendências antes do desligamento de moradores.
2. **Caixa Comunitário e Mensalidades Fixas**: Definição do valor mensal por morador, controle de adimplência, anexo de comprovante Pix, confirmação pelo Admin e extrato transparente do saldo da casa.
3. **Fluxo de Reembolso e Rateios Extras**: Lançamento de compras pagas do próprio bolso pelo morador (com foto do cupom/comprovante), aprovação pelo Admin e reembolso via transferência do caixa ou abatimento automático na próxima mensalidade. Suporte a rateios extras para despesas extraordinárias.
4. **Controle de Estoque e Lista de Compras Integrada**: Monitoramento de alimentos e materiais de limpeza/higiene, marcação de itens em falta e conversão direta de itens comprados em solicitação de reembolso.
5. **Calendário de Tarefas e Gamificação**: Tarefas avulsas ou recorrentes (com rodízio automático entre moradores), pontuação por nível de dificuldade, comprovação opcional por foto, auditoria pelo Admin e Ranking Mensal ("Morador do Mês") com recompensa configurável.
6. **Registro de Problemas no Imóvel e Exportação de Vistoria**: Documentação de defeitos estruturais com fotos, urgência e status (*Aberto*, *Em Manutenção*, *Resolvido*), com geração de relatório exportável para a imobiliária/proprietário.
7. **Agenda de Eventos, Reserva de Espaços e Votações**: Agendamento de áreas comuns com validação anti-conflito de horários e módulo de votações/enquetes com prazo de encerramento.
8. **Relatórios Analíticos e Notificações Personalizáveis**: Gráficos de evolução financeira, despesas por categoria e engajamento em tarefas, além de alertas In-App, Web Push e E-mail.

## 2. Restrições do Projeto

### 2.1 Restrições de Arquitetura e Implementação
- **Front-end**: Desenvolvido em **React** (TypeScript/JavaScript) como uma Aplicação Web Responsiva / **PWA**.
- **Back-end**: API RESTful desenvolvida em **Java (Spring Boot)** seguindo arquitetura em camadas.
- **Banco de Dados e Armazenamento**: Banco de dados relacional **PostgreSQL** e serviço de armazenamento de objetos (local em desenvolvimento; compatível com AWS S3 / Cloudinary em produção) para imagens de comprovantes e avarias.

### 2.2 Restrições de Segurança
- Autenticação stateless baseada em **JWT (JSON Web Token)** via Spring Security.
- Senhas armazenadas com algoritmo de hashing forte (**BCrypt**).
- Autorização baseada em papéis (`ROLE_ADMIN` e `ROLE_MORADOR`) e isolamento estrito de dados por república (*multi-tenancy* lógico por `republica_id`).

### 2.3 Restrições de Design e Usabilidade
- Interface *Mobile-First*, minimalista e responsiva, com suporte a temas claro e escuro e conformidade com diretrizes de acessibilidade web (WCAG 2.1 nível AA).
