import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Collapse, Drawer, IconButton, List, ListItemButton,
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
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../../context/AuthContext.jsx';
import { useColorMode } from '../../context/ColorModeContext.jsx';

const DRAWER_WIDTH = 320;
const MENU_BUTTON_OFFSET = 12;
const MENU_BUTTON_SIZE = 40;
const TOP_BAR_HEIGHT = MENU_BUTTON_OFFSET * 2 + MENU_BUTTON_SIZE;

const NAV_ITEMS = [
  { label: 'Inicio', icon: <HomeIcon />, path: '/', show: () => true },
  { label: 'Mi Panel', icon: <DashboardIcon />, path: '/panel', show: (session) => !!session },
  {
    label: 'Evaluación del riesgo',
    icon: <SecurityIcon />,
    children: [
      {
        label: 'Cuestionario de Control Interno',
        icon: <AssignmentIcon />,
        path: '/internal-control-questionnaire',
        show: (session) => session?.rol === 'evaluador',
      },
      {
        label: 'Lista de Controles',
        icon: <ListAltIcon />,
        path: '/control-list',
        show: () => true,
      },
    ],
  },
];

const ROL_LABEL = { evaluador: 'Evaluador', organizacion: 'Organización' };

function DrawerContent({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, logout } = useAuth();
  const { mode, toggleMode } = useColorMode();
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = new Set();
    for (const item of NAV_ITEMS) {
      if (item.children?.some((child) => child.path === location.pathname)) {
        initial.add(item.label);
      }
    }
    return initial;
  });

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  const toggleGroup = (label) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap' }}>
          CloudCR
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            <IconButton size="small" onClick={toggleMode} aria-label="Cambiar tema">
              {mode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose} aria-label="Cerrar menú">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Divider />

      <List dense sx={{ px: 1, pt: 1, flex: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => {
          const { label, icon, path, children } = item;

          if (children) {
            const visibleChildren = children.filter((child) => child.show(session));
            if (visibleChildren.length === 0) return null;
            const isOpen = openGroups.has(label);

            return (
              <Box key={label}>
                <Typography
                  variant="overline"
                  sx={{ display: 'block', px: 1.5, pt: 1.5, pb: 0.5, fontWeight: 700, color: 'text.secondary' }}
                >
                  Productos
                </Typography>
                <ListItemButton
                  onClick={() => toggleGroup(label)}
                  sx={{ borderRadius: 1, mb: 0.5, px: 1.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
                  <ListItemText primary={label} slotProps={{ primary: { fontSize: '0.875rem', noWrap: true } }} />
                  {isOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </ListItemButton>
                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                  <List component="div" dense disablePadding>
                    {visibleChildren.map((child) => (
                      <ListItemButton
                        key={child.path}
                        selected={location.pathname === child.path}
                        onClick={() => handleNav(child.path)}
                        sx={{ borderRadius: 1, mb: 0.5, pl: 4 }}
                      >
                        <ListItemIcon
                          sx={{ minWidth: 36, color: location.pathname === child.path ? 'primary.main' : 'inherit' }}
                        >
                          {child.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={child.label}
                          slotProps={{ primary: { fontSize: '0.875rem', noWrap: true } }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </Box>
            );
          }

          if (!item.show(session)) return null;

          return (
            <Box key={path}>
              <ListItemButton
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
            </Box>
          );
        })}
      </List>

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
            <Tooltip title="Editar perfil">
              <Box
                onClick={() => handleNav('/perfil')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  minWidth: 0,
                  cursor: 'pointer',
                  borderRadius: 1,
                  px: 0.5,
                  py: 0.5,
                  mx: -0.5,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <PersonIcon fontSize="large" color="action" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {session.nombre}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {ROL_LABEL[session.rol] ?? session.rol}
                  </Typography>
                </Box>
              </Box>
            </Tooltip>
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

/** Menú principal: hamburguesa en todos los tamaños, con drawer temporal. */
export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <Box
          className="no-print"
          sx={{ position: 'fixed', top: MENU_BUTTON_OFFSET, left: MENU_BUTTON_OFFSET, zIndex: 1300 }}
        >
          <Tooltip title="Menú">
            <IconButton
              onClick={() => setOpen(true)}
              aria-label="Abrir menú"
              sx={{
                width: MENU_BUTTON_SIZE,
                height: MENU_BUTTON_SIZE,
                bgcolor: 'background.paper',
                boxShadow: 2,
                '&:hover': { bgcolor: 'background.paper' },
              }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Drawer
        variant="temporary"
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
      >
        <DrawerContent onClose={() => setOpen(false)} />
      </Drawer>
    </>
  );
}

export { DRAWER_WIDTH, TOP_BAR_HEIGHT };
