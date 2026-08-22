import { Paper, Skeleton, Stack, Typography } from '@mui/material';
import EstadoChip from './EstadoChip.jsx';

const BORDE = { verde: '#2e7d32', amarillo: '#ed9b00', rojo: '#c62828' };

/**
 * Fila/banner del indice del componente (IP/IM/IA) que encabeza cada tabla
 * de variables: siempre trae su color, coherente con el mismo dato que
 * muestra el dashboard principal (ver claude2.md: "la fila del indice debe
 * de especificar el color").
 */
export default function IndiceComponenteBanner({ titulo, indicador, componente }) {
  if (!componente) {
    return <Skeleton variant="rounded" height={72} sx={{ mb: 2, borderRadius: 2 }} />;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        borderLeft: '5px solid',
        borderLeftColor: BORDE[componente.color] ?? BORDE.verde,
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline' }}>
          <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Índice de {titulo} ({indicador})
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {componente.valor}
            <Typography component="span" variant="body2" sx={{ opacity: 0.6 }}>
              {' '}/ 100
            </Typography>
          </Typography>
        </Stack>
        <EstadoChip color={componente.color} label={componente.estado} size="medium" />
      </Stack>
    </Paper>
  );
}
