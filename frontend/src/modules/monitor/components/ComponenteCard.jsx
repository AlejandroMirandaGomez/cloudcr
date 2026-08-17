import { Box, Paper, Stack, Typography } from '@mui/material';
import BarraHorizontal from '../../reporte/components/BarraHorizontal.jsx';
import EstadoChip from './EstadoChip.jsx';

const COLOR_BARRA = { verde: '#2e7d32', amarillo: '#ed9b00', rojo: '#c62828' };

/** Tarjeta de un componente del ISBD (Procesos / Memoria / Archivos). */
export default function ComponenteCard({ icon, titulo, componente }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {titulo} ({componente.indicador})
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
            {componente.valor}
          </Typography>
        </Box>
        <EstadoChip color={componente.color} label={componente.estado} />
      </Stack>

      <Stack spacing={1.5}>
        {componente.metricas.map((m) => (
          <Box key={m.etiqueta}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
              {m.etiqueta}
            </Typography>
            <BarraHorizontal
              valor={m.valor}
              max={m.limite}
              color={m.valor > m.limite ? COLOR_BARRA.rojo : COLOR_BARRA.verde}
              etiqueta={`${m.valor} ${m.unidad}`}
            />
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}
