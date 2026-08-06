import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Divider, List, ListItem, ListItemText,
  Paper, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import { useAuth } from '../../../common/context/AuthContext.jsx';
import {
  getCuestionario, getHallazgos, getMapaCalor, getResumen,
} from '../../internal-control-questionnaire/services/cuestionarios.js';
import { getMadurez, getNoAplicables, getRiesgo } from '../services/reportes.js';
import { CardsSkeleton } from '../../../common/components/loading/Skeletons.jsx';
import MadurezChart from '../components/MadurezChart.jsx';
import RiesgoChart from '../components/RiesgoChart.jsx';
import SemaforoChip from '../components/SemaforoChip.jsx';

const DIMENSION_LABEL = {
  confidencialidad: 'Confidencialidad',
  integridad: 'Integridad',
  disponibilidad: 'Disponibilidad',
};

const NIVEL_RIESGO_LABEL = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto', sin_datos: 'Sin datos' };

function Seccion({ titulo, descripcion, children }) {
  return (
    <Box sx={{ mb: 4, breakInside: 'avoid' }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {titulo}
      </Typography>
      {descripcion && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {descripcion}
        </Typography>
      )}
      {children}
    </Box>
  );
}

function Indicador({ label, valor, chip }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </Typography>
      {chip}
    </Paper>
  );
}

export default function ReporteEjecutivoPage() {
  const { cuestionarioId } = useParams();
  const { session } = useAuth();

  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCuestionario(cuestionarioId),
      getResumen(cuestionarioId),
      getMadurez(cuestionarioId),
      getRiesgo(cuestionarioId),
      getMapaCalor(cuestionarioId),
      getHallazgos(cuestionarioId),
      getNoAplicables(cuestionarioId),
    ])
      .then(([cuestionario, resumen, madurez, riesgo, mapaCalor, hallazgos, noAplicables]) =>
        setDatos({ cuestionario, resumen, madurez, riesgo, mapaCalor, hallazgos, noAplicables }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [cuestionarioId]);

  const backTo = session?.rol === 'evaluador' ? `/internal-control-questionnaire/${cuestionarioId}` : '/panel';

  if (loading) {
    return (
      <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
        <Skeleton variant="text" width="45%" height={48} />
        <Skeleton variant="text" width="60%" sx={{ mb: 3 }} />
        <CardsSkeleton cantidad={4} columnas={{ xs: '1fr 1fr', md: 'repeat(4, 1fr)' }} />
        <Box sx={{ mt: 4 }}>
          <Skeleton variant="text" width={280} height={34} />
          <Skeleton variant="rounded" height={160} sx={{ mt: 1.5, mb: 4 }} />
          <Skeleton variant="text" width={280} height={34} />
          <Skeleton variant="rounded" height={320} sx={{ mt: 1.5 }} />
        </Box>
      </Box>
    );
  }

  if (!datos) {
    return (
      <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
        <Button component={RouterLink} to={backTo} startIcon={<ArrowBackIcon />} variant="outlined" sx={{ mb: 3 }}>
          Volver
        </Button>
        <Alert severity="error">{error || 'No se pudo cargar el reporte.'}</Alert>
      </Box>
    );
  }

  const { cuestionario, resumen, madurez, riesgo, mapaCalor, hallazgos, noAplicables } = datos;
  const general = riesgo.indice_general;
  const madurezGlobal = madurez.global.indice_madurez;
  const topExposicion = riesgo.controles.filter((c) => c.exposicion > 0).slice(0, 5);

  return (
    <Box className="reporte-ejecutivo" sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        className="no-print"
        sx={{ mb: 3, flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Button component={RouterLink} to={backTo} startIcon={<ArrowBackIcon />} variant="outlined">
          Volver
        </Button>
        <Button onClick={() => window.print()} startIcon={<PrintIcon />} variant="contained">
          Imprimir / PDF
        </Button>
      </Stack>

      {/* Encabezado */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Reporte ejecutivo de resultados
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Evaluación de controles ISO/IEC 27002 — administración de bases de datos
        </Typography>
        <Stack direction="row" spacing={3} useFlexGap sx={{ mt: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="body2"><b>Organización:</b> {cuestionario.organizacion}</Typography>
          <Typography variant="body2"><b>Auditor:</b> {cuestionario.evaluador}</Typography>
          <Typography variant="body2"><b>Fecha:</b> {cuestionario.fecha}</Typography>
          <Typography variant="body2">
            <b>Avance:</b> {cuestionario.respuestas_registradas}/{cuestionario.preguntas_en_catalogo} preguntas
          </Typography>
        </Stack>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Indicadores principales */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, mb: 4 }}>
        <Indicador
          label="Exposición al riesgo"
          valor={general.exposicion == null ? '—' : `${(general.exposicion * 100).toFixed(1)}%`}
          chip={<SemaforoChip color={general.color} label={`Riesgo ${NIVEL_RIESGO_LABEL[general.nivel_riesgo]}`} />}
        />
        <Indicador
          label="Madurez global"
          valor={madurezGlobal == null ? '—' : `${madurezGlobal.toFixed(2)} / 5`}
        />
        <Indicador
          label="Cumplimiento"
          valor={resumen.cumplimiento == null ? '—' : `${Math.round(resumen.cumplimiento * 100)}%`}
        />
        <Indicador
          label="Controles evaluados"
          valor={`${madurez.global.controles_evaluados} / ${madurez.controles.length}`}
        />
      </Box>

      <Seccion
        titulo="Exposición al riesgo por dimensión"
        descripcion="Deficiencia de los controles ponderada por su peso y su relevancia sobre cada propiedad (Primario 1.0, Secundario 0.5)."
      >
        <RiesgoChart dimensiones={riesgo.dimensiones} />
      </Seccion>

      <Seccion
        titulo="Nivel de madurez por control"
        descripcion="Índice continuo 0–5 derivado de las tasas de cumplimiento, documentación, repetibilidad y evidencia."
      >
        <MadurezChart controles={madurez.controles} />
      </Seccion>

      <Seccion
        titulo="Mapa de calor — cumplimiento por dimensión"
        descripcion="Porcentaje de preguntas aplicables respondidas «Sí» en los controles que protegen cada propiedad."
      >
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
          {mapaCalor.dimensiones.map((d) => (
            <Paper key={d.dimension} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {DIMENSION_LABEL[d.dimension] ?? d.dimension}
              </Typography>
              <SemaforoChip
                color={d.color}
                label={d.cumplimiento == null ? 'Sin datos' : `${Math.round(d.cumplimiento * 100)}% cumplido`}
              />
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                {d.cumplidos}/{d.aplicables} preguntas aplicables cumplidas
              </Typography>
            </Paper>
          ))}
        </Box>
      </Seccion>

      {topExposicion.length > 0 && (
        <Seccion
          titulo="Controles con mayor exposición al riesgo"
          descripcion="Prioridades de remediación: exposición = (peso / 10) × deficiencia de madurez."
        >
          <Paper variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Control</TableCell>
                  <TableCell align="right">Peso</TableCell>
                  <TableCell align="right">Madurez</TableCell>
                  <TableCell align="right">Deficiencia</TableCell>
                  <TableCell align="right">Exposición</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topExposicion.map((c) => (
                  <TableRow key={c.control_id}>
                    <TableCell sx={{ fontWeight: 700 }}>{c.codigo}</TableCell>
                    <TableCell>{c.nombre}</TableCell>
                    <TableCell align="right">{c.peso}</TableCell>
                    <TableCell align="right">{c.indice_madurez.toFixed(2)}</TableCell>
                    <TableCell align="right">{Math.round(c.deficiencia * 100)}%</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {(c.exposicion * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Seccion>
      )}

      {hallazgos.length > 0 && (
        <Seccion
          titulo="Principales hallazgos"
          descripcion="Preguntas respondidas «No», ordenadas por la importancia (peso) del control."
        >
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <List dense disablePadding>
              {hallazgos.slice(0, 10).map((h, i) => (
                <Box key={h.pregunta_id}>
                  {i > 0 && <Divider component="li" />}
                  <ListItem>
                    <ListItemText
                      primary={`${h.codigo} — ${h.control} (peso ${h.peso})`}
                      secondary={h.texto}
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          </Paper>
        </Seccion>
      )}

      {noAplicables.length > 0 && (
        <Seccion
          titulo="Preguntas no aplicables"
          descripcion="Excluidas del cálculo de cumplimiento, madurez y riesgo, con la justificación registrada durante la auditoría."
        >
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <List dense disablePadding>
              {noAplicables.map((na, i) => (
                <Box key={na.pregunta_id}>
                  {i > 0 && <Divider component="li" />}
                  <ListItem sx={{ display: 'block', py: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {na.codigo} — {na.control}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {na.texto}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.75 }}>
                      <b>Justificación:</b> {na.justificacion_no_aplica}
                    </Typography>
                  </ListItem>
                </Box>
              ))}
            </List>
          </Paper>
        </Seccion>
      )}

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="text.disabled">
        Generado por CloudCR — metodologías de madurez y riesgo documentadas en los entregables del
        proyecto. Escala de madurez: 0 inexistente · 1 informal · 2 parcial · 3 documentado ·
        4 supervisado con evidencias · 5 mejora continua. Riesgo: bajo &lt; 15% ≤ medio &lt; 40% ≤ alto.
      </Typography>
    </Box>
  );
}
