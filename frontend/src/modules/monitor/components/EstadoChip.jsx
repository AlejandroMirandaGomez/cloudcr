import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * Semaforo de 5 estados del Monitor de Salud (Optimo..Critico). Mismo
 * criterio que SemaforoChip de reporte/: el texto del estado siempre
 * acompana al color, nunca es la unica senal.
 */
const ESTILO = {
  light: {
    verde:     { bg: '#e8f5e9', fg: '#1b5e20', borde: '#a5d6a7' },
    amarillo:  { bg: '#fff8e1', fg: '#7a4f01', borde: '#ffe082' },
    rojo:      { bg: '#ffebee', fg: '#b71c1c', borde: '#ef9a9a' },
  },
  dark: {
    verde:     { bg: 'rgba(102,187,106,0.16)', fg: '#a5d6a7', borde: 'rgba(102,187,106,0.5)' },
    amarillo:  { bg: 'rgba(255,193,7,0.14)',   fg: '#ffd54f', borde: 'rgba(255,193,7,0.45)' },
    rojo:      { bg: 'rgba(239,83,80,0.16)',   fg: '#ef9a9a', borde: 'rgba(239,83,80,0.5)' },
  },
};

export default function EstadoChip({ color = 'verde', label, size = 'small' }) {
  const { palette } = useTheme();
  const estilos = ESTILO[palette.mode] ?? ESTILO.light;
  const estilo = estilos[color] ?? estilos.verde;
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
