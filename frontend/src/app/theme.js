import { createTheme } from '@mui/material/styles';

/**
 * Tema por modo. Paleta acento teal: el tono cambia de intensidad segun el
 * modo (oscuro en claro, brillante en oscuro) para mantener contraste contra
 * el fondo, nunca cambia de matiz. Botones pildora en ambos modos.
 */
export function buildTheme(mode) {
  const dark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: dark ? '#5dcaa5' : '#0f6e56',
        light: dark ? '#8fe0c4' : '#3d9c82',
        dark: dark ? '#3d9b7c' : '#0a4f3d',
        contrastText: dark ? '#0b2a22' : '#ffffff',
      },
      secondary: {
        main: dark ? '#4fd1c5' : '#2ba98a',
        light: dark ? '#84e3da' : '#5fc7ac',
        dark: dark ? '#2e9e93' : '#1d7a63',
        contrastText: dark ? '#0b2a22' : '#ffffff',
      },
      background: dark
        ? { default: '#121212', paper: '#242424' }
        : { default: '#f5f1e8', paper: '#ffffff' },
      text: dark
        ? { primary: '#f0ede6', secondary: 'rgba(240,237,230,0.7)' }
        : { primary: '#1a1a1a', secondary: 'rgba(26,26,26,0.6)' },
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
