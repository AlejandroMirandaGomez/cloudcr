import { Box, Paper, Stack, Typography } from '@mui/material';
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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={3}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, position: 'relative' }}
      >
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.75, fontWeight: 700 }}>
            Indice de Salud de Base de Datos (ISBD)
          </Typography>
          <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1.05 }}>
            {isbd.valor}
            <Typography component="span" variant="h5" sx={{ opacity: 0.6, fontWeight: 700 }}>
              {' '}/ 100
            </Typography>
          </Typography>
          <Box sx={{ mt: 1 }}>
            <EstadoChip color={isbd.color} label={isbd.estado} size="medium" />
          </Box>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Stack spacing={0.5} sx={{ minWidth: 220 }}>
          <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 700, textTransform: 'uppercase' }}>
            Pesos por componente
          </Typography>
          {[
            ['Procesos (Wp)', isbd.pesos.procesos],
            ['Memoria (Wm)', isbd.pesos.memoria],
            ['Archivos (Wa)', isbd.pesos.archivos],
          ].map(([label, peso]) => (
            <Stack key={label} direction="row" justifyContent="space-between" sx={{ fontSize: '0.875rem' }}>
              <span>{label}</span>
              <strong>{Math.round(peso * 100)}%</strong>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}
