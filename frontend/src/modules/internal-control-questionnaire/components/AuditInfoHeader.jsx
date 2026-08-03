import { Box, Typography } from '@mui/material';
import { AUDITORIA } from '../data/auditoria.js';

const SURFACE = 'hsl(220, 20%, 99%)';
const DIVIDER = 'rgba(0, 0, 0, 0.12)';

function Campo({ label, value }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{ display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function AuditInfoHeader() {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'minmax(0, 0.7fr) minmax(0, 1.6fr) minmax(0, 1.1fr) minmax(0, 0.6fr)',
        },
        p: 2,
        backgroundColor: SURFACE,
        border: '1px solid',
        borderColor: DIVIDER,
        borderRadius: 1,
      }}
    >
      <Campo label="Organización" value={AUDITORIA.organizacion} />
      <Campo label="Área evaluada" value={AUDITORIA.area} />
      <Campo label="Auditor" value={AUDITORIA.auditor} />
      <Campo label="Fecha de la auditoría" value={AUDITORIA.fecha} />
    </Box>
  );
}
