import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import BarraHorizontal from './BarraHorizontal.jsx';

export default function MadurezChart({ controles }) {
  const evaluados = controles.filter((c) => c.nivel_madurez !== null);
  const sinEvaluar = controles.filter((c) => c.nivel_madurez === null);

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
              valor={c.nivel_madurez}
              max={5}
              etiqueta={`${c.nivel_madurez}`}
              tooltip={`${c.codigo} ${c.nombre} — nivel ${c.nivel_madurez} de 5${c.nivel_nombre ? ` (${c.nivel_nombre})` : ''}. Peso ${c.peso}.`}
            />
          </Box>
        ))}

        {evaluados.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Ningún control tiene su nivel de madurez declarado todavía.
          </Typography>
        )}

        {sinEvaluar.length > 0 && (
          <Typography variant="caption" color="text.disabled">
            Sin nivel declarado: {sinEvaluar.map((c) => c.codigo).join(', ')}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
