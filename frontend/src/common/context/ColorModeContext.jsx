/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { buildTheme } from '../../app/theme.js';

const STORAGE_KEY = 'cloudcr.colorMode';

const ColorModeContext = createContext({ mode: 'light', toggleMode: () => {} });

function modoInicial() {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado === 'light' || guardado === 'dark') return guardado;
  } catch {
    /* storage no disponible */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
}

export function ColorModeProvider({ children }) {
  const [mode, setMode] = useState(modoInicial);

  const valor = useMemo(
    () => ({
      mode,
      toggleMode: () =>
        setMode((prev) => {
          const siguiente = prev === 'light' ? 'dark' : 'light';
          try {
            localStorage.setItem(STORAGE_KEY, siguiente);
          } catch {
            /* storage no disponible */
          }
          return siguiente;
        }),
    }),
    [mode],
  );

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={valor}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  return useContext(ColorModeContext);
}
