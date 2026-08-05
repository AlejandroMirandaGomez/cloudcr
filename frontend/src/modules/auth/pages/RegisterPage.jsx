import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box, Button, CircularProgress, Divider, Paper,
  TextField, Typography, Alert, ToggleButtonGroup, ToggleButton, Link,
} from '@mui/material';
import { useAuth } from '../../../common/context/AuthContext.jsx';
import { registrarUsuario } from '../services/usuarios.js';

const NOMBRE_LABEL = { evaluador: 'Nombre completo', organizacion: 'Nombre de la organización' };

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [tipo, setTipo] = useState('evaluador');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (contrasena !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await registrarUsuario(tipo, { nombre, correo, contrasena });
      await login(correo, contrasena, tipo);
      navigate('/panel', { replace: true });
    } catch (err) {
      setError(err.message ?? 'Error al registrarse');
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
        sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 }, borderRadius: 2 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
          CloudCR
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Creá tu cuenta para continuar
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <ToggleButtonGroup
            value={tipo}
            exclusive
            fullWidth
            size="small"
            onChange={(_, valor) => valor && setTipo(valor)}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="evaluador">Evaluador</ToggleButton>
            <ToggleButton value="organizacion">Organización</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label={NOMBRE_LABEL[tipo]}
            type="text"
            fullWidth
            required
            size="small"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Correo"
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
            helperText="Mínimo 8 caracteres"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Confirmar contraseña"
            type="password"
            fullWidth
            required
            size="small"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
          ¿Ya tenés cuenta?{' '}
          <Link component={RouterLink} to="/login">
            Iniciá sesión
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
