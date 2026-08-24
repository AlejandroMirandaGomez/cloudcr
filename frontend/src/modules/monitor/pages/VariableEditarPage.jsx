import { Fragment, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Divider, Paper, Stack, TextField, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  actualizarPesos,
  actualizarUmbrales,
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
import { describirUmbrales } from '../lib/estadoVariable.js';
import { dominioParaEdicion, formatearNumero } from '../lib/escalaUmbrales.js';
import EscalaUmbrales from '../components/EscalaUmbrales.jsx';
import useAjustesVariables from '../hooks/useAjustesVariables.js';

const aNumero = (texto) => {
  if (texto === '' || texto === null || texto === undefined) return null;
  const numero = Number(texto);
  return Number.isNaN(numero) ? null : numero;
};

export default function VariableEditarPage() {
  const { baseDatosId, componente: componenteId, variableId } = useParams();
  const navigate = useNavigate();
  const componente = getComponente(componenteId);
  const variable = getVariable(componenteId, variableId);
  const detalleTo = `/monitor/${baseDatosId}/${componenteId}/${variableId}`;
  const esConfiguracion = variable?.esConfiguracion === true;

  const ajustes = useAjustesVariables(baseDatosId, componenteId);

  const preferencia = getPreferenciaPesos(componenteId);
  const pesosActuales = getPesos(componenteId);
  const esRelativo = preferencia.modo === MODO_PESOS_RELATIVOS;

  const [umbralVerde, setUmbralVerde] = useState(variable?.umbralVerde ?? '');
  const [umbralRojo, setUmbralRojo] = useState(variable?.umbralRojo ?? '');
  const [peso, setPeso] = useState(variable?.peso ?? '');
  const [error, setError] = useState('');
  const [versionCargada, setVersionCargada] = useState(0);

  if (variable && versionCargada !== ajustes.version) {
    setVersionCargada(ajustes.version);
    setUmbralVerde(variable.umbralVerde ?? '');
    setUmbralRojo(variable.umbralRojo ?? '');
    setPeso(variable.peso ?? '');
  }

  const escalaUmbrales = useMemo(
    () => describirUmbrales({
      umbralVerde: aNumero(umbralVerde),
      umbralRojo: aNumero(umbralRojo),
      unidad: variable?.unidad,
    }),
    [umbralVerde, umbralRojo, variable],
  );

  const dominioUmbrales = useMemo(
    () => dominioParaEdicion(
      { verde: variable?.umbralVerde, rojo: variable?.umbralRojo },
      { verde: aNumero(umbralVerde), rojo: aNumero(umbralRojo) },
      variable?.unidad,
    ),
    [variable, umbralVerde, umbralRojo],
  );

  const arrastrarUmbrales = ({ verde, rojo }) => {
    setUmbralVerde(formatearNumero(verde));
    setUmbralRojo(formatearNumero(rojo));
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const verde = aNumero(umbralVerde);
    const rojo = aNumero(umbralRojo);

    if (!esConfiguracion) {
      if (verde === null || rojo === null) {
        setError('Ingrese ambos umbrales: el valor Verde y el valor Rojo.');
        return;
      }
      if (verde === rojo) {
        setError('El umbral Verde y el umbral Rojo deben ser distintos.');
        return;
      }
    }

    const pesoNumero = Number(peso);

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

    if (!esConfiguracion) {
      actualizarUmbrales(componenteId, variableId, verde, rojo);
    }

    const pesosNuevos = esRelativo
      ? editarPesoModo2({ pesos: pesosActuales, id: variableId, nuevoValor: pesoNumero })
      : editarPesoModo1({
        pesos: pesosActuales,
        bloqueados: preferencia.bloqueados,
        id: variableId,
        nuevoValor: pesoNumero,
      });

    actualizarPesos(componenteId, pesosNuevos, preferencia);

    const guardado = await ajustes.persistir();

    if (!guardado.ok) {
      setError(guardado.error || 'No se pudieron guardar los cambios.');
      return;
    }

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
          {esConfiguracion ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              Esta variable es un dato de configuración (no cambia con la salud del momento), por lo
              que no tiene umbrales que editar.
            </Alert>
          ) : (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Umbrales
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Indique el valor Verde y el valor Rojo (unidad: {variable.unidad}). El orden define la
                dirección: si el Rojo es mayor que el Verde, los valores altos son peores; si es menor,
                los valores altos son mejores.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 1.5 }}>
                <TextField
                  label="Umbral Verde"
                  type="number"
                  fullWidth
                  size="small"
                  value={umbralVerde}
                  onChange={(e) => setUmbralVerde(e.target.value)}
                  slotProps={{ htmlInput: { step: 'any' } }}
                />
                <TextField
                  label="Umbral Rojo"
                  type="number"
                  fullWidth
                  size="small"
                  value={umbralRojo}
                  onChange={(e) => setUmbralRojo(e.target.value)}
                  slotProps={{ htmlInput: { step: 'any' } }}
                />
              </Stack>
              {dominioUmbrales ? (
                <>
                  <EscalaUmbrales
                    umbralVerde={aNumero(umbralVerde)}
                    umbralRojo={aNumero(umbralRojo)}
                    unidad={variable.unidad}
                    dominio={dominioUmbrales}
                    altoMaloPorDefecto={variable.umbralRojo > variable.umbralVerde}
                    onCambiar={arrastrarUmbrales}
                  />
                  <Alert severity="info" icon={false} sx={{ mt: 1.5, mb: 3 }}>
                    {escalaUmbrales ?? 'El umbral Verde y el umbral Rojo deben ser distintos: mueva una de las dos marcas.'}
                  </Alert>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                  Complete ambos umbrales, con valores distintos, para ver cómo queda la escala.
                </Typography>
              )}
            </>
          )}

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
