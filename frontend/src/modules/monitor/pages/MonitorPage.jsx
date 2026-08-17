import { useEffect, useState } from 'react';
import { Alert, Box, Typography } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import { CardsSkeleton } from '../../../common/components/loading/Skeletons.jsx';
import IndiceSaludCard from '../components/IndiceSaludCard.jsx';
import ComponenteCard from '../components/ComponenteCard.jsx';
import AlertasPanel from '../components/AlertasPanel.jsx';
import HistoricoChart from '../components/HistoricoChart.jsx';
import { getIndiceSalud, getAlertasSalud, getHistoricoSalud } from '../services/monitor.js';

/**
 * Fase 2 - Monitor de Salud de Base de Datos. Prueba de concepto de
 * front + back con datos simulados (ver claude.md): no toca PostgreSQL ni
 * una conexion Oracle real, solo maqueta el ISBD = Wp*IP + Wm*IM + Wa*IA
 * propuesto por el documento del profesor para poder mostrarlo al equipo.
 */
export default function MonitorPage() {
  const [indice, setIndice] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;

    Promise.all([getIndiceSalud(), getAlertasSalud(), getHistoricoSalud()])
      .then(([i, a, h]) => {
        if (!activo) return;
        setIndice(i);
        setAlertas(a);
        setHistorico(h);
      })
      .catch((e) => activo && setError(e.message))
      .finally(() => activo && setLoading(false));

    return () => {
      activo = false;
    };
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
        Monitor de Salud de Base de Datos
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Prueba de concepto — Fase 2
      </Typography>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        Datos simulados para esta demo. Aun no esta confirmado si el monitor se conectara a una
        instancia Oracle real (V$PROCESS, V$SGA, V$DATAFILE...) o si se seguira simulando; los
        pesos (30/35/35) y los umbrales tambien son una propuesta inicial pendiente de validar
        con el profesor. Nada de esto toca la base de datos de CloudCR.
      </Alert>

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
              <ComponenteCard icon={<DnsIcon color="primary" />} titulo="Procesos" componente={indice.componentes.procesos} />
              <ComponenteCard icon={<MemoryIcon color="primary" />} titulo="Memoria" componente={indice.componentes.memoria} />
              <ComponenteCard icon={<StorageIcon color="primary" />} titulo="Archivos" componente={indice.componentes.archivos} />
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Alertas por componente
            </Typography>
            <AlertasPanel alertas={alertas} />
          </Box>

          <HistoricoChart historico={historico} />
        </Box>
      ) : null}
    </Box>
  );
}
