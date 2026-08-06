import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, LinearProgress, MenuItem, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Table from '../../../common/components/basic-table/Table.jsx';
import { TableSkeleton } from '../../../common/components/loading/Skeletons.jsx';
import { useAuth } from '../../../common/context/AuthContext.jsx';
import {
  crearCuestionario, eliminarCuestionario, getCuestionarios, getOrganizaciones,
} from '../services/cuestionarios.js';

const hoyISO = () => new Date().toISOString().slice(0, 10);

function AvanceCell({ row }) {
  const { respuestas_registradas: hechas, preguntas_en_catalogo: total, avance } = row.original;
  return (
    <Stack spacing={0.5} sx={{ minWidth: 140 }}>
      <Typography variant="caption">{hechas}/{total} preguntas</Typography>
      <LinearProgress
        variant="determinate"
        value={Math.round((avance ?? 0) * 100)}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Stack>
  );
}

function EstadoChip({ avance }) {
  if (avance >= 1) return <Chip label="Completa" color="success" size="small" variant="outlined" />;
  if (avance > 0) return <Chip label="En progreso" color="warning" size="small" variant="outlined" />;
  return <Chip label="Sin iniciar" size="small" variant="outlined" />;
}

const columns = [
  { accessorKey: 'id', header: 'N°', size: 70 },
  { accessorKey: 'organizacion', header: 'Organización', size: 220 },
  { accessorKey: 'fecha', header: 'Fecha', size: 120 },
  { id: 'avance', header: 'Avance', Cell: AvanceCell, size: 170 },
  {
    id: 'estado',
    header: 'Estado',
    Cell: ({ row }) => <EstadoChip avance={row.original.avance ?? 0} />,
    size: 120,
  },
];

export default function InternalControlQuestionnairePage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const cols = useMemo(() => columns, []);

  const [cuestionarios, setCuestionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [organizaciones, setOrganizaciones] = useState([]);
  const [organizacionId, setOrganizacionId] = useState('');
  const [fecha, setFecha] = useState(hoyISO());
  const [creando, setCreando] = useState(false);
  const [errorDialogo, setErrorDialogo] = useState('');

  const [porEliminar, setPorEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(
    () =>
      getCuestionarios({ evaluador_id: session.id })
        .then(setCuestionarios)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    [session.id],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirDialogo = () => {
    setErrorDialogo('');
    setOrganizacionId('');
    setFecha(hoyISO());
    setDialogAbierto(true);
    if (organizaciones.length === 0) {
      getOrganizaciones()
        .then(setOrganizaciones)
        .catch((e) => setErrorDialogo(e.message));
    }
  };

  const crear = async () => {
    setCreando(true);
    setErrorDialogo('');
    try {
      const nuevo = await crearCuestionario({
        organizacion_id: Number(organizacionId),
        evaluador_id: session.id,
        fecha,
      });
      navigate(`/internal-control-questionnaire/${nuevo.id}`);
    } catch (e) {
      setErrorDialogo(e.message);
      setCreando(false);
    }
  };

  const eliminar = async () => {
    setEliminando(true);
    try {
      await eliminarCuestionario(porEliminar.id);
      setPorEliminar(null);
      cargar();
    } catch (e) {
      setError(e.message);
      setPorEliminar(null);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <Box sx={{ p: 3, pb: 0 }}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ mb: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} variant="outlined">
          Volver al inicio
        </Button>
        <Button onClick={abrirDialogo} startIcon={<AddIcon />} variant="contained">
          Nueva auditoría
        </Button>
      </Stack>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Auditorías de control interno
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Cree una nueva auditoría o continúe una evaluación guardada parcialmente.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <TableSkeleton filas={5} />
      ) : (
        <Table
          columns={cols}
          data={cuestionarios}
          storageKey="auditorias"
          enableRowActions
          renderRowActions={({ row }) => (
            <Stack direction="row" spacing={0.5}>
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
              <Tooltip title="Eliminar">
                <IconButton
                  size="small"
                  onClick={() => setPorEliminar(row.original)}
                  aria-label="Eliminar la auditoría"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
          tableOptions={{
            displayColumnDefOptions: { 'mrt-row-actions': { header: 'Acciones', size: 110 } },
          }}
        />
      )}

      {/* Dialogo: nueva auditoria */}
      <Dialog open={dialogAbierto} onClose={() => !creando && setDialogAbierto(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nueva auditoría</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorDialogo && <Alert severity="error">{errorDialogo}</Alert>}
            <TextField
              select
              label="Organización"
              value={organizacionId}
              onChange={(e) => setOrganizacionId(e.target.value)}
              fullWidth
            >
              {organizaciones.map((o) => (
                <MenuItem key={o.id} value={o.id}>{o.nombre}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Fecha de la auditoría"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField label="Auditor" value={session.nombre} fullWidth disabled />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAbierto(false)} disabled={creando}>Cancelar</Button>
          <Button onClick={crear} variant="contained" disabled={!organizacionId || !fecha || creando}>
            {creando ? 'Creando…' : 'Crear y evaluar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogo: confirmar eliminacion */}
      <Dialog open={porEliminar !== null} onClose={() => !eliminando && setPorEliminar(null)} maxWidth="xs">
        <DialogTitle>¿Eliminar la auditoría?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Se eliminará la auditoría N° {porEliminar?.id} de «{porEliminar?.organizacion}» y todas
            sus respuestas registradas. Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPorEliminar(null)} disabled={eliminando}>Cancelar</Button>
          <Button onClick={eliminar} color="error" variant="contained" disabled={eliminando}>
            {eliminando ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
