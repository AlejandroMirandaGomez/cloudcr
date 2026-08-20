import { useState } from 'react';
import { IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { MODO_PESOS_RELATIVOS, PESO_MINIMO, formatearPeso } from '../lib/pesos.js';

export default function PesoCell({ fila, editando, modo, maximo, onEditar, onAlternarBloqueo }) {
  const esRelativo = modo === MODO_PESOS_RELATIVOS;
  const [textoEnEdicion, setTextoEnEdicion] = useState(null);

  const manejarCambio = (event) => {
    const texto = event.target.value;
    setTextoEnEdicion(texto);
    if (texto.trim() !== '') onEditar(fila.id, texto);
  };

  const manejarSalida = () => {
    if (textoEnEdicion !== null && textoEnEdicion.trim() === '') onEditar(fila.id, PESO_MINIMO);
    setTextoEnEdicion(null);
  };

  if (!editando) {
    return (
      <Stack spacing={0.25}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatearPeso(fila.porcentaje)}
        </Typography>
        {esRelativo && (
          <Typography variant="caption" color="text.secondary">
            nota {fila.peso.toFixed(2)}
          </Typography>
        )}
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <TextField
        type="number"
        size="small"
        value={textoEnEdicion ?? fila.peso}
        disabled={fila.bloqueada}
        onChange={manejarCambio}
        onBlur={manejarSalida}
        slotProps={{ htmlInput: { min: PESO_MINIMO, max: maximo, step: 0.01 } }}
        sx={{ width: 96 }}
      />

      {esRelativo ? (
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 52 }}>
          {formatearPeso(fila.porcentaje)}
        </Typography>
      ) : (
        <Tooltip title={fila.bloqueada ? 'Desbloquear peso' : 'Bloquear peso'}>
          <IconButton
            size="small"
            color={fila.bloqueada ? 'primary' : 'default'}
            onClick={() => onAlternarBloqueo(fila.id)}
            aria-label={fila.bloqueada ? 'Desbloquear peso' : 'Bloquear peso'}
          >
            {fila.bloqueada ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}
