import { Box, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const WIDTH = 600;
const HEIGHT = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };

/**
 * Evolucion historica del ISBD como linea simple en SVG (sin libreria de
 * graficos externa, igual que BarraHorizontal/RiesgoChart en reporte/).
 * El eje Y se ajusta al rango de los datos para que la tendencia se note;
 * el pie deja claro que la escala real del indice es 0-100.
 */
export default function HistoricoChart({ historico }) {
  const theme = useTheme();
  const lineColor = theme.palette.primary.main;
  const gridColor = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const textColor = theme.palette.text.secondary;

  const valores = historico.map((h) => h.isbd);
  const min = Math.max(0, Math.floor(Math.min(...valores) / 5) * 5 - 5);
  const max = Math.min(100, Math.ceil(Math.max(...valores) / 5) * 5 + 5);

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const x = (i) => PAD.left + (i / (historico.length - 1)) * innerW;
  const y = (v) => PAD.top + innerH - ((v - min) / (max - min)) * innerH;

  const puntos = historico.map((h, i) => [x(i), y(h.isbd)]);
  const path = puntos.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const area = `${path} L${puntos[puntos.length - 1][0].toFixed(1)},${PAD.top + innerH} L${puntos[0][0].toFixed(1)},${PAD.top + innerH} Z`;

  const gridLineas = [min, (min + max) / 2, max];

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Evolucion del ISBD (ultimos {historico.length} dias)
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Escala real 0-100 · eje ajustado a {min}-{max}
        </Typography>
      </Stack>

      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label="Grafico de evolucion del ISBD">
          {gridLineas.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(v)} y2={y(v)} stroke={gridColor} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={textColor}>
                {Math.round(v)}
              </text>
            </g>
          ))}

          <path d={area} fill={lineColor} opacity={0.12} stroke="none" />
          <path d={path} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {puntos.map(([px, py], i) => (
            <circle key={historico[i].fecha} cx={px} cy={py} r={i === puntos.length - 1 ? 4.5 : 3} fill={lineColor}>
              <title>{`${historico[i].fecha}: ${historico[i].isbd}`}</title>
            </circle>
          ))}

          <text x={PAD.left} y={HEIGHT - 8} fontSize={11} fill={textColor}>
            {historico[0].fecha}
          </text>
          <text x={WIDTH - PAD.right} y={HEIGHT - 8} fontSize={11} fill={textColor} textAnchor="end">
            {historico[historico.length - 1].fecha}
          </text>
        </svg>
      </Box>
    </Paper>
  );
}
