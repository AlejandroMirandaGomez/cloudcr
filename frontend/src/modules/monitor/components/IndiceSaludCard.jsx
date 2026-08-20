import { Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EstadoChip from './EstadoChip.jsx';
import { heroSx } from '../../../common/styles/hero.js';

/**
 * Tarjeta principal: indice de salud combinado (ISBD) con semaforo y el
 * desglose de pesos por componente (Wp/Wm/Wa) que exige el documento base.
 */
export default function IndiceSaludCard({ isbd }) {
  const theme = useTheme();

  return (
    <Paper variant="outlined" sx={{ ...heroSx(theme.palette.mode), borderRadius: 2, p: { xs: 3, sm: 4 } }}>
      <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', position: 'relative' }}>
        <Typography variant="overline" sx={{ opacity: 0.75, fontWeight: 700 }}>
          Indice de Salud de Base de Datos (ISBD)
        </Typography>
        <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1.05 }}>
          {isbd.valor}
          <Typography component="span" variant="h5" sx={{ opacity: 0.6, fontWeight: 700 }}>
            {' '}/ 100
          </Typography>
        </Typography>
        <EstadoChip color={isbd.color} label={isbd.estado} size="medium" />
      </Stack>
    </Paper>
  );
}
