import { Link as RouterLink, useParams } from 'react-router-dom';
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import { getComponente, getVariable } from '../data/variablesMonitor.js';
import useMediciones from '../hooks/useMediciones.js';
import { describirUmbrales, estadoDeVariable, formatearValor } from '../lib/estadoVariable.js';
import { calcularDominio, expandirDominio } from '../lib/escalaUmbrales.js';
import EscalaUmbrales from '../components/EscalaUmbrales.jsx';
import { formatearPeso } from '../lib/pesos.js';
import EstadoChip from '../components/EstadoChip.jsx';

function Field({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <Box>
      <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
        {label}:{' '}
      </Typography>
      <Typography component="span" variant="body2" color="text.secondary">
        {value}
      </Typography>
    </Box>
  );
}

export default function VariableDetallePage() {
  const { baseDatosId, componente: componenteId, variableId } = useParams();
  const componente = getComponente(componenteId);
  const variable = getVariable(componenteId, variableId);
  const volverA = `/monitor/${baseDatosId}/${componenteId}`;
  // Valor real medido por el collector, refrescado solo como el resto del monitor.
  const { mediciones } = useMediciones(baseDatosId, componenteId);

  if (!componente || !variable) {
    return (
      <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
        <Button component={RouterLink} to={volverA} startIcon={<ArrowBackIcon />} variant="outlined" sx={{ mb: 3 }}>
          Volver
        </Button>
        <Typography variant="h6">Variable no encontrada</Typography>
        <Typography variant="body2" color="text.secondary">
          No existe la variable «{variableId}».
        </Typography>
      </Box>
    );
  }

  const estado = estadoDeVariable(variable, mediciones);
  const esConfiguracion = variable.esConfiguracion === true;
  const escalaUmbrales = describirUmbrales(variable);

  return (
    <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
      <Stack direction="row" spacing={2} useFlexGap sx={{ mb: 3, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Button component={RouterLink} to={volverA} startIcon={<ArrowBackIcon />} variant="outlined">
          Volver a {componente.titulo.toLowerCase()}
        </Button>
        <Button component={RouterLink} to={`/monitor/${baseDatosId}/${componenteId}/${variableId}/editar`} startIcon={<EditIcon />} variant="contained">
          Editar
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
          {variable.variable}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
          <Chip label={variable.dato} size="small" variant="outlined" />
          <Typography variant="body2" color="text.secondary">
            {componente.titulo} ({componente.indicador})
          </Typography>
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Stack spacing={1.5}>
          <Field label={componente.etiquetaSecundaria} value={variable[componente.campoSecundario]} />
          <Field label="Fuente" value={variable.fuente} />
          <Field label="Cómo" value={variable.como} />
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
          Valor actual
        </Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: esConfiguracion ? 0 : 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {formatearValor(estado)}
          </Typography>
          {estado.estado && <EstadoChip color={estado.color} label={estado.estado} />}
          {!estado.medido && (
            <Chip label="Sin dato del collector" size="small" variant="outlined" />
          )}
          {estado.medido && esConfiguracion && (
            <Chip label="Valor de configuración" size="small" variant="outlined" />
          )}
        </Stack>
        {escalaUmbrales && (
          <>
            <Box sx={{ mt: 2, mb: 1 }}>
              <EscalaUmbrales
                umbralVerde={variable.umbralVerde}
                umbralRojo={variable.umbralRojo}
                unidad={variable.unidad}
                dominio={expandirDominio(
                  calcularDominio(variable.umbralVerde, variable.umbralRojo, variable.unidad),
                  estado.medido ? estado.valor : null,
                  variable.unidad,
                )}
                valorActual={estado.medido ? Number(estado.valor) : undefined}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {escalaUmbrales}
            </Typography>
          </>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
          Por qué se eligió esta variable
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {variable.justificacion}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
          Peso
        </Typography>
        <Field label={`Peso dentro de ${componente.indicador}`} value={formatearPeso(variable.peso)} />
      </Paper>
    </Box>
  );
}
