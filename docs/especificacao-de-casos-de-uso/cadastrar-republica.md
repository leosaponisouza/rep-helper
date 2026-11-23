# Caso de Uso [UC02]: Cadastrar República

- **Requisitos Relacionados**: `[RF004]`
- **Regras de Negócio**: `[RN001]`, `[RN002]`, `[RN004]`, `[RN018]`
- **Atores**: Morador autenticado sem vínculo ativo com outra república (torna-se **Administrador `ROLE_ADMIN`**)
- **Pré-condições**: O usuário deve estar autenticado no sistema e não pertencer a nenhuma república ativa (`[RN001]`).
- **Pós-condições**: A república é criada no sistema com seu **Caixa Comunitário** inicializado (com `R$ 0,00` ou com o Saldo Inicial informado), um código único de convite é gerado e o morador criador é vinculado à república com o papel `ROLE_ADMIN` (`[RN002]`).

---

## 1. Fluxo Principal

1. Na tela de Onboarding (ou menu inicial sem república), o usuário seleciona a opção **"Criar Nova República"**.
2. O usuário preenche os dados de configuração da república:
   - **Nome da República** (ex.: *República Vila Olímpia*);
   - **Endereço completo** (CEP, logradouro, número, complemento, cidade/UF);
   - **Quantidade de quartos/vagas**;
   - **Dia padrão de vencimento das mensalidades fixas** (ex.: todo dia `05` ou `10`);
   - **Valor padrão de mensalidade base** (que poderá ser ajustado individualmente por morador/quarto depois);
   - **Saldo Inicial do Caixa Comunitário** (opcional, $\ge \text{R\$ } 0,00$, caso a república já possua fundo acumulado antes de usar o sistema — `[RN004]`);
   - **Chave Pix do Caixa Comunitário** (chave para a qual os moradores transferirão suas mensalidades);
   - **Recompensa do "Morador do Mês"** (opcional, ex.: *Isenção da faxina geral do mês seguinte* ou *Desconto de R$ 30 no caixa*).
3. O usuário confirma a criação clicando em **"Criar República"**.
4. O sistema valida os campos, cria o registro da república, inicializa o **Caixa Comunitário** (gravando uma transação `SALDO_INICIAL` no Livro-Caixa caso o valor inicial seja $> \text{R\$ } 0,00$), gera automaticamente um **Código de Convite** alfanumérico único (ex.: `REP-8F4K9`) e atribui ao usuário criador o perfil `ROLE_ADMIN`.
5. O sistema redireciona o novo Administrador para o **Dashboard da República**, exibindo em destaque o botão para copiar e compartilhar o código/link de convite com os demais moradores da casa.

---

## 2. Fluxos Alternativos e de Exceção

- **FE1 — Usuário já vinculado a uma república ativa (`[RN001]`)**: Caso o usuário já pertença a uma república ativa, o sistema impede a criação e informa que cada usuário só pode participar de uma república ativa por vez.
- **FE2 — Dados obrigatórios ausentes ou inválidos**: Se o dia de vencimento não estiver entre `1` e `28`, o saldo inicial for negativo ou se o nome/endereço estiverem em branco, o sistema destaca os campos inválidos e solicita a correção antes de prosseguir.
