/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import {
  AUTH_KEY,
  login as authLogin,
  logout as authLogout,
  getSession,
  setSession as persistSession,
} from '../lib/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession());

  /**
   * La sesion vive en localStorage: si otra pestaña inicia o cierra sesion,
   * esta pestaña refleja el mismo estado en vez de quedarse desincronizada y
   * "perder" la sesion al recargar.
   */
  useEffect(() => {
    const sincronizar = (evento) => {
      if (evento.key !== null && evento.key !== AUTH_KEY) return;
      setSessionState(getSession());
    };

    window.addEventListener('storage', sincronizar);
    return () => window.removeEventListener('storage', sincronizar);
  }, []);

  const login = async (correo, contrasena, tipo) => {
    const datos = await authLogin(correo, contrasena, tipo);
    setSessionState(datos);
    return datos;
  };

  const logout = () => {
    authLogout();
    setSessionState(null);
  };

  /** Actualiza la sesion en memoria y en storage tras editar el perfil. */
  const updateSession = (cambios) => {
    const datos = persistSession({ ...session, ...cambios });
    setSessionState(datos);
    return datos;
  };

  return (
    <AuthContext.Provider value={{ session, login, logout, updateSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
