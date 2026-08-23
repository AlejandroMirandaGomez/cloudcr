import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar, Box, Button, IconButton, Link, Toolbar, Tooltip, Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
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
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.01em',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            CloudCR
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            <IconButton
              onClick={toggleMode}
              aria-label="Cambiar tema"
              sx={{ p: 0.75, mr: -0.75 }}
            >
              {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </IconButton>
          </Tooltip>

          {session ? (
            <>
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
                sx={{
                  whiteSpace: 'nowrap',
                  minWidth: 'auto',
                  px: { xs: 1.25, sm: 2 },
                  '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inherit' } },
                }}
              >
                Cerrar sesión
              </Button>
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<PersonIcon />}
                onClick={() => navigate('/login')}
                sx={{
                  whiteSpace: 'nowrap',
                  minWidth: 'auto',
                  px: { xs: 1.25, sm: 2 },
                  '& .MuiButton-startIcon': { display: { xs: 'none', sm: 'inherit' } },
                }}
              >
                Iniciar sesión
              </Button>
              <Link
                component="button"
                type="button"
                onClick={() => navigate('/#servicios')}
                underline="hover"
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                  ¡Tenemos algo nuevo!
              </Link>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
