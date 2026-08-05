import { createContext, useContext, useState } from 'react';
import { login as authLogin, logout as authLogout, getSession } from '../lib/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSession());

  const login = async (nombre) => {
    const datos = await authLogin(nombre);
    setSession(datos);
    return datos;
  };

  const logout = () => {
    authLogout();
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
