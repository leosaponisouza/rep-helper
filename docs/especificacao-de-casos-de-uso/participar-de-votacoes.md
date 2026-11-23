# Caso de Uso [UC13]: Criar e Participar de Votações (Enquetes)

- **Requisitos Relacionados**: `[RF023]`
- **Regras de Negócio**: `[RN014]`, `[RN015]`
- **Atores**: Morador (`ROLE_MORADOR`) / Administrador (`ROLE_ADMIN`)
- **Pré-condições**: O usuário deve estar autenticado e vinculado a uma república ativa.
- **Pós-condições**: A enquete é criada na república ou o voto único do morador é computado até o prazo de encerramento.

---

## 1. Fluxo Principal — Criar Nova Votação e Registrar Voto

1. O morador acessa **"Convivência > Votações e Enquetes"**.
2. Para abrir uma nova decisão coletiva, o morador clica em **"Nova Votação"** e preenche:
   - **Título da Pauta** (ex.: *Trocar o plano de internet para 600 Mega?*);
   - **Descrição / Justificativa**;
   - **Opções de Voto** (mínimo de 2 opções, ex.: *Sim, aprovo*, *Não, manter atual*, *Abstenção*);
   - **Data e Hora limite de encerramento**.
3. O sistema publica a votação com status `ABERTA` e envia notificação para todos os moradores da república.
4. Para votar, qualquer morador seleciona a enquete aberta, escolhe sua opção e clica em **"Confirmar Voto"**.
5. O sistema valida que a enquete está dentro do prazo (`[RN014]`), registra o voto do morador e atualiza as barras de progresso percentual do resultado parcial.
6. Quando todos os moradores ativos já tiverem votado ou quando o `prazo_encerramento` for atingido, o sistema altera o status da votação para `ENCERRADA`, destaca a opção vencedora e notifica a república.

---

## 2. Fluxos Alternativos e de Exceção

- **FA1 — Alterar voto antes do encerramento (`[RN014]`)**: Enquanto a votação estiver `ABERTA` e dentro do prazo, o morador pode selecionar outra opção e clicar em **"Atualizar Meu Voto"**, substituindo seu voto anterior (mantendo sempre no máximo 1 voto por morador).
- **FE1 — Tentativa de votar após o encerramento**: Se o prazo de encerramento já tiver expirado, o botão de votação fica desabilitado e o sistema exibe apenas o resultado final consolidado.
