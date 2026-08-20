import { Alert, Box, Button, Chip, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { MODO_PESOS_RELATIVOS, MODO_PORCENTAJE_EXACTO } from '../lib/pesos.js';

export default function PesosToolbar({
  editando,
  modo,
  sumaActual,
  aviso,
  onIniciarEdicion,
  onCancelar,
  onGuardar,
  onCambiarModo,
  onRestablecerEquitativo,
}) {
  const esRelativo = modo === MODO_PESOS_RELATIVOS;

  return (
    <Box sx={{ mb: 2 }}>
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: 'wrap', alignItems: 'center' }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Pesos
        </Typography>

        {editando ? (
          <>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={modo}
              onChange={(_, nuevoModo) => onCambiarModo(nuevoModo)}
            >
              <ToggleButton value={MODO_PORCENTAJE_EXACTO}>Porcentaje exacto</ToggleButton>
              <ToggleButton value={MODO_PESOS_RELATIVOS}>Pesos relativos</ToggleButton>
            </ToggleButtonGroup>

            <Chip
              size="small"
              variant="outlined"
              color={esRelativo || sumaActual === 100 ? 'default' : 'warning'}
              label={esRelativo
                ? 'Se normaliza a 100%'
                : `Suma ${sumaActual.toFixed(2)}%`}
            />

            <Box sx={{ flex: 1 }} />

            <Button size="small" startIcon={<RestartAltIcon />} onClick={onRestablecerEquitativo}>
              Restablecer a equitativo
            </Button>
            <Button size="small" startIcon={<CloseIcon />} onClick={onCancelar}>
              Cancelar
            </Button>
            <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={onGuardar}>
              Guardar
            </Button>
          </>
        ) : (
          <>
            <Chip
              size="small"
              variant="outlined"
              label={esRelativo ? 'Modo pesos relativos' : 'Modo porcentaje exacto'}
            />
            <Box sx={{ flex: 1 }} />
            <Button size="small" startIcon={<RestartAltIcon />} onClick={onRestablecerEquitativo}>
              Restablecer a equitativo
            </Button>
            <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={onIniciarEdicion}>
              Editar pesos
            </Button>
          </>
        )}
      </Stack>

      {aviso && (
        <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>
          {aviso}
        </Alert>
      )}

      {editando && esRelativo && (
        <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
          Cada peso es una nota independiente de 0.01 a 100. El porcentaje real se calcula
          normalizando sobre la suma total al guardar.
        </Alert>
      )}
    </Box>
  );
}
