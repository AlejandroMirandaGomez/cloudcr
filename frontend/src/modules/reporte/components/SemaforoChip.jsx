import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * Colores de estado del semaforo (reservados para riesgo/cumplimiento, nunca
 * para series). Siempre acompanados del texto del nivel: la identidad no
 * depende solo del color.
 */
const ESTILO = {
  light: {
    verde:     { bg: '#e8f5e9', fg: '#1b5e20', borde: '#a5d6a7' },
    amarillo:  { bg: '#fff8e1', fg: '#7a4f01', borde: '#ffe082' },
    rojo:      { bg: '#ffebee', fg: '#b71c1c', borde: '#ef9a9a' },
    sin_datos: { bg: 'transparent', fg: 'rgba(0,0,0,0.6)', borde: 'rgba(0,0,0,0.23)' },
  },
  dark: {
    verde:     { bg: 'rgba(102,187,106,0.16)', fg: '#a5d6a7', borde: 'rgba(102,187,106,0.5)' },
    amarillo:  { bg: 'rgba(255,193,7,0.14)',   fg: '#ffd54f', borde: 'rgba(255,193,7,0.45)' },
    rojo:      { bg: 'rgba(239,83,80,0.16)',   fg: '#ef9a9a', borde: 'rgba(239,83,80,0.5)' },
    sin_datos: { bg: 'transparent', fg: 'rgba(255,255,255,0.6)', borde: 'rgba(255,255,255,0.25)' },
  },
};

export default function SemaforoChip({ color = 'sin_datos', label, size = 'small' }) {
  const { palette } = useTheme();
  const estilos = ESTILO[palette.mode] ?? ESTILO.light;
  const estilo = estilos[color] ?? estilos.sin_datos;
  return (
    <Chip
      label={label}
      size={size}
      variant="outlined"
      sx={{
        fontWeight: 600,
        backgroundColor: estilo.bg,
        color: estilo.fg,
        borderColor: estilo.borde,
      }}
    />
  );
}
