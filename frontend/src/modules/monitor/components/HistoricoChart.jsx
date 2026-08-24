import { Box, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const WIDTH = 600;
const HEIGHT = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };

/**
 * Evolucion del ISBD como linea simple en SVG (sin libreria de graficos
 * externa, igual que BarraHorizontal/RiesgoChart en reporte/).
 * El eje Y se ajusta al rango de los datos para que la tendencia se note;
 * la escala real del indice es 0-100.
 *
 * Cada punto es un snapshot del collector, no un dia: con el intervalo corto
 * del demo pueden ser segundos. Por eso el eje X usa la hora de captura.
 */
export default function HistoricoChart({ historico }) {
  const theme = useTheme();

  // Con menos de dos puntos no hay linea que dibujar (y x() dividiria por 0).
  if (historico.length < 2) {
    return (
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Evolución del ISBD
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {historico.length === 0
            ? 'Todavía no hay mediciones registradas para esta base de datos.'
            : 'Se necesita al menos una medición más para dibujar la tendencia.'}
        </Typography>
      </Paper>
    );
  }

  const lineColor = theme.palette.primary.main;
  const gridColor = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const textColor = theme.palette.text.secondary;

  const valores = historico.map((h) => h.isbd);
  let min = Math.max(0, Math.floor(Math.min(...valores) / 5) * 5 - 5);
  let max = Math.min(100, Math.ceil(Math.max(...valores) / 5) * 5 + 5);
  // Si el ISBD no se movio, min y max coinciden y y() dividiria por 0.
  if (max - min < 1) {
    min = Math.max(0, min - 5);
    max = Math.min(100, max + 5);
  }

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
      <Stack spacing={0.25} sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Evolución del ISBD (últimas {historico.length} mediciones)
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
            // La clave va por id de snapshot: con intervalos de segundos, dos
            // capturas pueden compartir la misma etiqueta de hora.
            <circle key={historico[i].id ?? i} cx={px} cy={py} r={i === puntos.length - 1 ? 4.5 : 3} fill={lineColor}>
              <title>{`${historico[i].fecha}: ${historico[i].isbd}`}</title>
            </circle>
          ))}

          <text x={PAD.left} y={HEIGHT - 8} fontSize={11} fill={textColor}>
            {historico[0].etiqueta ?? historico[0].fecha}
          </text>
          <text x={WIDTH - PAD.right} y={HEIGHT - 8} fontSize={11} fill={textColor} textAnchor="end">
            {historico[historico.length - 1].etiqueta ?? historico[historico.length - 1].fecha}
          </text>
        </svg>
      </Box>
    </Paper>
  );
}
