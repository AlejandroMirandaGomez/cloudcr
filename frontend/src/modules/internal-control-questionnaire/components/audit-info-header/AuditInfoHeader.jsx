import { Box, LinearProgress, Typography } from '@mui/material';

function Campo({ label, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{ display: 'block', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {children}
        </Typography>
      ) : children}
    </Box>
  );
}

/** Encabezado con los datos reales de la auditoria (cuestionario) en curso. */
export default function AuditInfoHeader({ cuestionario }) {
  if (!cuestionario) return null;

  const { organizacion, evaluador, fecha, respuestas_registradas, preguntas_en_catalogo, avance } =
    cuestionario;

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 0.7fr) minmax(0, 1fr)',
        },
        p: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Campo label="Organización">{organizacion}</Campo>
      <Campo label="Auditor">{evaluador}</Campo>
      <Campo label="Fecha de la auditoría">{fecha}</Campo>
      <Campo label="Avance">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={Math.round((avance ?? 0) * 100)}
            sx={{ height: 6, borderRadius: 3, flex: 1 }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
            {respuestas_registradas}/{preguntas_en_catalogo}
          </Typography>
        </Box>
      </Campo>
    </Box>
  );
}
