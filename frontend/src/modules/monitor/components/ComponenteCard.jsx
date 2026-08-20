import { Box, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import EstadoChip from './EstadoChip.jsx';

/** Tarjeta de un componente del ISBD (Procesos / Memoria / Archivos). */
export default function ComponenteCard({ icon, titulo, componente, to }) {
  return (
    <Paper
      variant="outlined"
      {...(to ? { component: RouterLink, to } : {})}
      sx={{
        p: 2.5,
        borderRadius: 2,
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        ...(to && {
          transition: 'border-color 150ms ease, background-color 150ms ease',
          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }),
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
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
    </Paper>
  );
}
