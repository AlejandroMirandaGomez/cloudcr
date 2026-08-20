import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Container, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import { CardsSkeleton } from '../../../common/components/loading/Skeletons.jsx';
import BaseDatosCard from '../components/BaseDatosCard.jsx';
import { getBasesDatosMonitoreadas } from '../services/monitor.js';

const MOTORES = ['Oracle', 'PostgreSQL', 'MySQL', 'SQL Server'];

/**
 * Pantalla selectora del monitor: lista las bases de datos monitoreadas
 * (datos simulados, ver claude2.md) antes de entrar al dashboard de una
 * base especifica en /monitor/:baseDatosId.
 */
export default function MonitorSelectorPage() {
  const navigate = useNavigate();
  const [basesDatos, setBasesDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [motor, setMotor] = useState(MOTORES[0]);

  const abrirDialogo = () => {
    setNombre('');
    setMotor(MOTORES[0]);
    setDialogAbierto(true);
  };

  const agregarBaseDatos = () => {
    setBasesDatos((prev) => [
      ...prev,
      {
        id: Date.now(),
        nombre: nombre.trim(),
        motor,
        estado: 'Pendiente',
        color: 'amarillo',
        actualizado_en: 'Sin datos aun',
      },
    ]);
    setDialogAbierto(false);
  };

  useEffect(() => {
    let activo = true;

    getBasesDatosMonitoreadas()
      .then((datos) => activo && setBasesDatos(datos))
      .catch((e) => activo && setError(e.message))
      .finally(() => activo && setLoading(false));

    return () => {
      activo = false;
    };
  }, []);

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
        <Button onClick={abrirDialogo} startIcon={<AddIcon />} variant="contained">
          Agregar base de datos
        </Button>
      </Stack>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Monitor de Salud de Base de Datos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Seleccione una base de datos monitoreada para ver su dashboard de salud.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          No se pudo cargar el listado de bases de datos: {error}
        </Alert>
      )}

      {loading ? (
        <CardsSkeleton cantidad={4} alto={120} columnas={{ xs: '1fr', md: 'repeat(2, 1fr)' }} />
      ) : basesDatos.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No hay bases de datos monitoreadas por el momento.
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
          {basesDatos.map((bd) => (
            <BaseDatosCard key={bd.id} baseDatos={bd} onClick={() => navigate(`/monitor/${bd.id}`)} />
          ))}
        </Box>
      )}

      <Dialog open={dialogAbierto} onClose={() => setDialogAbierto(false)} fullWidth maxWidth="xs">
        <DialogTitle>Agregar base de datos</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            select
            label="Motor"
            value={motor}
            onChange={(e) => setMotor(e.target.value)}
            fullWidth
          >
            {MOTORES.map((m) => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogAbierto(false)}>Cancelar</Button>
          <Button onClick={agregarBaseDatos} variant="contained" disabled={!nombre.trim()}>
            Agregar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
