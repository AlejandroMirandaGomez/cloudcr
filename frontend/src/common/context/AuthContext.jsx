import { createContext, useContext, useState } from 'react';
import {
  login as authLogin,
  logout as authLogout,
  getSession,
  setSession as persistSession,
} from '../lib/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession());

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
