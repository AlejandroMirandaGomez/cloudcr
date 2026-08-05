import { Chip } from '@mui/material';
import { formatearPorcentaje } from '../lib/cumplimiento.js';

const COLOR_MAP = {
  rojo: 'error',
  amarillo: 'warning',
  verde: 'success',
  sin_datos: 'default',
};

export default function CumplimientoChip({ valor, color }) {
  return (
    <Chip
      size="small"
      label={formatearPorcentaje(valor)}
      color={COLOR_MAP[color] ?? 'default'}
      variant={color === 'sin_datos' ? 'outlined' : 'filled'}
    />
  );
}
