import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const DESTINO = '/';

/**
 * Cierra la sesion y deja al usuario en la pagina principal.
 *
 * El orden importa: si se limpiara la sesion estando todavia en una ruta
 * protegida, ProtectedRoute alcanzaria a redirigir al login antes de que se
 * aplique la navegacion. Por eso primero se navega a la pagina publica y la
 * sesion se cierra recien cuando esa navegacion ya esta en pantalla.
 */
export default function useCerrarSesion() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pendiente = useRef(false);

  useEffect(() => {
    if (pendiente.current && pathname === DESTINO) {
      pendiente.current = false;
      logout();
    }
  }, [pathname, logout]);

  return useCallback(() => {
    // Ya estamos en una ruta publica: no hay guard que esquivar ni navegacion
    // que esperar, asi que la sesion se cierra de una vez.
    if (pathname === DESTINO) {
      logout();
      return;
    }

    pendiente.current = true;
    navigate(DESTINO, { replace: true });
  }, [navigate, pathname, logout]);
}
