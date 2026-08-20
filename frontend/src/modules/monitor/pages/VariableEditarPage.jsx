import { Fragment, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Divider, Paper, Stack, TextField, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  actualizarLimites,
  actualizarPesos,
  getComponente,
  getPesos,
  getPreferenciaPesos,
  getVariable,
} from '../data/variablesMonitor.js';
import {
  MODO_PESOS_RELATIVOS,
  PESO_MAXIMO_RELATIVO,
  PESO_MINIMO,
  editarPesoModo1,
  editarPesoModo2,
  formatearPeso,
  maxEditable,
  porcentajesDesdeModo2,
} from '../lib/pesos.js';

export default function VariableEditarPage() {
  const { baseDatosId, componente: componenteId, variableId } = useParams();
  const navigate = useNavigate();
  const componente = getComponente(componenteId);
  const variable = getVariable(componenteId, variableId);
  const detalleTo = `/monitor/${baseDatosId}/${componenteId}/${variableId}`;

  const preferencia = getPreferenciaPesos(componenteId);
  const pesosActuales = useMemo(() => getPesos(componenteId), [componenteId]);
  const esRelativo = preferencia.modo === MODO_PESOS_RELATIVOS;

  const [limiteInferior, setLimiteInferior] = useState(variable?.limiteInferior ?? '');
  const [limiteSuperior, setLimiteSuperior] = useState(variable?.limiteSuperior ?? '');
  const [peso, setPeso] = useState(variable?.peso ?? '');
  const [error, setError] = useState('');

  const maximoPeso = useMemo(() => {
    if (!variable) return PESO_MAXIMO_RELATIVO;
    if (esRelativo) return PESO_MAXIMO_RELATIVO;
    return maxEditable({ pesos: pesosActuales, bloqueados: preferencia.bloqueados, id: variableId });
  }, [variable, esRelativo, pesosActuales, preferencia.bloqueados, variableId]);

  const previsualizacion = useMemo(() => {
    if (!variable || peso === '' || Number.isNaN(Number(peso))) return [];

    const resultado = esRelativo
      ? porcentajesDesdeModo2(editarPesoModo2({ pesos: pesosActuales, id: variableId, nuevoValor: peso }))
      : editarPesoModo1({
        pesos: pesosActuales,
        bloqueados: preferencia.bloqueados,
        id: variableId,
        nuevoValor: peso,
      });

    const nombrePorId = new Map(componente.variables.map((v) => [v.id, v.variable]));
    return resultado.map((p) => ({
      id: p.id,
      nombre: nombrePorId.get(p.id) ?? p.id,
      valor: p.valor,
      esActual: p.id === variableId,
    }));
  }, [variable, peso, esRelativo, pesosActuales, preferencia.bloqueados, variableId, componente]);

  if (!componente || !variable) {
    return (
      <Box sx={{ p: 3, maxWidth: 640, mx: 'auto' }}>
        <Button component={RouterLink} to={`/monitor/${baseDatosId}/${componenteId}`} startIcon={<ArrowBackIcon />} variant="outlined" sx={{ mb: 3 }}>
          Volver
        </Button>
        <Typography variant="h6">Variable no encontrada</Typography>
        <Typography variant="body2" color="text.secondary">
          No existe la variable «{variableId}».
        </Typography>
      </Box>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    const inferior = Number(limiteInferior);
    const superior = Number(limiteSuperior);
    const pesoNumero = Number(peso);

    if (limiteInferior === '' || limiteSuperior === '' || Number.isNaN(inferior) || Number.isNaN(superior)) {
      setError('Ingrese ambos límites.');
      return;
    }
    if (superior < inferior) {
      setError('El límite superior debe ser igual o mayor al límite inferior.');
      return;
    }
    if (peso === '' || Number.isNaN(pesoNumero)) {
      setError('Ingrese el peso de la variable.');
      return;
    }
    if (pesoNumero < PESO_MINIMO) {
      setError(`El peso mínimo es ${PESO_MINIMO}.`);
      return;
    }
    if (pesoNumero > maximoPeso) {
      setError(`El peso máximo permitido para esta variable es ${maximoPeso}.`);
      return;
    }

    actualizarLimites(componenteId, variableId, inferior, superior);

    const pesosNuevos = esRelativo
      ? editarPesoModo2({ pesos: pesosActuales, id: variableId, nuevoValor: pesoNumero })
      : editarPesoModo1({
        pesos: pesosActuales,
        bloqueados: preferencia.bloqueados,
        id: variableId,
        nuevoValor: pesoNumero,
      });

    actualizarPesos(componenteId, pesosNuevos, preferencia);
    navigate(detalleTo, { replace: true });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 640, mx: 'auto' }}>
      <Button component={RouterLink} to={detalleTo} startIcon={<ArrowBackIcon />} variant="outlined" sx={{ mb: 3 }}>
        Cancelar
      </Button>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
          Editar variable
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {variable.variable} ({variable.dato}) — {componente.titulo}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Métrica
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <TextField
              label="Límite inferior"
              type="number"
              required
              fullWidth
              size="small"
              value={limiteInferior}
              onChange={(e) => setLimiteInferior(e.target.value)}
              slotProps={{ htmlInput: { step: 'any' } }}
            />
            <TextField
              label="Límite superior"
              type="number"
              required
              fullWidth
              size="small"
              value={limiteSuperior}
              onChange={(e) => setLimiteSuperior(e.target.value)}
              slotProps={{ htmlInput: { step: 'any' } }}
            />
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Peso
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            {esRelativo
              ? `Modo pesos relativos: nota de ${PESO_MINIMO} a ${PESO_MAXIMO_RELATIVO}, se normaliza al calcular.`
              : `Modo porcentaje exacto: de ${PESO_MINIMO}% a ${maximoPeso}%. Las demás variables se redistribuyen.`}
          </Typography>

          <TextField
            label={esRelativo ? 'Peso relativo' : 'Peso (%)'}
            type="number"
            required
            size="small"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            slotProps={{ htmlInput: { min: PESO_MINIMO, max: maximoPeso, step: 0.01 } }}
            sx={{ width: 200, mb: 2 }}
          />

          {previsualizacion.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Así quedarían los porcentajes del componente:
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'max-content max-content',
                  columnGap: 1,
                  rowGap: 0.25,
                  fontSize: '0.8125rem',
                }}
              >
                {previsualizacion.map((p) => (
                  <Fragment key={p.id}>
                    <Box component="span" sx={{ color: p.esActual ? 'primary.main' : 'text.secondary' }}>
                      {p.nombre}:
                    </Box>
                    <Box component="span" sx={{ fontWeight: p.esActual ? 700 : 400 }}>
                      {formatearPeso(p.valor)}
                    </Box>
                  </Fragment>
                ))}
              </Box>
            </Box>
          )}

          <Button type="submit" variant="contained">
            Guardar cambios
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
