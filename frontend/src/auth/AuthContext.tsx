import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AxiosError } from 'axios';
import { api } from '../lib/api';

export interface Usuario {
  codusuario: string;
  nome: string;
  isAdmin: boolean;
  permissoes: string[];
}

interface AuthContextValue {
  usuario: Usuario | null;
  carregando: boolean;
  login: (codusuario: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  temPermissao: (chave: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api
      .get<Usuario>('/auth/me')
      .then((res) => setUsuario(res.data))
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false));
  }, []);

  const login = useCallback(async (codusuario: string, senha: string) => {
    const res = await api.post<Usuario>('/auth/login', { codusuario, senha });
    setUsuario(res.data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUsuario(null);
    }
  }, []);

  const temPermissao = useCallback(
    (chave: string) => {
      // Só decide o que mostrar na interface — o backend valida de novo,
      // de verdade, em cada endpoint (ver middlewares/authorize.ts).
      return usuario?.permissoes.includes(chave) ?? false;
    },
    [usuario],
  );

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout, temPermissao }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de um AuthProvider');
  return ctx;
}

export function isAxiosErrorWithMessage(err: unknown): err is AxiosError<{ error: string }> {
  return err instanceof AxiosError && typeof err.response?.data?.error === 'string';
}
