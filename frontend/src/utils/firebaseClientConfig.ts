// src/utils/firebaseClientConfig.ts
// Compatibilidade mínima após migração para autenticação JWT interna no backend RepHelper.

export const auth = {
  currentUser: null,
};

export const getFreshFirebaseToken = async (): Promise<string> => {
  throw new Error('Autenticação Firebase foi substituída por JWT interno do backend.');
};

export const getCurrentFirebaseUser = () => null;
