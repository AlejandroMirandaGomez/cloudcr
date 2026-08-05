import { useEffect, useMemo, useState } from 'react';
import {
  Box, CircularProgress, Divider, List, ListItem, ListItemText,
  Paper, Typography,
} from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import EventIcon from '@mui/icons-material/Event';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Table from '../../../common/components/basic-table/Table.jsx';
import StatCard from '../components/StatCard.jsx';
import CumplimientoChip from '../components/CumplimientoChip.jsx';
import { colorDeCumplimiento } from '../lib/cumplimiento.js';
import { useAuth } from '../../../common/context/AuthContext.jsx';
import { getHistorialOrganizacion } from '../services/dashboard.js';
import { getResumen, getMapaCalor, getHallazgos } from '../../internal-control-questionnaire/services/cuestionarios.js';
import { heroBackgroundSx } from '../../../common/styles/hero.js';

const DIMENSION_LABEL = {
  confidencialidad: 'Confidencialidad',
  integridad: 'Integridad',
  disponibilidad: 'Disponibilidad',
};

const columns = [
  { accessorKey: 'fecha', header: 'Fecha', size: 120 },
  { accessorKey: 'evaluador', header: 'Evaluador', size: 200 },
  {
    id: 'cumplimiento',
    header: 'Cumplimiento',
    accessorFn: (row) => row.cumplimiento ?? -1,
    Cell: ({ row }) => <CumplimientoChip valor={row.original.cumplimiento} color={row.original.color} />,
    size: 130,
  },
];

export default function OrganizacionDashboard() {
  const { session } = useAuth();
  const [historial, setHistorial] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [mapaCalor, setMapaCalor] = useState(null);
  const [hallazgos, setHallazgos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cols = useMemo(() => columns, []);

  useEffect(() => {
    let activo = true;

    getHistorialOrganizacion(session.id)
      .then(async (hist) => {
        if (!activo) return;
        setHistorial(hist);

        const ultimo = hist[hist.length - 1];
        if (!ultimo) return;

        const [r, m, h] = await Promise.all([
          getResumen(ultimo.cuestionario_id),
          getMapaCalor(ultimo.cuestionario_id),
          getHallazgos(ultimo.cuestionario_id),
        ]);
        if (!activo) return;
        setResumen(r);
        setMapaCalor(m);
        setHallazgos(h);
      })
      .finally(() => activo && setLoading(false));

    return () => {
      activo = false;
    };
  }, [session.id]);

  const ultima = historial[historial.length - 1];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          ...heroBackgroundSx,
          color: '#1a1a2e',
          py: { xs: 4, md: 6 },
          px: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, position: 'relative' }}>
          {session.nombre}
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.75, position: 'relative' }}>
          Panel de la organización
        </Typography>
      </Box>

      <Box sx={{ p: 3 }}>
      {historial.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Tu organización todavía no ha sido evaluada. Cuando un evaluador registre un
            cuestionario de control interno, los resultados aparecerán aquí.
          </Typography>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mb: 3 }}>
            <StatCard icon={<AssignmentTurnedInIcon />} label="Evaluaciones recibidas" value={historial.length} />
            <StatCard icon={<EventIcon />} label="Última evaluación" value={ultima.fecha} />
            <StatCard
              icon={<TrendingUpIcon />}
              label="Cumplimiento última evaluación"
              value={ultima.cumplimiento === null ? 'Sin datos' : `${Math.round(ultima.cumplimiento * 100)}%`}
            />
          </Box>

          {mapaCalor && (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Mapa de calor — última evaluación
              </Typography>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mb: 3 }}>
                {mapaCalor.dimensiones.map((d) => (
                  <Paper key={d.dimension} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {DIMENSION_LABEL[d.dimension] ?? d.dimension}
                    </Typography>
                    <CumplimientoChip valor={d.cumplimiento} color={d.color} />
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                      {d.cumplidos}/{d.aplicables} controles cumplidos
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </>
          )}

          {resumen && (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Resumen — última evaluación
              </Typography>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, mb: 3 }}>
                <StatCard label="Cumplidos" value={resumen.cumplidos} icon={<AssignmentTurnedInIcon />} />
                <StatCard label="No cumplidos" value={resumen.no_cumplidos} icon={<AssignmentTurnedInIcon />} />
                <StatCard label="No aplica" value={resumen.no_aplica} icon={<AssignmentTurnedInIcon />} />
                <StatCard
                  label="Cumplimiento global"
                  value={resumen.cumplimiento === null ? 'Sin datos' : `${Math.round(resumen.cumplimiento * 100)}%`}
                  icon={<TrendingUpIcon />}
                />
              </Box>
            </>
          )}

          {hallazgos.length > 0 && (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                Principales hallazgos (preguntas no cumplidas)
              </Typography>
              <Paper variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
                <List dense disablePadding>
                  {hallazgos.slice(0, 5).map((h, i) => (
                    <Box key={h.pregunta_id}>
                      {i > 0 && <Divider />}
                      <ListItem>
                        <ListItemText
                          primary={`${h.codigo} — ${h.control}`}
                          secondary={h.texto}
                        />
                      </ListItem>
                    </Box>
                  ))}
                </List>
              </Paper>
            </>
          )}

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Historial de evaluaciones
          </Typography>
          <Table
            columns={cols}
            data={historial.map((h) => ({ ...h, id: h.cuestionario_id, color: h.color ?? colorDeCumplimiento(h.cumplimiento) }))}
            storageKey="dashboard-organizacion"
            enablePagination={false}
            fillToBottom={false}
          />
        </>
      )}
      </Box>
    </Box>
  );
}
