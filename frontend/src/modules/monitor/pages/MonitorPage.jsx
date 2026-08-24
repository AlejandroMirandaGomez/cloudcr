import { useCallback, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Container, Stack, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DnsIcon from '@mui/icons-material/Dns';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SensorsIcon from '@mui/icons-material/Sensors';
import TuneIcon from '@mui/icons-material/Tune';
import { CardsSkeleton } from '../../../common/components/loading/Skeletons.jsx';
import IndiceSaludCard from '../components/IndiceSaludCard.jsx';
import ComponenteCard from '../components/ComponenteCard.jsx';
import AlertasPanel from '../components/AlertasPanel.jsx';
import HistoricoChart from '../components/HistoricoChart.jsx';
import useSondeo from '../hooks/useSondeo.js';
import useUmbralesIndice from '../hooks/useUmbralesIndice.js';
import UmbralesIndiceDialog from '../components/UmbralesIndiceDialog.jsx';
import { REFRESCO_MS } from '../lib/refresco.js';
import { getIndiceSalud, getAlertasSalud, getHistoricoSalud } from '../services/monitor.js';

/**
 * Fase 2 - Monitor de Salud de Base de Datos.
 *
 * Muestra datos en vivo: el collector local lee Oracle y empuja un snapshot a
 * POST /monitor/ingesta, y esta pantalla vuelve a consultar cada REFRESCO_MS
 * (VITE_MONITOR_REFRESCO_MS).
 *
 * El ISBD (promedio simple (IP + IM + IA) / 3) y los tres indicadores salen
 * calculados del backend, que es quien conoce los umbrales vigentes de cada
 * variable: recalcularlos aqui daba numeros distintos a los guardados. Los
 * cortes de color se configuran por base con el boton "Editar parametros".
 *
 * Las alertas se listan aparte del indice a proposito: el documento base exige
 * que una alerta critica individual no quede oculta detras de un promedio alto.
 */
export default function MonitorPage() {
  const { baseDatosId } = useParams();

  const consultar = useCallback(
    () => Promise.all([
      getIndiceSalud(baseDatosId),
      getAlertasSalud(baseDatosId),
      getHistoricoSalud(baseDatosId),
    ]),
    [baseDatosId],
  );

  const { datos, error, cargando } = useSondeo(consultar, [baseDatosId]);
  const [indice, alertas, historico] = datos ?? [null, [], []];
  const caida = indice?.base_datos?.caida === true;

  const { umbrales, guardar: guardarUmbrales } = useUmbralesIndice(baseDatosId);
  const [editandoUmbrales, setEditandoUmbrales] = useState(false);

  const componentes = indice?.componentes ?? {};
  const isbd = indice?.isbd;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" spacing={2} useFlexGap sx={{ mb: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Button component={RouterLink} to="/monitor" startIcon={<ArrowBackIcon />} variant="outlined">
          Volver a bases de datos
        </Button>
        <Stack spacing={1} sx={{ alignItems: 'stretch' }}>
          <Chip
            icon={<SensorsIcon />}
            label={caida ? 'Sin conexión' : `En vivo · cada ${Math.round(REFRESCO_MS / 1000)} s`}
            color={caida || error ? 'default' : 'success'}
            variant="outlined"
            size="small"
            sx={{ justifyContent: 'center' }}
          />
          <Button
            startIcon={<TuneIcon />}
            variant="outlined"
            size="small"
            onClick={() => setEditandoUmbrales(true)}
          >
            Editar parámetros
          </Button>
        </Stack>
      </Stack>

      {editandoUmbrales && (
        <UmbralesIndiceDialog
          umbrales={umbrales}
          onCerrar={() => setEditandoUmbrales(false)}
          onGuardar={guardarUmbrales}
        />
      )}

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Monitor de Salud de Base de Datos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {indice?.base_datos?.nombre ?? 'Cargando…'}
        {indice?.actualizado_en && ` · última medición ${indice.actualizado_en}`}
      </Typography>

      {caida && (
        <Alert
          severity="error"
          icon={false}
          sx={{
            mb: 3, borderRadius: 2, bgcolor: '#1c1c1c', color: '#fff',
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
            ⬛ Base de datos caída — sin conexión
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            {indice.base_datos.caida_motivo || 'El collector no puede leer la instancia.'}
            {' '}Los valores mostrados son la última lectura antes de la caída.
          </Typography>
        </Alert>
      )}

      {error && !caida && (
        <Alert severity={indice ? 'warning' : 'error'} sx={{ mb: 3, borderRadius: 2 }}>
          {indice
            // Ya hay datos en pantalla: se avisa que estan quedando viejos,
            // pero no se borra lo que el evaluador esta viendo.
            ? `No se pudo refrescar el monitor (${error}). Se muestra la última lectura recibida.`
            : `No se pudo cargar el monitor: ${error}`}
        </Alert>
      )}

      {cargando ? (
        <Box sx={{ display: 'grid', gap: 2 }}>
          <CardsSkeleton cantidad={1} alto={160} />
          <CardsSkeleton cantidad={3} alto={220} />
          <CardsSkeleton cantidad={1} alto={220} />
        </Box>
      ) : indice ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {isbd && <IndiceSaludCard isbd={isbd} />}

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Componentes
            </Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              {componentes.procesos && (
                <ComponenteCard
                  icon={<DnsIcon color="primary" />}
                  titulo="Procesos"
                  componente={componentes.procesos}
                  to={`/monitor/${baseDatosId}/procesos`}
                />
              )}
              {componentes.memoria && (
                <ComponenteCard
                  icon={<MemoryIcon color="primary" />}
                  titulo="Memoria"
                  componente={componentes.memoria}
                  to={`/monitor/${baseDatosId}/memoria`}
                />
              )}
              {componentes.archivos && (
                <ComponenteCard
                  icon={<StorageIcon color="primary" />}
                  titulo="Archivos"
                  componente={componentes.archivos}
                  to={`/monitor/${baseDatosId}/archivos`}
                />
              )}
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Alertas por componente
            </Typography>
            <AlertasPanel alertas={alertas} />
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Evolución
            </Typography>
            <HistoricoChart historico={historico} />
          </Box>
        </Box>
      ) : null}
    </Container>
  );
}
