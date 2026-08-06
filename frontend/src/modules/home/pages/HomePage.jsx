import { useNavigate } from 'react-router-dom';
import {
  Avatar, Box, Button, Container, Divider,
  Paper, Stack, Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import LoginIcon from '@mui/icons-material/Login';
import SecurityIcon from '@mui/icons-material/Security';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BarChartIcon from '@mui/icons-material/BarChart';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { useAuth } from '../../../common/context/AuthContext.jsx';
import { heroSx } from '../../../common/styles/hero.js';

const SERVICIOS = [
  {
    icon: <SecurityIcon fontSize="large" color="primary" />,
    titulo: 'Evaluación de Riesgo',
    descripcion: 'Identificamos y analizamos los riesgos en la administración de bases de datos según ISO/IEC 27002, entregando un diagnóstico claro del estado de seguridad de tu organización.',
  },
  {
    icon: <AssignmentIcon fontSize="large" color="primary" />,
    titulo: 'Cuestionario de Control Interno',
    descripcion: 'Evaluamos el cumplimiento de cada control de seguridad mediante preguntas estructuradas, documentando evidencia y nivel de madurez por control.',
  },
  {
    icon: <BarChartIcon fontSize="large" color="primary" />,
    titulo: 'Reportes de Cumplimiento',
    descripcion: 'Generamos reportes detallados con mapa de calor, hallazgos y recomendaciones para la toma de decisiones estratégicas en seguridad de la información.',
  },
  {
    icon: <ListAltIcon fontSize="large" color="primary" />,
    titulo: 'Catálogo de Controles ISO 27002',
    descripcion: 'Acceso completo al catálogo de controles con propiedades de confidencialidad, integridad y disponibilidad, guías de implementación y preguntas de auditoría.',
  },
];

const EQUIPO = [
  { nombre: 'Juan Pablo Sánchez Bermúdez', rol: 'Desarrollador Backend & Base de Datos' },
  { nombre: 'Luis Hidalgo Calvo',             rol: 'Desarrollador Frontend' },
  { nombre: 'Josue David Sanchez Salazar',             rol: 'Analista de Seguridad' },
  { nombre: 'Alejandro Miranda',             rol: 'Gestión del Proyecto' },
];

function iniciales(nombre) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { session, logout } = useAuth();

  const handleAuthAction = () => {
    if (session) logout();
    else navigate('/login');
  };

  return (
    <Box>
      {/* Barra superior — separada del hero para no chocar con el titulo CloudCR */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, pt: 0.5, pb: 1.5 }}>
        <Button
          variant={session ? 'outlined' : 'contained'}
          size="small"
          startIcon={<LoginIcon />}
          onClick={handleAuthAction}
        >
          {session ? `Cerrar sesión (${session.nombre})` : 'Iniciar sesión'}
        </Button>
      </Box>

      {/* Hero */}
      <Box
        sx={{
          ...heroSx(theme.palette.mode),
          py: { xs: 6, md: 10 },
          px: 3,
          textAlign: 'center',
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, position: 'relative' }}>
          CloudCR
        </Typography>
        <Typography
          variant="h6"
          sx={{ fontWeight: 400, opacity: 0.75, maxWidth: 600, mx: 'auto', mb: 4, position: 'relative' }}
        >
          Evaluación del riesgo en administración de bases de datos basada en ISO/IEC 27002
        </Typography>
        {!session && (
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/login')}
            sx={{
              position: 'relative',
              bgcolor: '#26243a',
              '&:hover': { bgcolor: '#14142b' },
            }}
          >
            Iniciar sesión
          </Button>
        )}
      </Box>

      {/* Servicios */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
          Nuestros servicios
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 5 }}>
          Ayudamos a organizaciones a evaluar y mejorar su postura de seguridad en bases de datos.
        </Typography>
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
          {SERVICIOS.map(({ icon, titulo, descripcion }) => (
            <Paper key={titulo} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ mb: 1.5 }}>{icon}</Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>
                {titulo}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {descripcion}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Container>

      <Divider />

      {/* Equipo */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
          Nuestro equipo
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 5 }}>
          Estudiantes de Ingeniería en Sistemas de Información — EIF402 Administración de Bases de Datos.
        </Typography>
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
          {EQUIPO.map(({ nombre, rol }) => (
            <Paper key={nombre} variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
              <Avatar
                sx={{ width: 56, height: 56, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: '1.1rem', fontWeight: 700 }}
              >
                {iniciales(nombre)}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {nombre}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {rol}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Stack sx={{ mt: 6, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 600 }}>
            CloudCR es un proyecto integrador desarrollado para el curso EIF402 — Administración de Bases de Datos,
            basado en los controles de seguridad de la norma ISO/IEC 27002.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
