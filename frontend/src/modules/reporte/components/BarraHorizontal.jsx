import { Box, Tooltip, Typography } from '@mui/material';

/**
 * Barra horizontal delgada (una serie): pista gris recesiva, relleno con
 * extremo redondeado y etiqueta directa del valor. `valor` viene en [0, max].
 */
export default function BarraHorizontal({
  valor,
  max = 1,
  color = 'primary.main',
  etiqueta,
  tooltip,
  alto = 10,
}) {
  const proporcion = valor == null ? 0 : Math.max(0, Math.min(1, valor / max));

  const barra = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <Box sx={{ flex: 1, height: alto, borderRadius: `${alto / 2}px`, bgcolor: 'action.hover' }}>
        <Box
          sx={{
            width: `${proporcion * 100}%`,
            height: '100%',
            borderRadius: `${alto / 2}px`,
            backgroundColor: color,
            transition: 'width 300ms ease',
          }}
        />
      </Box>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, minWidth: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
      >
        {etiqueta ?? (valor == null ? '—' : valor)}
      </Typography>
    </Box>
  );

  return tooltip ? <Tooltip title={tooltip} placement="top" arrow>{barra}</Tooltip> : barra;
}
