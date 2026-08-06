import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Divider, Skeleton, Snackbar, Stack, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ControlQuestionnaire, { MIN_JUSTIFICACION } from '../components/control-questionnaire/ControlQuestionnaire.jsx';
import { PreguntasSkeleton } from '../../../common/components/loading/Skeletons.jsx';
import { getControl } from '../../control-list/services/controles.js';
import { getCuestionario, guardarLote } from '../services/cuestionarios.js';

const LISTA_AUDITORIAS = '/internal-control-questionnaire';
const respuestaNueva = (valor) => ({ documentado: valor, repetible: valor, evidencia: valor });

export default function ControlQuestionnairePage() {
  const { cuestionarioId, controlId } = useParams();

  const [control, setControl] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [dirty, setDirty] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);

  useEffect(() => {
    Promise.all([getControl(controlId), getCuestionario(cuestionarioId)])
      .then(([ctrl, cuest]) => {
        setControl(ctrl);
        const iniciales = {};
        for (const r of cuest.respuestas ?? []) {
          if (r.control_id === ctrl.id) {
            iniciales[r.pregunta_id] = {
              cumple: r.cumple,
              documentado: r.documentado,
              repetible: r.repetible,
              evidencia: r.evidencia,
              justificacion_no_aplica: r.justificacion_no_aplica ?? '',
            };
          }
        }
        setRespuestas(iniciales);
        setDirty(new Set());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [cuestionarioId, controlId]);

  const preguntas = useMemo(
    () =>
      (control?.preguntasIds ?? []).map((id, i) => ({ id, texto: control.preguntas[i] })),
    [control],
  );

  const onChange = (preguntaId, campo, valor) => {
    setRespuestas((prev) => {
      const actual = prev[preguntaId];
      let siguiente;

      if (campo === 'cumple') {
        if (valor === 'N/A') {
          // Conserva la justificacion previa si la pregunta ya estaba marcada N/A.
          siguiente = {
            cumple: 'N/A',
            documentado: 'N/A',
            repetible: 'N/A',
            evidencia: 'N/A',
            justificacion_no_aplica: actual?.justificacion_no_aplica ?? '',
          };
        } else if (actual == null || actual.cumple === 'N/A') {
          siguiente = { cumple: valor, ...respuestaNueva(valor), justificacion_no_aplica: '' };
        } else {
          siguiente = { ...actual, cumple: valor };
        }
      } else {
        siguiente = { ...actual, [campo]: valor };
      }

      return { ...prev, [preguntaId]: siguiente };
    });
    setDirty((prev) => new Set(prev).add(preguntaId));
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    try {
      const filas = [...dirty]
        .filter((preguntaId) => respuestas[preguntaId]?.cumple != null)
        .map((preguntaId) => {
          const r = respuestas[preguntaId];
          return {
            pregunta_id: preguntaId,
            ...r,
            justificacion_no_aplica:
              r.cumple === 'N/A' ? r.justificacion_no_aplica.trim() : null,
          };
        });
      if (filas.length > 0) {
        await guardarLote(Number(cuestionarioId), filas);
      }
      setDirty(new Set());
      setGuardadoOk(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const respondidas = preguntas.filter((p) => respuestas[p.id]?.cumple != null).length;
  const backTo = `${LISTA_AUDITORIAS}/${cuestionarioId}`;

  // Un 'N/A' sin justificar no se puede guardar: lo rechazan el API y la base.
  const sinJustificar = [...dirty].filter((preguntaId) => {
    const r = respuestas[preguntaId];
    return r?.cumple === 'N/A'
      && (r.justificacion_no_aplica ?? '').trim().length < MIN_JUSTIFICACION;
  }).length;

  if (loading) {
    return (
      <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
        <Skeleton variant="rounded" width={200} height={36} sx={{ mb: 3 }} />
        <Skeleton variant="text" width="50%" height={40} />
        <Skeleton variant="text" width="35%" sx={{ mb: 3 }} />
        <PreguntasSkeleton cantidad={4} />
      </Box>
    );
  }

  if (!control) {
    return (
      <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
        <Button component={RouterLink} to={backTo} startIcon={<ArrowBackIcon />} variant="outlined" sx={{ mb: 3 }}>
          Volver al cuestionario
        </Button>
        <Alert severity="error">{error || `No existe un control con el identificador «${controlId}».`}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ mb: 3, flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Button component={RouterLink} to={backTo} startIcon={<ArrowBackIcon />} variant="outlined">
          Volver al cuestionario
        </Button>
        <Button
          component={RouterLink}
          to={`/control-list/${control.id}`}
          state={{
            volverA: {
              to: `${backTo}/control/${controlId}`,
              label: 'Volver al cuestionario',
            },
          }}
          startIcon={<VisibilityIcon />}
          variant="outlined"
        >
          Ver detalle
        </Button>
      </Stack>

      <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {control.nombre}
        </Typography>
        <Chip
          label={`${respondidas}/${preguntas.length} respondidas`}
          size="small"
          color={respondidas >= preguntas.length ? 'success' : 'default'}
          variant="outlined"
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Código {control.codigo} · Norma {control.norma} · Peso {control.peso}
      </Typography>

      <Divider sx={{ my: 3 }} />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <ControlQuestionnaire preguntas={preguntas} respuestas={respuestas} onChange={onChange} />

      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ mt: 3, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <Button
          onClick={guardar}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={dirty.size === 0 || guardando || sinJustificar > 0}
        >
          {guardando ? 'Guardando…' : 'Guardar avance'}
        </Button>
        {sinJustificar > 0 ? (
          <Typography variant="body2" color="error.main">
            {sinJustificar === 1
              ? 'Falta justificar 1 pregunta marcada como «No aplica».'
              : `Faltan justificar ${sinJustificar} preguntas marcadas como «No aplica».`}
          </Typography>
        ) : dirty.size > 0 ? (
          <Typography variant="body2" color="warning.main">
            {dirty.size} {dirty.size === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}
          </Typography>
        ) : null}
      </Stack>

      <Snackbar
        open={guardadoOk}
        autoHideDuration={3000}
        onClose={() => setGuardadoOk(false)}
        message="Respuestas guardadas"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
