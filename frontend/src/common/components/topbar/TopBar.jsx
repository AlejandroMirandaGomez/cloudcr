import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar, Box, Button, IconButton, Toolbar, Tooltip, Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { useAuth } from '../../context/AuthContext.jsx';
import { useColorMode } from '../../context/ColorModeContext.jsx';
import useCerrarSesion from '../../hooks/useCerrarSesion.js';

/**
 * Barra superior global: presente para evaluadores, organizaciones y visitantes
 * sin sesion. El logo siempre lleva al inicio.
 */
export default function TopBar({ onMenuClick }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { mode, toggleMode } = useColorMode();
  const cerrarSesion = useCerrarSesion();

  return (
    <AppBar
      className="no-print"
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 60 } }}>
        <Tooltip title="Menú">
          <IconButton onClick={onMenuClick} edge="start" aria-label="Abrir menú">
            <MenuIcon />
          </IconButton>
        </Tooltip>

        <Box
          component={RouterLink}
          to="/"
          aria-label="Ir al inicio"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            textDecoration: 'none',
            color: 'inherit',
            borderRadius: 1,
            px: 0.5,
            py: 0.25,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Box
            component="img"
            src="/favicon.svg"
            alt=""
            sx={{ width: 28, height: 28, display: 'block' }}
          />
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
            CloudCR
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
          <IconButton onClick={toggleMode} aria-label="Cambiar tema">
            {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
          </IconButton>
        </Tooltip>

        {session ? (
          <>
            {/* Indicador de sesion: deja claro que navegar no cierra la sesion. */}
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                maxWidth: 180,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: { xs: 'none', md: 'block' },
              }}
            >
              {session.nombre}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={cerrarSesion}
            >
              Cerrar sesión
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            size="small"
            startIcon={<LoginIcon />}
            onClick={() => navigate('/login')}
          >
            Iniciar sesión
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
