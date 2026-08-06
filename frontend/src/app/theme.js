import { createTheme } from '@mui/material/styles';

/**
 * Tema por modo. Mismo lenguaje visual (morado/azul, botones pildora); el modo
 * oscuro usa carbones tenidos de violeta, nunca negro puro.
 */
export function buildTheme(mode) {
  const dark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: dark ? '#a76bff' : '#7e14ff',
        light: '#c49bff',
        dark: '#5b0db8',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#47bfff',
        light: '#7dd4ff',
        dark: '#0090cc',
        contrastText: dark ? '#0d1117' : '#ffffff',
      },
      background: dark
        ? { default: '#161422', paper: '#1e1b2e' }
        : { default: '#ece8f7', paper: '#ffffff' },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: '"Inter", "Roboto", sans-serif',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 999,
            // feedback tactil al presionar
            '&:active': { transform: 'scale(0.98)' },
            transition: 'transform 120ms ease, background-color 200ms ease, box-shadow 200ms ease',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500 },
        },
      },
    },
  });
}

/** Compatibilidad con imports existentes (modo claro por defecto). */
export const theme = buildTheme('light');
