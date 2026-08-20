import { Link as RouterLink, useParams } from 'react-router-dom';
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import { formatearMetrica, getComponente, getVariable } from '../data/variablesMonitor.js';
import { formatearPeso } from '../lib/pesos.js';

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
          Métrica
        </Typography>
        <Stack direction="row" spacing={4} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Field label="Límite inferior" value={variable.limiteInferior} />
          <Field label="Límite superior" value={variable.limiteSuperior} />
          <Field label="Rango" value={formatearMetrica(variable)} />
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
          Peso
        </Typography>
        <Field label={`Peso dentro de ${componente.indicador}`} value={formatearPeso(variable.peso)} />
      </Paper>
    </Box>
  );
}
