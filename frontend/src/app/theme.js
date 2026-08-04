import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        primary: {
        main: '#7e14ff',
        light: '#a855f7',
        dark: '#5b0db8',
        contrastText: '#ffffff',
        },
    secondary: {
        main: '#47bfff',
        light: '#7dd4ff',
        dark: '#0090cc',
        contrastText: '#ffffff',
    },
    background: {
        default: '#f8f5ff',
        paper: '#ffffff',
    },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
  },
});
