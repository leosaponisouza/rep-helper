# Requisitos de Interface

Os Requisitos de Interface (`[RIxxx]`) definem os padrões de experiência do usuário (UX), interface visual (UI), responsividade e interação do **RepHelper**.

---

### [RI001] Design Responsivo Mobile-First e Suporte a PWA
A interface deve ser projetada sob a abordagem *Mobile-First*, adaptando-se perfeitamente a telas de smartphones (a partir de `360px` de largura), tablets e monitores desktop (`1280px+`). Deve incluir `manifest.json` e *Service Worker* para permitir que o morador instale o **RepHelper** na tela inicial do celular como um aplicativo (**PWA**).
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

---

### [RI002] Navegação Intuitiva com Barra Inferior no Mobile e Sidebar no Desktop
- **Em dispositivos móveis**: Deve apresentar uma barra de navegação inferior fixa (*Bottom Navigation Bar*) com acesso rápido de 1 toque às 5 áreas mais utilizadas: **Início (Dashboard)**, **Caixa/Finanças**, **Tarefas & Ranking**, **Estoque/Compras** e **Mais (Eventos, Votações, Imóvel, Configurações)**.
- **Em telas desktop**: A navegação converte-se automaticamente em um menu lateral fixo (*Sidebar*).
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

---

### [RI003] Dashboard Centralizado de Visão Rápida
A tela inicial após o login (**Dashboard**) deve exibir em *cards* objetivos:
1. **Saldo atual do Caixa Comunitário** e status da mensalidade do morador no mês corrente (*Paga*, *Pendente* ou *Com desconto de reembolso aplicado*);
2. **Próximas tarefas domésticas** atribuídas ao morador e sua posição atual no **Ranking Mensal**;
3. **Alertas rápidos**: Itens em falta na Lista de Compras, votações abertas pendentes de voto e próximos eventos da casa.
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

---

### [RI004] Estilo Visual Minimalista e Temas Claro/Escuro
A interface deve adotar um design limpo, moderno e sem poluição visual, utilizando códigos de cores semânticos (verde para entradas/tarefas concluídas, âmbar para pendências/aprovações, vermelho para atrasos/problemas críticos) e oferecendo suporte nativo a **Modo Claro (*Light Mode*)** e **Modo Escuro (*Dark Mode*)**.
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

---

### [RI005] Acessibilidade Web (WCAG 2.1 AA)
Os componentes de interface devem respeitar contraste mínimo de cores ($4.5:1$ para textos normais), tamanhos de alvo de toque mínimos de $44 \times 44\text{ px}$ em dispositivos móveis, rótulos semânticos (`aria-label`) para leitores de tela e navegação completa via teclado no desktop.
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

---

### [RI006] Fluxo Simplificado de Upload de Fotos e Comprovantes
Nos formulários de pagamento de mensalidade, solicitação de reembolso, conclusão de tarefa e registro de problema no imóvel, o componente de upload deve permitir capturar foto diretamente pela câmera do smartphone ou selecionar arquivo da galeria com pré-visualização imediata (*preview*).
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

---

### [RI007] Copiar Chave Pix com Um Toque (Copy-to-Clipboard)
Nas telas de pagamento de mensalidade fixa (para o morador pagar ao Caixa) e de liquidação de reembolso via Pix (para o Admin transferir ao morador), o sistema deve exibir um botão **"Copiar Chave Pix"** com feedback visual imediato (*toast notification*), facilitando o pagamento no aplicativo bancário do usuário.
- **Prioridade**: 🗹 Essencial ◻ Importante ◻ Desejável

---

### [RI008] Visualização Gráfica e Exportação Amigável
Os relatórios financeiros, de tarefas e de problemas no imóvel devem utilizar gráficos interativos legíveis em telas móveis e oferecer botão direto de **Exportar / Compartilhar (PDF ou Resumo)** formatado para leitura imediata por terceiros (como imobiliárias e proprietários).
- **Prioridade**: ◻ Essencial 🗹 Importante ◻ Desejável
