import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup,
  Skeleton, Stack, Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import useRubricaPeso from '../hooks/useRubricaPeso.js';
import { PREGUNTAS_RUBRICA, PUNTAJE_MAXIMO, puntajeRubrica, rubricaCompleta } from '../lib/rubricaPeso.js';
import { formatearPeso } from '../lib/pesos.js';

const RESPUESTAS_VACIAS = Object.fromEntries(PREGUNTAS_RUBRICA.map((p) => [p.id, null]));

const mismasRespuestas = (a, b) => PREGUNTAS_RUBRICA.every((p) => (a?.[p.id] ?? null) === (b?.[p.id] ?? null));

/**
 * Cuatro preguntas cerradas para determinar el peso de UNA variable dentro de
 * su componente. Las respuestas se guardan por base; el peso sugerido sale de
 * comparar el puntaje con el de las demas variables del componente, por eso
 * aqui solo se muestra y se aplica desde la tabla del componente.
 */
export default function RubricaPesoForm({ baseDatosId, componenteId, variableId, indicador }) {
  const { rubrica, listo, error, guardar } = useRubricaPeso(baseDatosId, componenteId);
  const [borrador, setBorrador] = useState(RESPUESTAS_VACIAS);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const entrada = useMemo(
    () => rubrica?.variables?.find((v) => v.codigo === variableId) ?? null,
    [rubrica, variableId],
  );
  const guardadas = entrada?.respuestas ?? null;

  // Al llegar (o cambiar) lo guardado en el servidor, el borrador arranca de
  // ahi. Se resetea durante el render (patron "derived state") en vez de con
  // un efecto, para no encadenar un segundo render.
  const [base, setBase] = useState(guardadas);
  if (base !== guardadas) {
    setBase(guardadas);
    setBorrador(guardadas ?? RESPUESTAS_VACIAS);
  }

  const puntaje = puntajeRubrica(borrador);
  const completa = rubricaCompleta(borrador);
  const sinCambios = mismasRespuestas(borrador, guardadas);
  const faltantes = (rubrica?.faltantes ?? []).filter((codigo) => codigo !== variableId);

  const responder = (preguntaId, valor) => {
    setMensaje('');
    setBorrador((actual) => ({ ...actual, [preguntaId]: Number(valor) }));
  };

  const enviar = async () => {
    setGuardando(true);
    const resultado = await guardar(variableId, borrador);
    setGuardando(false);
    setMensaje(resultado.ok ? 'Respuestas guardadas.' : '');
  };

  if (!listo) {
    return <Skeleton variant="rounded" height={220} />;
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        El peso depende de la empresa: responda pensando en cómo afecta esta variable a su
        operación. El puntaje es <em>impacto × probabilidad + tiempo de reacción + cobertura</em>;
        el peso sugerido es ese puntaje comparado con el de las otras variables de {indicador}.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={2.5}>
        {PREGUNTAS_RUBRICA.map((pregunta, indice) => (
          <FormControl key={pregunta.id} component="fieldset" variant="standard">
            <FormLabel component="legend" sx={{ mb: 0.5 }}>
              <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {indice + 1}. {pregunta.titulo}.{' '}
              </Typography>
              <Typography component="span" variant="body2" color="text.secondary">
                {pregunta.texto}
              </Typography>
            </FormLabel>
            <RadioGroup
              value={borrador[pregunta.id] ?? ''}
              onChange={(evento) => responder(pregunta.id, evento.target.value)}
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 1 }}
            >
              {pregunta.opciones.map((etiqueta, i) => (
                <FormControlLabel
                  key={etiqueta}
                  value={i + 1}
                  control={<Radio size="small" />}
                  label={`${i + 1} · ${etiqueta}`}
                  slotProps={{ typography: { variant: 'body2' } }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        ))}
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ mt: 3, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <Chip
          size="small"
          variant="outlined"
          color={completa ? 'primary' : 'default'}
          label={completa ? `Puntaje ${puntaje} / ${PUNTAJE_MAXIMO}` : 'Responda las cuatro preguntas'}
        />
        {entrada && (
          <>
            <Chip size="small" variant="outlined" label={`Peso actual ${formatearPeso(entrada.peso_actual)}`} />
            <Chip
              size="small"
              variant="outlined"
              color="success"
              label={`Peso sugerido ${formatearPeso(entrada.peso_sugerido)}`}
            />
          </>
        )}
        <Box sx={{ flex: 1 }} />
        {mensaje && (
          <Typography variant="caption" color="success.main">{mensaje}</Typography>
        )}
        <Button
          size="small"
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={enviar}
          disabled={!completa || sinCambios || guardando}
        >
          Guardar respuestas
        </Button>
      </Stack>

      <Alert severity={faltantes.length > 0 ? 'warning' : 'info'} sx={{ mt: 2, borderRadius: 2 }}>
        {faltantes.length > 0
          ? `El peso sugerido se calcula contra las demás variables de ${indicador}; faltan ${faltantes.length} por responder (${faltantes.join(', ')}) y mientras tanto se les asume un puntaje neutro. `
          : `La rúbrica de ${indicador} está completa. `}
        Los pesos sugeridos se aplican desde{' '}
        <RouterLink to={`/monitor/${baseDatosId}/${componenteId}`}>la tabla del componente</RouterLink>
        {' '}con el botón «Pesos por rúbrica».
      </Alert>
    </Box>
  );
}
