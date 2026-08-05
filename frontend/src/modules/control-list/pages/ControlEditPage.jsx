import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, CircularProgress, Divider, MenuItem,
  Paper, TextField, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getControl, updateControl } from '../services/controles.js';

const TIPOS = ['Preventivo', 'Detectivo', 'Correctivo'];
const NIVELES = ['Primario', 'Secundario', 'N-A'];

export default function ControlEditPage() {
  const { codigo } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getControl(codigo)
      .then((c) =>
        setForm({
          nombre: c.nombre,
          tipo: c.tipo?.[0] ?? '',
          descripcion: c.descripcion,
          integridad: c.integridad ?? 'N-A',
          disponibilidad: c.disponibilidad ?? 'N-A',
          confidencialidad: c.confidencialidad ?? 'N-A',
        }),
      )
      .catch(() => setForm(false))
      .finally(() => setLoading(false));
  }, [codigo]);

  const setCampo = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await updateControl(codigo, form);
      navigate(`/control-list/${codigo}`, { replace: true });
    } catch (err) {
      setError(err.message ?? 'Error al guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!form) {
    return (
      <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
        <Button component={RouterLink} to="/control-list" startIcon={<ArrowBackIcon />} variant="outlined" sx={{ mb: 3 }}>
          Volver a la lista de controles
        </Button>
        <Typography variant="h6">Control no encontrado</Typography>
        <Typography variant="body2" color="text.secondary">
          No existe un control con el código «{codigo}».
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
      <Button
        component={RouterLink}
        to={`/control-list/${codigo}`}
        startIcon={<ArrowBackIcon />}
        variant="outlined"
        sx={{ mb: 3 }}
      >
        Cancelar
      </Button>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
          Editar control
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Nombre del control"
            fullWidth
            required
            size="small"
            value={form.nombre}
            onChange={setCampo('nombre')}
            sx={{ mb: 2 }}
          />

          <TextField
            select
            label="Tipo"
            fullWidth
            required
            size="small"
            value={form.tipo}
            onChange={setCampo('tipo')}
            sx={{ mb: 2 }}
          >
            {TIPOS.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Descripción"
            fullWidth
            multiline
            minRows={4}
            size="small"
            value={form.descripcion}
            onChange={setCampo('descripcion')}
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Propiedades de seguridad
          </Typography>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mb: 3 }}>
            <TextField select label="Confidencialidad" size="small" value={form.confidencialidad} onChange={setCampo('confidencialidad')}>
              {NIVELES.map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Integridad" size="small" value={form.integridad} onChange={setCampo('integridad')}>
              {NIVELES.map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Disponibilidad" size="small" value={form.disponibilidad} onChange={setCampo('disponibilidad')}>
              {NIVELES.map((n) => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </TextField>
          </Box>

          <Button
            type="submit"
            variant="contained"
            disabled={guardando}
            startIcon={guardando ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
