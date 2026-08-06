import { Box, Chip, MenuItem, Paper, Select, Stack, Typography } from '@mui/material';

const OPCIONES = ['Sí', 'No', 'N/A'];

const SUBPREGUNTAS = [
  { campo: 'documentado', label: '¿Está documentado?' },
  { campo: 'repetible', label: '¿Es repetible?' },
  { campo: 'evidencia', label: '¿Tiene evidencia?' },
];

function RespuestaSelect({ label, value, onChange, disabled = false }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Select
        size="small"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        displayEmpty
        renderValue={(v) => (v === '' ? '—' : v)}
        sx={{ minWidth: 92, '& .MuiSelect-select': { py: 0.5, fontSize: '0.875rem' } }}
      >
        {OPCIONES.map((op) => (
          <MenuItem key={op} value={op}>{op}</MenuItem>
        ))}
      </Select>
    </Stack>
  );
}

/**
 * Componente controlado: `respuestas` mapea pregunta_id → { cumple, documentado,
 * repetible, evidencia } (o undefined si la pregunta no se ha respondido).
 */
export default function ControlQuestionnaire({ preguntas, respuestas, onChange }) {
  return (
    <Stack spacing={2}>
      {preguntas.map((pregunta, i) => {
        const respuesta = respuestas[pregunta.id];
        const respondida = respuesta?.cumple != null;

        return (
          <Paper key={pregunta.id} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 20 }}>
                {i + 1}.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                {pregunta.texto}
              </Typography>
              {!respondida && (
                <Chip label="Sin responder" size="small" variant="outlined" sx={{ flexShrink: 0 }} />
              )}
            </Stack>

            <Box sx={{ mt: 2, pl: { xs: 0, sm: 4.5 } }}>
              <RespuestaSelect
                label="¿Cumple?"
                value={respuesta?.cumple}
                onChange={(valor) => onChange(pregunta.id, 'cumple', valor)}
              />

              {respondida && (
                <Stack direction="row" spacing={3} useFlexGap sx={{ mt: 2, flexWrap: 'wrap' }}>
                  {SUBPREGUNTAS.map(({ campo, label }) => (
                    <RespuestaSelect
                      key={campo}
                      label={label}
                      value={respuesta?.[campo]}
                      onChange={(valor) => onChange(pregunta.id, campo, valor)}
                      disabled={respuesta?.cumple === 'N/A'}
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
