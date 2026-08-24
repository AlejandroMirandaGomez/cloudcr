import { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Slider, Stack, Typography,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
  ETIQUETAS_INDICE, INDICES_CONFIGURABLES, UMBRALES_INDICE_POR_DEFECTO,
  describirUmbralesIndice,
} from '../lib/indiceSalud.js';

const COLOR = { verde: '#2e7d32', amarillo: '#ed9b00', rojo: '#c62828' };

const SEPARACION_MINIMA = 1;

const gradiente = ({ verde, rojo }) => [
  'linear-gradient(to right',
  `${COLOR.rojo} 0%`,
  `${COLOR.rojo} ${rojo}%`,
  `${COLOR.amarillo} ${rojo}%`,
  `${COLOR.amarillo} ${verde}%`,
  `${COLOR.verde} ${verde}%`,
  `${COLOR.verde} 100%)`,
].join(', ');

function EscalaIndice({ clave, umbrales, onCambiar }) {
  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', mb: 0.5 }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {ETIQUETAS_INDICE[clave]}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {describirUmbralesIndice(umbrales)}
        </Typography>
      </Stack>

      <Slider
        value={[umbrales.rojo, umbrales.verde]}
        onChange={(evento, valores) => onCambiar(clave, { rojo: valores[0], verde: valores[1] })}
        min={0}
        max={100}
        step={1}
        disableSwap
        valueLabelDisplay="auto"
        marks={[{ value: 0, label: '0' }, { value: 50, label: '50' }, { value: 100, label: '100' }]}
        sx={{
          '& .MuiSlider-rail': { background: gradiente(umbrales), opacity: 1, height: 10 },
          '& .MuiSlider-track': { border: 'none', background: 'transparent' },
          '& .MuiSlider-thumb': {
            height: 20,
            width: 20,
            border: '3px solid #fff',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
          },
          '& .MuiSlider-thumb[data-index="0"]': { backgroundColor: COLOR.rojo },
          '& .MuiSlider-thumb[data-index="1"]': { backgroundColor: COLOR.verde },
        }}
      />
    </Box>
  );
}

export default function UmbralesIndiceDialog({ umbrales, onCerrar, onGuardar }) {
  const [borrador, setBorrador] = useState(umbrales);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const invalido = useMemo(
    () => INDICES_CONFIGURABLES.some(
      (clave) => borrador[clave].verde - borrador[clave].rojo < SEPARACION_MINIMA,
    ),
    [borrador],
  );

  const cambiar = (clave, valores) => {
    if (valores.verde - valores.rojo < SEPARACION_MINIMA) return;
    setBorrador((actual) => ({ ...actual, [clave]: valores }));
  };

  const guardar = async () => {
    setGuardando(true);
    const resultado = await onGuardar(borrador);
    setGuardando(false);
    if (resultado.ok) onCerrar();
    else setError(resultado.error);
  };

  return (
    <Dialog open onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Editar parámetros del semáforo</DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cada índice se califica de 0 a 100, donde más alto es mejor. Mueva las dos marcas para
          definir desde dónde el índice se considera Verde y hasta dónde se considera Rojo; lo que
          quede en medio es Amarillo. Es el mismo criterio con el que se colorea cada variable de la
          base de datos, pero aplicado al índice completo.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Estos umbrales solo cambian el color que se muestra: no alteran el valor calculado del
          ISBD, que siempre es el promedio (IP + IM + IA) / 3.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack spacing={3} divider={<Divider flexItem />}>
          {INDICES_CONFIGURABLES.map((clave) => (
            <EscalaIndice
              key={clave}
              clave={clave}
              umbrales={borrador[clave]}
              onCambiar={cambiar}
            />
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button
          startIcon={<RestartAltIcon />}
          onClick={() => setBorrador(UMBRALES_INDICE_POR_DEFECTO)}
        >
          Restablecer
        </Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={onCerrar} disabled={guardando}>Cancelar</Button>
          <Button variant="contained" onClick={guardar} disabled={guardando || invalido}>
            Guardar
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
