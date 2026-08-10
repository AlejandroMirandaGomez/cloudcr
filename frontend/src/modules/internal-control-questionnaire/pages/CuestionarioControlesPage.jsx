import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, IconButton, Skeleton, Stack, Tooltip, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EditNoteIcon from '@mui/icons-material/EditNote';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Table from '../../../common/components/basic-table/Table.jsx';
import { TableSkeleton } from '../../../common/components/loading/Skeletons.jsx';
import AuditInfoHeader from '../components/audit-info-header/AuditInfoHeader.jsx';
import { getControles } from '../../control-list/services/controles.js';
import { getCuestionario } from '../services/cuestionarios.js';

const LISTA_CUESTIONARIOS = '/internal-control-questionnaire';

function ProgresoChip({ respondidas, total }) {
  const color = respondidas >= total ? 'success' : respondidas > 0 ? 'warning' : 'default';
  return (
    <Chip
      label={`${respondidas}/${total}`}
      color={color}
      size="small"
      variant="outlined"
      sx={{ width: 72, justifyContent: 'center' }}
    />
  );
}

function MadurezChip({ madurez }) {
  if (!madurez) {
    return <Chip label="Sin definir" size="small" variant="outlined" />;
  }
  return (
    <Tooltip title={madurez.nivel_descripcion ?? madurez.nivel_nombre}>
      <Chip label={`Nivel ${madurez.nivel}`} size="small" color="primary" variant="outlined" />
    </Tooltip>
  );
}

export default function CuestionarioControlesPage() {
  const { cuestionarioId } = useParams();

  const [cuestionario, setCuestionario] = useState(null);
  const [controles, setControles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getCuestionario(cuestionarioId), getControles()])
      .then(([cuest, ctrls]) => {
        setCuestionario(cuest);
        setControles(ctrls);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [cuestionarioId]);

  const respondidasPorControl = useMemo(() => {
    const conteo = new Map();
    for (const r of cuestionario?.respuestas ?? []) {
      conteo.set(r.control_id, (conteo.get(r.control_id) ?? 0) + 1);
    }
    return conteo;
  }, [cuestionario]);

  const madurezPorControl = useMemo(() => {
    const niveles = new Map();
    for (const m of cuestionario?.niveles_madurez ?? []) {
      niveles.set(m.control_id, m);
    }
    return niveles;
  }, [cuestionario]);

  const columns = useMemo(
    () => [
      { accessorKey: 'codigo', header: 'Código', size: 90 },
      { accessorKey: 'nombre', header: 'Control', size: 260 },
      { accessorKey: 'dominioNorma', header: 'Dominio', size: 130 },
      { accessorKey: 'peso', header: 'Peso', size: 80 },
      {
        id: 'madurez',
        header: 'Madurez',
        accessorFn: (row) => madurezPorControl.get(row.id)?.nivel ?? 0,
        Cell: ({ row }) => <MadurezChip madurez={madurezPorControl.get(row.original.id)} />,
        size: 130,
      },
      {
        id: 'progreso',
        header: 'Progreso',
        accessorFn: (row) => respondidasPorControl.get(row.id) ?? 0,
        Cell: ({ row }) => (
          <ProgresoChip
            respondidas={respondidasPorControl.get(row.original.id) ?? 0}
            total={row.original.preguntas.length}
          />
        ),
        size: 110,
      },
    ],
    [respondidasPorControl, madurezPorControl],
  );

  if (loading) {
    return (
      <Box sx={{ p: 3, pb: 0 }}>
        <Skeleton variant="rounded" width={180} height={36} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={84} sx={{ mb: 2 }} />
        <TableSkeleton filas={8} />
      </Box>
    );
  }

  if (!cuestionario) {
    return (
      <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
        <Button component={RouterLink} to={LISTA_CUESTIONARIOS} startIcon={<ArrowBackIcon />} variant="outlined" sx={{ mb: 3 }}>
          Volver a cuestionarios
        </Button>
        <Alert severity="error">{error || `No existe el cuestionario «${cuestionarioId}».`}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, pb: 0 }}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ mb: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Button component={RouterLink} to={LISTA_CUESTIONARIOS} startIcon={<ArrowBackIcon />} variant="outlined">
          Volver a cuestionarios
        </Button>
        <Button
          component={RouterLink}
          to={`/reportes/${cuestionarioId}`}
          startIcon={<AssessmentIcon />}
          variant="contained"
        >
          Ver reporte ejecutivo
        </Button>
      </Stack>

      <Box sx={{ mb: 2 }}>
        <AuditInfoHeader cuestionario={cuestionario} />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Seleccione un control para declarar su nivel de madurez y responder sus preguntas. El
        avance se guarda por control: puede pausar y continuar cuando lo necesite.
      </Typography>

      <Table
        columns={columns}
        data={controles}
        storageKey="cuestionario-controles"
        enableRowActions
        renderRowActions={({ row }) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Responder preguntas">
              <IconButton
                component={RouterLink}
                to={`${LISTA_CUESTIONARIOS}/${cuestionarioId}/control/${row.original.id}`}
                size="small"
                color="primary"
                aria-label="Responder preguntas"
              >
                <EditNoteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ver ficha del control">
              <IconButton
                component={RouterLink}
                to={`/control-list/${row.original.id}`}
                state={{
                  volverA: {
                    to: `${LISTA_CUESTIONARIOS}/${cuestionarioId}`,
                    label: 'Volver al cuestionario',
                  },
                }}
                size="small"
                aria-label="Ver ficha del control"
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
        tableOptions={{
          displayColumnDefOptions: { 'mrt-row-actions': { header: 'Acciones', size: 110 } },
        }}
      />
    </Box>
  );
}
