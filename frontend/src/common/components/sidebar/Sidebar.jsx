import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Tooltip, Typography, Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ListAltIcon from '@mui/icons-material/ListAlt';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../context/AuthContext.jsx';
import useCerrarSesion from '../../hooks/useCerrarSesion.js';

const DRAWER_WIDTH = 280;

const NAV_ITEMS = [
  { label: 'Inicio', icon: <HomeIcon />, path: '/', show: () => true },
  { label: 'Mi Panel', icon: <DashboardIcon />, path: '/panel', show: (session) => !!session },
  { label: 'Editar perfil', icon: <PersonIcon />, path: '/perfil', show: (session) => !!session },
  {
    label: 'Cuestionario de Control Interno',
    icon: <AssignmentIcon />,
    path: '/internal-control-questionnaire',
    show: (session) => session?.rol === 'evaluador',
  },
  { label: 'Lista de Controles', icon: <ListAltIcon />, path: '/control-list', show: () => true },
];

const SERVICES = [
  {
    title: 'Evaluación de Riesgo',
    description: 'Identificación y análisis de riesgos en la administración de bases de datos según ISO/IEC 27002.',
  },
  {
    title: 'Cuestionario de Control Interno',
    description: 'Evaluación del cumplimiento de controles de seguridad mediante preguntas estructuradas por control.',
  },
  {
    title: 'Lista de Controles ISO 27002',
    description: 'Catálogo completo de controles con propiedades de confidencialidad, integridad y disponibilidad.',
  },
  {
    title: 'Generación de Reportes',
    description: 'Reporte ejecutivo con madurez, exposición al riesgo, mapa de calor y hallazgos por auditoría.',
  },
];

const ROL_LABEL = { evaluador: 'Evaluador', organizacion: 'Organización' };

function DrawerContent({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const cerrarSesion = useCerrarSesion();

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    onClose();
    cerrarSesion();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Menú
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Cerrar menú">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider />

      {/* Navegación */}
      <List dense sx={{ px: 1, pt: 1 }}>
        {NAV_ITEMS.filter((item) => item.show(session)).map(({ label, icon, path }) => (
          <ListItemButton
            key={path}
            selected={location.pathname === path}
            onClick={() => handleNav(path)}
            sx={{ borderRadius: 1, mb: 0.5, px: 1.5 }}
          >
            <ListItemIcon
              sx={{ minWidth: 36, color: location.pathname === path ? 'primary.main' : 'inherit' }}
            >
              {icon}
            </ListItemIcon>
            <ListItemText primary={label} slotProps={{ primary: { fontSize: '0.875rem', noWrap: true } }} />
          </ListItemButton>
        ))}
      </List>

      {/* Servicios */}
      <Divider sx={{ mx: 2, my: 1 }} />
      <Box sx={{ px: 2, pb: 2, overflowY: 'auto', flex: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Servicios
        </Typography>
        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SERVICES.map(({ title, description }) => (
            <Box key={title}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                {description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Footer — usuario y logout */}
      {session && (
        <Box sx={{ mt: 'auto' }}>
          <Divider />
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session.nombre}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {ROL_LABEL[session.rol] ?? session.rol}
              </Typography>
            </Box>
            <Tooltip title="Cerrar sesión">
              <IconButton size="small" onClick={handleLogout} aria-label="Cerrar sesión">
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/** Menú principal: drawer temporal controlado desde la barra superior. */
export default function Sidebar({ open, onClose }) {
  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
    >
      <DrawerContent onClose={onClose} />
    </Drawer>
  );
}

export { DRAWER_WIDTH };
