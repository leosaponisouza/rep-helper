# Caso de Uso [UC01]: Cadastrar e Autenticar Usuário

- **Requisitos Relacionados**: `[RF001]`, `[RF002]`, `[RF003]`
- **Regras de Negócio**: `[RN001]`, `[RN017]`
- **Atores**: Novo Usuário / Usuário Cadastrado (`ROLE_MORADOR` ou `ROLE_ADMIN`)
- **Pré-condições**: O usuário possui acesso ao aplicativo via navegador web/PWA.
- **Pós-condições**: A conta do usuário é criada no banco de dados com senha criptografada (BCrypt) e o usuário é autenticado via token JWT.

---

## 1. Fluxo Principal — Cadastro de Novo Usuário (`RF001`)

1. O usuário acessa a tela inicial de Autenticação e seleciona a aba **"Criar Conta"**.
2. O usuário preenche os campos obrigatórios:
   - Nome completo;
   - E-mail;
   - Telefone / WhatsApp;
   - Chave Pix pessoal (utilizada para receber futuros reembolsos do Caixa da República);
   - Senha e confirmação de senha (mínimo de 8 caracteres com letras e números — `[RN017]`).
3. O usuário submete o formulário clicando em **"Cadastrar"**.
4. O sistema valida o formato dos dados e verifica se o e-mail já está em uso no banco de dados.
5. O sistema armazena o usuário com a senha em hash BCrypt, gera o token JWT e autentica o usuário automaticamente.
6. Como o recém-cadastrado ainda não possui república ativa (`[RN001]`), o sistema o direciona para a tela de **Onboarding de República** (onde poderá escolher entre **"Criar Nova República"** `[UC02]` ou **"Entrar com Código de Convite"** `[UC03]`).

---

## 2. Fluxos Alternativos e de Exceção

- **FA1 — Login de Usuário Existente (`RF002`)**:
  1. Na tela de Autenticação, o usuário informa seu e-mail e senha e clica em **"Entrar"**.
  2. O sistema valida as credenciais e retorna o token JWT.
  3. Se o usuário já estiver vinculado a uma república ativa, é redirecionado diretamente para o **Dashboard da República**; caso contrário, vai para a tela de Onboarding.
- **FA2 — Recuperação de Senha (`RF003`)**:
  1. Na tela de Login, o usuário clica em **"Esqueci minha senha"** e informa seu e-mail cadastrado.
  2. O sistema gera um token temporário de redefinição (válido por 30 minutos) e envia o link por e-mail.
  3. O usuário acessa o link, define a nova senha respeitando a `[RN017]` e retorna ao login.
- **FE1 — E-mail já cadastrado**: No passo 4 do Fluxo Principal, caso o e-mail já pertença a outra conta, o sistema exibe o erro *"Este e-mail já está cadastrado. Faça login ou recupere sua senha"* (`HTTP 409 Conflict`).
- **FE2 — Senha fora do padrão de segurança**: No passo 2, caso a senha tenha menos de 8 caracteres ou não contenha letras e números, o formulário bloqueia o envio e destaca a regra `[RN017]`.
