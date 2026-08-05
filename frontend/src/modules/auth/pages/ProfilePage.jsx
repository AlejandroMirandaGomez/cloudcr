import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, CircularProgress, Divider, Paper,
  TextField, Typography, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../../common/context/AuthContext.jsx';
import { actualizarUsuario } from '../services/usuarios.js';

const NOMBRE_LABEL = { evaluador: 'Nombre completo', organizacion: 'Nombre de la organización' };

export default function ProfilePage() {
  const { session, updateSession } = useAuth();

  const [nombre, setNombre] = useState(session?.nombre ?? '');
  const [correo, setCorreo] = useState(session?.correo ?? '');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOk(false);

    if (contrasena && contrasena !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const datos = await actualizarUsuario(session.rol, session.id, { nombre, correo, contrasena });
      updateSession(datos);
      setContrasena('');
      setConfirmar('');
      setOk(true);
    } catch (err) {
      setError(err.message ?? 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 480 }}>
        <Box sx={{ mb: 2 }}>
          <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} variant="outlined">
            Volver al inicio
          </Button>
        </Box>

        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, borderRadius: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mb: 0.5 }}>
            Mi perfil
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Actualizá tus datos de acceso
          </Typography>

          <Divider sx={{ mb: 3 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {ok && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Perfil actualizado correctamente.
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label={NOMBRE_LABEL[session.rol] ?? 'Nombre'}
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
              label="Nueva contraseña"
              type="password"
              fullWidth
              size="small"
              helperText="Dejá en blanco para mantener la actual"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Confirmar nueva contraseña"
              type="password"
              fullWidth
              size="small"
              disabled={!contrasena}
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
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
