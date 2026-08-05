import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Tooltip, Typography, Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ListAltIcon from '@mui/icons-material/ListAlt';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../context/AuthContext.jsx';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 56;

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
    description: 'Reportes de cumplimiento y brechas para la toma de decisiones organizacionales. (Próximamente)',
  },
];

const ROL_LABEL = { evaluador: 'Evaluador', organizacion: 'Organización' };

function DrawerContent({ expanded, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, logout } = useAuth();

  const handleNav = (path) => {
    navigate(path);
    onClose?.();
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: expanded ? 2 : 1, py: 2, display: 'flex', alignItems: 'center', justifyContent: expanded ? 'space-between' : 'center', minHeight: 52 }}>
        {expanded && (
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap' }}>
            CloudCR
          </Typography>
        )}
        {onClose && (
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Navegación */}
      <List dense sx={{ px: expanded ? 1 : 0.5, pt: 1 }}>
        {NAV_ITEMS.filter((item) => item.show(session)).map(({ label, icon, path }) => (
          <Tooltip key={path} title={expanded ? '' : label} placement="right">
            <ListItemButton
              selected={location.pathname === path}
              onClick={() => handleNav(path)}
              sx={{ borderRadius: 1, mb: 0.5, justifyContent: expanded ? 'flex-start' : 'center', px: expanded ? 1.5 : 1 }}
            >
              <ListItemIcon sx={{ minWidth: expanded ? 36 : 'unset', color: location.pathname === path ? 'primary.main' : 'inherit', justifyContent: 'center' }}>
                {icon}
              </ListItemIcon>
              {expanded && (
                <ListItemText primary={label} primaryTypographyProps={{ fontSize: '0.875rem', noWrap: true }} />
              )}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>

      {/* Servicios — solo cuando está expandido */}
      {expanded && (
        <>
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
        </>
      )}

      {/* Footer — usuario y logout */}
      <Box sx={{ mt: 'auto' }}>
        <Divider />
        <Tooltip title={expanded ? '' : 'Cerrar sesión'} placement="right">
          <Box
            sx={{
              px: expanded ? 2 : 1,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: expanded ? 'space-between' : 'center',
              gap: 1,
            }}
          >
            {expanded && session && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session.nombre}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {ROL_LABEL[session.rol] ?? session.rol}
                </Typography>
              </Box>
            )}
            <IconButton size="small" onClick={handleLogout} aria-label="Cerrar sesión">
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}

export default function Sidebar() {
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const expanded = hovered;

  return (
    <>
      {/* Botón hamburguesa — solo mobile */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, position: 'fixed', top: 12, left: 12, zIndex: 1300 }}>
        <Tooltip title="Menú">
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ bgcolor: 'background.paper', boxShadow: 2, '&:hover': { bgcolor: 'background.paper' } }}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Drawer permanente con hover — desktop */}
      <Drawer
        variant="permanent"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          display: { xs: 'none', md: 'block' },
          width: expanded ? DRAWER_WIDTH : COLLAPSED_WIDTH,
          flexShrink: 0,
          transition: 'width 200ms ease',
          '& .MuiDrawer-paper': {
            width: expanded ? DRAWER_WIDTH : COLLAPSED_WIDTH,
            boxSizing: 'border-box',
            overflowX: 'hidden',
            transition: 'width 200ms ease',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <DrawerContent expanded={expanded} />
      </Drawer>

      {/* Drawer temporal — mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        <DrawerContent expanded onClose={() => setMobileOpen(false)} />
      </Drawer>
    </>
  );
}

export { DRAWER_WIDTH, COLLAPSED_WIDTH };
