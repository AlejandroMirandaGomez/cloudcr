import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Container, Stack, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DnsIcon from '@mui/icons-material/Dns';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import { CardsSkeleton } from '../../../common/components/loading/Skeletons.jsx';
import IndiceSaludCard from '../components/IndiceSaludCard.jsx';
import ComponenteCard from '../components/ComponenteCard.jsx';
import AlertasPanel from '../components/AlertasPanel.jsx';
import { getIndiceSalud, getAlertasSalud } from '../services/monitor.js';

/**
 * Fase 2 - Monitor de Salud de Base de Datos. Prueba de concepto de
 * front + back con datos simulados (ver claude.md): no toca PostgreSQL ni
 * una conexion Oracle real, solo maqueta el ISBD = Wp*IP + Wm*IM + Wa*IA
 * propuesto por el documento del profesor para poder mostrarlo al equipo.
 * Recibe baseDatosId desde /monitor/:baseDatosId (elegido en
 * MonitorSelectorPage) para identificar cual base se esta mostrando; los
 * valores simulados de componentes/ISBD aun no cambian por base.
 */
export default function MonitorPage() {
  const { baseDatosId } = useParams();
  const [indice, setIndice] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    setLoading(true);

    Promise.all([getIndiceSalud(baseDatosId), getAlertasSalud()])
      .then(([i, a]) => {
        if (!activo) return;
        setIndice(i);
        setAlertas(a);
      })
      .catch((e) => activo && setError(e.message))
      .finally(() => activo && setLoading(false));

    return () => {
      activo = false;
    };
  }, [baseDatosId]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" sx={{ mb: 2 }}>
        <Button component={RouterLink} to="/monitor" startIcon={<ArrowBackIcon />} variant="outlined">
          Volver a bases de datos
        </Button>
      </Stack>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Monitor de Salud de Base de Datos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {indice?.base_datos?.nombre ?? 'Prueba de concepto — Fase 2'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          No se pudo cargar el monitor: {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'grid', gap: 2 }}>
          <CardsSkeleton cantidad={1} alto={160} />
          <CardsSkeleton cantidad={3} alto={220} />
          <CardsSkeleton cantidad={1} alto={220} />
        </Box>
      ) : indice ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <IndiceSaludCard isbd={indice.isbd} />

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Componentes
            </Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              <ComponenteCard
                icon={<DnsIcon color="primary" />}
                titulo="Procesos"
                componente={indice.componentes.procesos}
                to={`/monitor/${baseDatosId}/procesos`}
              />
              <ComponenteCard
                icon={<MemoryIcon color="primary" />}
                titulo="Memoria"
                componente={indice.componentes.memoria}
                to={`/monitor/${baseDatosId}/memoria`}
              />
              <ComponenteCard
                icon={<StorageIcon color="primary" />}
                titulo="Archivos"
                componente={indice.componentes.archivos}
                to={`/monitor/${baseDatosId}/archivos`}
              />
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Alertas por componente
            </Typography>
            <AlertasPanel alertas={alertas} />
          </Box>
        </Box>
      ) : null}
    </Container>
  );
}
