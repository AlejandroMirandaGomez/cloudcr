import { Box, Paper, Skeleton, Stack } from '@mui/material';

/**
 * Cargadores esqueleto que calcan el layout real (en vez de un spinner
 * generico): la pagina no "salta" cuando llegan los datos.
 */

/** Tabla: barra de herramientas + encabezado + filas. */
export function TableSkeleton({ filas = 6 }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.25, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="circular" width={28} height={28} />
        ))}
      </Box>
      <Box sx={{ px: 2, pb: 1 }}>
        <Skeleton variant="rounded" height={36} sx={{ mb: 1.5 }} />
        {Array.from({ length: filas }, (_, i) => (
          <Skeleton key={i} variant="rounded" height={30} sx={{ mb: 1, opacity: 1 - i * 0.09 }} />
        ))}
      </Box>
    </Paper>
  );
}

/** Rejilla de tarjetas de indicadores. */
export function CardsSkeleton({ cantidad = 3, alto = 104, columnas }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: columnas ?? { xs: '1fr', sm: `repeat(${cantidad}, 1fr)` },
      }}
    >
      {Array.from({ length: cantidad }, (_, i) => (
        <Skeleton key={i} variant="rounded" height={alto} />
      ))}
    </Box>
  );
}

/** Ficha/detalle: titulo + parrafos + bloques. */
export function DetalleSkeleton() {
  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      <Skeleton variant="rounded" width={160} height={36} sx={{ mb: 3 }} />
      <Skeleton variant="text" width="55%" height={44} />
      <Skeleton variant="text" width="35%" />
      <Stack spacing={2} sx={{ mt: 3 }}>
        <Skeleton variant="rounded" height={110} />
        <Skeleton variant="rounded" height={110} />
        <Skeleton variant="rounded" height={180} />
      </Stack>
    </Box>
  );
}

/** Tarjetas de preguntas del cuestionario. */
export function PreguntasSkeleton({ cantidad = 4 }) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: cantidad }, (_, i) => (
        <Paper key={i} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="70%" />
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Skeleton variant="rounded" width={140} height={32} />
            <Skeleton variant="rounded" width={140} height={32} />
            <Skeleton variant="rounded" width={140} height={32} />
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
