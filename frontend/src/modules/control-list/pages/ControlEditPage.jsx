import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Divider, IconButton,
  ListItemText, MenuItem, OutlinedInput, Paper, Select, InputLabel, FormControl,
  Stack, TextField, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { getCatalogos, getControl, updateControl } from '../services/controles.js';

const NIVELES = ['Primario', 'Secundario'];

const MULTIPLES = [
  { campo: 'tiposIds', catalogo: 'tipos', label: 'Tipo de control' },
  { campo: 'conceptosIds', catalogo: 'conceptos', label: 'Concepto de ciberseguridad' },
  { campo: 'dominiosSeguridadIds', catalogo: 'dominios_seguridad', label: 'Dominio de seguridad' },
  { campo: 'capacidadesIds', catalogo: 'capacidades', label: 'Capacidades operativas' },
];

function SelectMultiple({ label, valores, opciones, onChange }) {
  const nombrePorId = new Map(opciones.map((o) => [o.id, o.nombre]));

  return (
    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={valores}
        onChange={(e) => onChange(e.target.value)}
        input={<OutlinedInput label={label} />}
        renderValue={(seleccionados) => (
          <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {seleccionados.map((id) => (
              <Chip key={id} label={nombrePorId.get(id)} size="small" />
            ))}
          </Stack>
        )}
      >
        {opciones.map((o) => (
          <MenuItem key={o.id} value={o.id}>
            <Checkbox checked={valores.includes(o.id)} size="small" />
            <ListItemText primary={o.nombre} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default function ControlEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [catalogos, setCatalogos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getControl(id), getCatalogos()])
      .then(([control, listas]) => {
        setForm(control);
        setCatalogos(listas);
      })
      .catch(() => setForm(false))
      .finally(() => setLoading(false));
  }, [id]);

  const setCampo = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const setValor = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const setPregunta = (indice, texto) =>
    setForm((f) => ({
      ...f,
      preguntas: f.preguntas.map((p, i) => (i === indice ? texto : p)),
    }));

  const agregarPregunta = () =>
    setForm((f) => ({ ...f, preguntas: [...f.preguntas, ''] }));

  const borrarPregunta = (indice) =>
    setForm((f) => ({ ...f, preguntas: f.preguntas.filter((_, i) => i !== indice) }));

  const moverPregunta = (indice, salto) =>
    setForm((f) => {
      const destino = indice + salto;
      if (destino < 0 || destino >= f.preguntas.length) return f;

      const preguntas = [...f.preguntas];
      [preguntas[indice], preguntas[destino]] = [preguntas[destino], preguntas[indice]];
      return { ...f, preguntas };
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await updateControl(id, form);
      navigate(`/control-list/${id}`, { replace: true });
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
          No existe un control con el identificador «{id}».
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 820, mx: 'auto' }}>
      <Button
        component={RouterLink}
        to={`/control-list/${id}`}
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
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' }, mb: 2 }}>
            <TextField
              label="Código"
              required
              size="small"
              value={form.codigo}
              onChange={setCampo('codigo')}
            />
            <TextField
              label="Nombre del control"
              required
              size="small"
              value={form.nombre}
              onChange={setCampo('nombre')}
            />
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mb: 2 }}>
            <TextField
              select
              label="Norma"
              required
              size="small"
              value={form.normaId}
              onChange={(e) => setValor('normaId', e.target.value)}
            >
              {catalogos.normas.map((n) => (
                <MenuItem key={n.id} value={n.id}>{n.nombre}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Dominio de la norma"
              required
              size="small"
              value={form.dominioNormaId}
              onChange={(e) => setValor('dominioNormaId', e.target.value)}
            >
              {catalogos.dominios_norma.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.clausula} — {d.nombre}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Peso"
              type="number"
              required
              size="small"
              slotProps={{ htmlInput: { min: 1, max: 10 } }}
              value={form.peso}
              onChange={setCampo('peso')}
            />
          </Box>

          <TextField
            label="Propósito"
            fullWidth
            required
            multiline
            minRows={2}
            size="small"
            value={form.proposito}
            onChange={setCampo('proposito')}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Descripción"
            fullWidth
            required
            multiline
            minRows={3}
            size="small"
            value={form.descripcion}
            onChange={setCampo('descripcion')}
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 2 }} />

          {MULTIPLES.map(({ campo, catalogo, label }) => (
            <SelectMultiple
              key={campo}
              label={label}
              valores={form[campo]}
              opciones={catalogos[catalogo]}
              onChange={(valor) => setValor(campo, valor)}
            />
          ))}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Propiedades de seguridad
          </Typography>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mb: 3 }}>
            {['confidencialidad', 'integridad', 'disponibilidad'].map((dimension) => (
              <TextField
                key={dimension}
                select
                label={dimension[0].toUpperCase() + dimension.slice(1)}
                size="small"
                value={form[dimension] ?? ''}
                onChange={(e) => setValor(dimension, e.target.value || null)}
              >
                <MenuItem value="">No aplica</MenuItem>
                {NIVELES.map((n) => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </TextField>
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          <TextField
            label="Guía"
            fullWidth
            multiline
            minRows={4}
            size="small"
            value={form.guia}
            onChange={setCampo('guia')}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Otra información"
            fullWidth
            multiline
            minRows={3}
            size="small"
            value={form.otraInformacion}
            onChange={setCampo('otraInformacion')}
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Preguntas del control ({form.preguntas.length})
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={agregarPregunta}>
              Agregar
            </Button>
          </Stack>

          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {form.preguntas.map((pregunta, i) => (
              <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <TextField
                  label={`Pregunta ${i + 1}`}
                  fullWidth
                  multiline
                  size="small"
                  value={pregunta}
                  onChange={(e) => setPregunta(i, e.target.value)}
                />
                <Stack>
                  <IconButton size="small" onClick={() => moverPregunta(i, -1)} disabled={i === 0}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => moverPregunta(i, 1)}
                    disabled={i === form.preguntas.length - 1}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <IconButton size="small" onClick={() => borrarPregunta(i)} aria-label="Borrar pregunta">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>

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
