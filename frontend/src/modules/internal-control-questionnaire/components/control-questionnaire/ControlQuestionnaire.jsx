import { useState } from 'react';
import { Box, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';
import { getRespuestas, setRespuesta } from '../../data/answersStore.js';

const OPCIONES = ['Sí', 'No', 'N/A'];

const SUBPREGUNTAS = [
  { campo: 'documentado', label: '¿Está documentado?' },
  { campo: 'repetible', label: '¿Es repetible?' },
  { campo: 'evidencia', label: '¿Tiene evidencia?' },
];

function RespuestaSelect({ label, value, onChange }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Select
        size="small"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ minWidth: 92, '& .MuiSelect-select': { py: 0.5, fontSize: '0.875rem' } }}
      >
        {OPCIONES.map((op) => (
          <MenuItem key={op} value={op}>{op}</MenuItem>
        ))}
      </Select>
    </Stack>
  );
}

export default function ControlQuestionnaire({ control }) {
  const [respuestas, setRespuestas] = useState(() => getRespuestas(control.codigo));

  const onRespuesta = (indicePregunta, campo, valor) => {
    setRespuestas(setRespuesta(control.codigo, indicePregunta, campo, valor));
  };

  return (
    <Stack spacing={2}>
      {control.preguntas.map((pregunta, i) => {
        const respuesta = respuestas[i];

        return (
          <Paper key={i} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 20 }}>
                {i + 1}.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {pregunta}
              </Typography>
            </Stack>

            <Box sx={{ mt: 2, pl: { xs: 0, sm: 4.5 } }}>
              <RespuestaSelect
                label="¿Cumple?"
                value={respuesta.cumple}
                onChange={(valor) => onRespuesta(i, 'cumple', valor)}
              />

              {respuesta.cumple === 'Sí' && (
                <Stack
                  direction="row"
                  spacing={3}
                  useFlexGap
                  sx={{ mt: 2, flexWrap: 'wrap' }}
                >
                  {SUBPREGUNTAS.map(({ campo, label }) => (
                    <RespuestaSelect
                      key={campo}
                      label={label}
                      value={respuesta[campo]}
                      onChange={(valor) => onRespuesta(i, campo, valor)}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
}
