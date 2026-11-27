# Serviços de API — Alpendre (`frontend/src/services`)

Este diretório centraliza a comunicação HTTP do cliente **Alpendre** (Expo / React Native / Web) com a API REST **Spring Boot 3.4** (`/api/v1/*`), utilizando autenticação **100% interna via JWT + Refresh Token rotativo** (sem dependências de Firebase Auth ou Supabase Storage).

---

## Catálogo de Serviços

| Arquivo / Módulo | Endpoints Consumidos | Responsabilidade |
| :--- | :--- | :--- |
| `api.ts` | Base Axios + `/api/v1/auth/refresh` | Instância Axios com validação HTTPS em produção (`assertSecureApiUrl`), injeção de `Authorization: Bearer <token>` e fila automática de renovação de token em respostas `401`. |
| `authService.ts` | `/api/v1/auth/*` | Cadastro (`signup`), login por credenciais (`login`), Google OAuth direto (`google`), rotação de sessão (`refresh`), troca de senha (`change-password`), recuperação por código de 6 dígitos (`forgot-password` / `reset-password`) e `logout`. |
| `houseService.ts` | `/api/v1/houses/*` | Criação de casa com preset/regras e endereço opcional, entrada por código (`join`), atualização de regras e dados da casa, listagem/gestão de moradores e regeneração de código de convite. |
| `taskService.ts` | `/api/v1/tasks/*` | CRUD de tarefas, filtros paginados (`filter` / `assigned/filter`), conclusão idempotente de tarefas recorrentes (`complete`), cancelamento e atribuição de moradores. |
| `financesService.ts` | `/api/v1/expenses/*`, `/api/v1/incomes/*`, `/api/v1/financial-dashboard/*`, `/api/v1/finances/*` | Gestão adaptável de despesas (modo **Acompanhar Gastos** vs. **Caixinha**), entradas, resumo financeiro, série histórica mensal e ajuste manual de saldo. |
| `events/eventsService.ts` | `/api/v1/events/*` | CRUD de eventos da agenda com suporte a confirmação de presença opcional (`requireRsvp`), convites (`invite`) e resposta de participação (`respond`). |
| `calendar/calendarService.ts` | Nativo (`expo-calendar`) | Sincronização opcional de compromissos da casa com o calendário local do dispositivo (Google Calendar / Samsung Calendar / iOS). |
| `notificationApiService.ts` | `/api/v1/notifications/*` | Listagem de notificações, contador de não lidas, marcação individual/em lote e limpeza de histórico antigo. |
| `supabase.ts` | `/api/v1/media/{bucket}` | Compressão local de imagens (`600px` JPEG) e upload/remoção autenticada no volume local da VPS (`avatars` e `receipts`), mantendo validação contra path traversal e SSRF. |

---

## Fluxo de Sessão e Renovação Automática

1. No login ou cadastro, `authService.ts` armazena `token` (access token de curta duração), `refreshToken` (rotativo) e `user` (incluindo `currentHouseId` e `isAdmin`) via `storage.ts` (`expo-secure-store` no mobile).
2. Todas as chamadas protegidas enviam `Authorization: Bearer <token>`.
3. Ao receber `401 Unauthorized` fora das rotas de autenticação, `api.ts` enfileira requisições concorrentes, chama `POST /api/v1/auth/refresh`, persiste o novo par `{ token, refreshToken }` e reexecuta transparentemente as chamadas pendentes.

---

## Exemplo de Uso com Design System (`useAuth` + `useFeedback`)

> **Guardrail do Design System:** Nunca utilize o modal nativo de alerta do React Native; utilize sempre `useFeedback` (`toast`) ou banners do Design System para exibir feedbacks ao morador.

```tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Screen, TextField, useFeedback } from '../design-system';

export const ExampleLoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loginWithCredentials, loading } = useAuth();
  const { toast } = useFeedback();

  const handleLogin = async () => {
    try {
      await loginWithCredentials(email, password);
    } catch (err: any) {
      toast({
        title: 'Falha ao entrar',
        message: err?.message || 'Verifique suas credenciais e tente novamente.',
        tone: 'danger',
      });
    }
  };

  return (
    <Screen scroll keyboardAvoiding>
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureToggle
      />
      <Button
        label="Entrar no Alpendre"
        variant="primary"
        loading={loading}
        onPress={() => void handleLogin()}
      />
    </Screen>
  );
};
```
