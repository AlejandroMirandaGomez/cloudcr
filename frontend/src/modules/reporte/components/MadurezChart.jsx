import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import BarraHorizontal from './BarraHorizontal.jsx';

/**
 * Grafico de barras horizontales: indice de madurez (0-5) por control.
 * Una sola serie → un solo tono (primario de la marca); la magnitud la da la
 * longitud, no el color.
 */
export default function MadurezChart({ controles }) {
  const evaluados = controles.filter((c) => c.indice_madurez !== null);
  const sinEvaluar = controles.filter((c) => c.indice_madurez === null);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      <Stack spacing={1.75}>
        {evaluados.map((c) => (
          <Box key={c.control_id}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
                {c.codigo}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
              >
                {c.nombre}
              </Typography>
              <Chip
                label={`Nivel ${c.nivel_madurez}`}
                size="small"
                variant="outlined"
                sx={{ flexShrink: 0 }}
              />
            </Stack>
            <BarraHorizontal
              valor={c.indice_madurez}
              max={5}
              etiqueta={`${c.indice_madurez.toFixed(2)}`}
              tooltip={`${c.codigo} ${c.nombre} — índice ${c.indice_madurez.toFixed(2)} de 5 (nivel ${c.nivel_madurez}). Cumple ${Math.round(c.tasas.cumple * 100)}%, documentado ${Math.round(c.tasas.documentado * 100)}%, repetible ${Math.round(c.tasas.repetible * 100)}%, evidencia ${Math.round(c.tasas.evidencia * 100)}%.`}
            />
          </Box>
        ))}

        {evaluados.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Ningún control tiene respuestas aplicables todavía.
          </Typography>
        )}

        {sinEvaluar.length > 0 && (
          <Typography variant="caption" color="text.disabled">
            Sin evaluar: {sinEvaluar.map((c) => c.codigo).join(', ')}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
