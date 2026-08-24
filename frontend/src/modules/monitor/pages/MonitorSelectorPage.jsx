import { useCallback } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert, AlertTitle, Box, Button, Chip, Container, Stack, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SensorsIcon from '@mui/icons-material/Sensors';
import { CardsSkeleton } from '../../../common/components/loading/Skeletons.jsx';
import BaseDatosCard from '../components/BaseDatosCard.jsx';
import useSondeo from '../hooks/useSondeo.js';
import { REFRESCO_MS } from '../lib/refresco.js';
import { getBasesDatosMonitoreadas } from '../services/monitor.js';

/**
 * Pantalla selectora del monitor: lista las bases monitoreadas antes de entrar
 * al dashboard de una base concreta en /monitor/:baseDatosId.
 *
 * Las bases no se dan de alta aqui. Aparecen solas cuando el collector local
 * (collector/) empuja su primer snapshot: es el collector quien tiene las
 * credenciales de Oracle, no el monitor. El alta se hace desde el mock client
 * local, ver collector/README.md.
 */
export default function MonitorSelectorPage() {
  const navigate = useNavigate();

  const consultar = useCallback(() => getBasesDatosMonitoreadas(), []);
  const { datos, error, cargando } = useSondeo(consultar, []);
  const basesDatos = datos ?? [];

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ mb: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} variant="outlined">
          Volver al inicio
        </Button>
        <Chip
          icon={<SensorsIcon />}
          label={`En vivo · cada ${Math.round(REFRESCO_MS / 1000)} s`}
          color={error ? 'default' : 'success'}
          variant="outlined"
          size="small"
        />
      </Stack>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Monitor de Salud de Base de Datos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Seleccione una base de datos monitoreada para ver su dashboard de salud.
      </Typography>

      {error && (
        <Alert severity={basesDatos.length ? 'warning' : 'error'} sx={{ mb: 3, borderRadius: 2 }}>
          No se pudo cargar el listado de bases de datos: {error}
        </Alert>
      )}

      {cargando ? (
        <CardsSkeleton cantidad={4} alto={120} columnas={{ xs: '1fr', md: 'repeat(2, 1fr)' }} />
      ) : basesDatos.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <AlertTitle>No hay bases de datos monitoreadas</AlertTitle>
          Las bases se registran desde el collector local, que es el que se conecta
          al motor de base de datos y envía las métricas. Levante el collector y el
          mock client en la máquina donde vive la base y regístrela desde ahí; en
          cuanto llegue el primer snapshot aparecerá en esta lista.
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
          {basesDatos.map((bd) => (
            <BaseDatosCard key={bd.id} baseDatos={bd} onClick={() => navigate(`/monitor/${bd.id}`)} />
          ))}
        </Box>
      )}
    </Container>
  );
}
