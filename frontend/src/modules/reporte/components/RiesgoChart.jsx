import { Box, Paper, Stack, Typography } from '@mui/material';
import BarraHorizontal from './BarraHorizontal.jsx';
import SemaforoChip from './SemaforoChip.jsx';

const DIMENSION_LABEL = {
  confidencialidad: 'Confidencialidad',
  integridad: 'Integridad',
  disponibilidad: 'Disponibilidad',
};

const COLOR_BARRA = {
  verde: '#2e7d32',
  amarillo: '#ed9b00',
  rojo: '#c62828',
  sin_datos: 'rgba(0,0,0,0.25)',
};

const NIVEL_LABEL = { bajo: 'Riesgo bajo', medio: 'Riesgo medio', alto: 'Riesgo alto', sin_datos: 'Sin datos' };

/** Exposicion al riesgo por dimension C/I/D, con semaforo + etiqueta textual. */
export default function RiesgoChart({ dimensiones }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      <Stack spacing={2}>
        {dimensiones.map((d) => (
          <Box key={d.dimension}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
                {DIMENSION_LABEL[d.dimension] ?? d.dimension}
              </Typography>
              <SemaforoChip color={d.color} label={NIVEL_LABEL[d.nivel_riesgo] ?? d.nivel_riesgo} />
            </Stack>
            <BarraHorizontal
              valor={d.exposicion}
              max={1}
              color={COLOR_BARRA[d.color] ?? COLOR_BARRA.sin_datos}
              etiqueta={d.exposicion == null ? 'Sin datos' : `${(d.exposicion * 100).toFixed(1)}%`}
              tooltip={
                d.exposicion == null
                  ? 'Ningún control evaluado aporta a esta dimensión.'
                  : `Exposición ponderada por peso y relevancia sobre ${d.controles_considerados} ${d.controles_considerados === 1 ? 'control' : 'controles'}.`
              }
            />
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}
