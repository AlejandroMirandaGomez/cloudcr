import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ApartmentIcon from '@mui/icons-material/Apartment';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LaunchIcon from '@mui/icons-material/Launch';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Table from '../../../common/components/basic-table/Table.jsx';
import { TableSkeleton } from '../../../common/components/loading/Skeletons.jsx';
import StatCard from '../components/StatCard.jsx';
import { useAuth } from '../../../common/context/AuthContext.jsx';
import { useTheme } from '@mui/material/styles';
import { getCuestionarios } from '../../internal-control-questionnaire/services/cuestionarios.js';
import { heroSx } from '../../../common/styles/hero.js';

function esDelMesActual(fechaISO) {
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  return fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth();
}

const columns = [
  { accessorKey: 'organizacion', header: 'Organización', size: 220 },
  { accessorKey: 'fecha', header: 'Fecha', size: 120 },
  {
    id: 'avance',
    header: 'Avance',
    accessorFn: (row) => `${row.respuestas_registradas}/${row.preguntas_en_catalogo}`,
    size: 120,
  },
];

export default function EvaluadorDashboard() {
  const theme = useTheme();
  const { session } = useAuth();
  const [cuestionarios, setCuestionarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCuestionarios({ evaluador_id: session.id })
      .then(setCuestionarios)
      .finally(() => setLoading(false));
  }, [session.id]);

  const cols = useMemo(() => columns, []);

  const organizacionesEvaluadas = new Set(cuestionarios.map((c) => c.organizacion_id)).size;
  const esteMes = cuestionarios.filter((c) => esDelMesActual(c.fecha)).length;

  return (
    <Box>
      <Box
        sx={{
          ...heroSx(theme.palette.mode),
          py: { xs: 4, md: 6 },
          px: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, position: 'relative' }}>
          Hola, {session.nombre}
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.75, position: 'relative' }}>
          Panel del evaluador
        </Typography>
      </Box>

      <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mb: 3 }}>
        <StatCard icon={<AssignmentIcon />} label="Cuestionarios realizados" value={cuestionarios.length} />
        <StatCard icon={<ApartmentIcon />} label="Organizaciones evaluadas" value={organizacionesEvaluadas} />
        <StatCard icon={<EventAvailableIcon />} label="Cuestionarios este mes" value={esteMes} />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Button
          component={RouterLink}
          to="/internal-control-questionnaire"
          variant="contained"
          startIcon={<LaunchIcon />}
        >
          Realizar cuestionario
        </Button>
        <Button component={RouterLink} to="/control-list" variant="outlined" startIcon={<ListAltIcon />}>
          Ver catálogo de controles
        </Button>
      </Box>

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
        Cuestionarios recientes
      </Typography>

      {loading ? (
        <TableSkeleton filas={4} />
      ) : cuestionarios.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Todavía no has realizado ningún cuestionario de control interno.
          </Typography>
        </Paper>
      ) : (
        <Table
          columns={cols}
          data={cuestionarios}
          storageKey="dashboard-evaluador"
          enablePagination={false}
          fillToBottom={false}
          enableRowActions
          renderRowActions={({ row }) => (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Continuar la auditoría">
                <IconButton
                  component={RouterLink}
                  to={`/internal-control-questionnaire/${row.original.id}`}
                  size="small"
                  color="primary"
                  aria-label="Continuar la auditoría"
                >
                  <PlayArrowIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Ver reporte ejecutivo">
                <IconButton
                  component={RouterLink}
                  to={`/reportes/${row.original.id}`}
                  size="small"
                  aria-label="Ver reporte ejecutivo"
                >
                  <AssessmentIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          tableOptions={{
            displayColumnDefOptions: { 'mrt-row-actions': { header: 'Acciones', size: 110 } },
          }}
        />
      )}
      </Box>
    </Box>
  );
}
