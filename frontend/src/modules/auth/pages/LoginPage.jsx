import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Button, CircularProgress, Divider, Paper,
  TextField, Typography, Alert,
} from '@mui/material';
import { useAuth } from '../../../common/context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? '/';

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(correo, contrasena);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        variant="outlined"
        sx={{ width: '100%', maxWidth: 400, p: { xs: 3, sm: 4 }, borderRadius: 2 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
          CloudCR
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Iniciá sesión para continuar
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Correo electrónico"
            type="email"
            fullWidth
            required
            size="small"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Contraseña"
            type="password"
            fullWidth
            required
            size="small"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'center' }}>
          ¿Problemas para ingresar? Contactá a tu administrador.
        </Typography>
      </Paper>
    </Box>
  );
}
