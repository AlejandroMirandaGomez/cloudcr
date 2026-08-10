import { useState } from 'react';
import { Box, ButtonBase, Chip, Paper, Stack, Typography } from '@mui/material';

const SIN_SELECCION = 'Pase el mouse por un nivel —o selecciónelo— para leer qué significa en este control.';

function NivelBoton({ nivel, seleccionado, resaltado, onSelect, onPreview, onPreviewEnd }) {
  return (
    <ButtonBase
      onClick={() => onSelect(nivel.nivel)}
      onMouseEnter={() => onPreview(nivel.nivel)}
      onMouseLeave={onPreviewEnd}
      onFocus={() => onPreview(nivel.nivel)}
      onBlur={onPreviewEnd}
      aria-pressed={seleccionado}
      aria-label={`Nivel ${nivel.nivel}: ${nivel.nombre}`}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        p: 1.5,
        borderRadius: 2,
        border: '2px solid',
        borderColor: seleccionado ? 'primary.main' : resaltado ? 'primary.light' : 'divider',
        bgcolor: seleccionado ? 'action.selected' : resaltado ? 'action.hover' : 'transparent',
        transition: 'border-color .15s, background-color .15s',
      }}
    >
      <Typography
        variant="h6"
        sx={{ fontWeight: 800, lineHeight: 1.1, color: seleccionado ? 'primary.main' : 'text.primary' }}
      >
        {nivel.nivel}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary', lineHeight: 1.25 }}>
        {nivel.nombre}
      </Typography>
    </ButtonBase>
  );
}

export default function MaturityLevelSelector({ niveles, valor, onChange }) {
  const [resaltado, setResaltado] = useState(null);

  const mostrado = resaltado ?? valor ?? null;
  const nivelMostrado = niveles.find((n) => n.nivel === mostrado) ?? null;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Nivel de madurez del control
        </Typography>
        <Chip
          label={valor == null ? 'Sin definir' : `Nivel ${valor}`}
          size="small"
          color={valor == null ? 'default' : 'success'}
          variant="outlined"
        />
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Escoja la descripción que mejor refleja la situación actual de la organización para este
        control. Es lo primero que se define y determina la madurez del control en el reporte.
      </Typography>

      {niveles.length === 0 ? (
        <Typography variant="body2" color="error.main">
          Este control no tiene descriptores de madurez cargados en el catálogo.
        </Typography>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' },
            }}
          >
            {niveles.map((nivel) => (
              <NivelBoton
                key={nivel.nivel}
                nivel={nivel}
                seleccionado={valor === nivel.nivel}
                resaltado={resaltado === nivel.nivel}
                onSelect={onChange}
                onPreview={setResaltado}
                onPreviewEnd={() => setResaltado(null)}
              />
            ))}
          </Box>

          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
              minHeight: 132,
            }}
          >
            {nivelMostrado ? (
              <>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Nivel {nivelMostrado.nivel} — {nivelMostrado.nombre}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {nivelMostrado.descripcion}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {SIN_SELECCION}
              </Typography>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
}
