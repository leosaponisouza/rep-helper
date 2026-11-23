# Caso de Uso [UC10]: Registrar Problema no Imóvel e Exportar Relatório de Vistoria

- **Requisitos Relacionados**: `[RF019]`, `[RF020]`
- **Regras de Negócio**: `[RN012]`, `[RN015]`, `[RN016]`
- **Atores**: Morador (`ROLE_MORADOR`) / Administrador (`ROLE_ADMIN`)
- **Pré-condições**: O usuário deve estar autenticado e vinculado a uma república ativa.
- **Pós-condições**: O problema estrutural/técnico é registrado no histórico da república com fotos e status atualizado, podendo ser exportado em PDF/resumo para envio externo à imobiliária ou proprietário.

---

## 1. Fluxo Principal — Registrar e Acompanhar Problema no Imóvel (`RF019`)

1. O morador acessa **"Imóvel > Problemas e Manutenção"** e clica em **"Registrar Novo Problema"**.
2. O morador preenche as informações da ocorrência:
   - **Título do problema** (ex.: *Infiltração no teto da lavanderia*);
   - **Cômodo / Localização** (ex.: *Lavanderia / Área Externa*);
   - **Descrição detalhada** do defeito observado;
   - **Nível de Urgência**: `Baixa`, `Média`, `Alta` ou `Crítica`;
   - **Fotos comprobatórias** (capturadas pela câmera ou enviadas da galeria — `[RN016]`).
3. O morador confirma o registro clicando em **"Salvar Problema"**.
4. O sistema salva o registro com data/hora exata, autor do relato e status inicial `ABERTO` (`[RN012]`), notificando os moradores da república.
5. Conforme o reparo avança, o Administrador (ou morador responsável) atualiza o status do chamado para `EM_MANUTENCAO` e, posteriormente, para `RESOLVIDO`, registrando observações sobre a solução adotada.

---

## 2. Fluxo Alternativo — Exportar Relatório para a Imobiliária / Proprietário (`RF020`)

*(Como a imobiliária/proprietário não possui login no sistema, os moradores exportam o laudo documentado para enviar por WhatsApp ou e-mail).*

1. Na tela **"Imóvel > Problemas e Manutenção"**, o usuário seleciona um problema específico (ou filtra todos os problemas com status `ABERTO` / histórico geral de vistoria).
2. O usuário clica em **"Exportar Relatório para Imobiliária (PDF / Resumo)"**.
3. O sistema gera um documento formatado contendo o nome e endereço da república, data de emissão, descrição técnica de cada problema, nível de urgência, data original em que foi constatado e as fotos anexadas.
4. O usuário faz o download do PDF ou copia o resumo formatado para encaminhar diretamente ao proprietário ou imobiliária.

---

## 3. Fluxos de Exceção

- **FE1 — Foto em formato ou tamanho inválido (`[RN016]`)**: Se o usuário tentar anexar um arquivo que não seja imagem (`JPG`, `PNG`, `WEBP`) ou que ultrapasse `5 MB`, o sistema bloqueia o upload e orienta o envio de uma imagem válida.
