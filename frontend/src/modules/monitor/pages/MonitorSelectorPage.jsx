import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Typography } from '@mui/material';
import { CardsSkeleton } from '../../../common/components/loading/Skeletons.jsx';
import BaseDatosCard from '../components/BaseDatosCard.jsx';
import { getBasesDatosMonitoreadas } from '../services/monitor.js';

/**
 * Pantalla selectora del monitor: lista las bases de datos monitoreadas
 * (datos simulados, ver claude2.md) antes de entrar al dashboard de una
 * base especifica en /monitor/:baseDatosId.
 */
export default function MonitorSelectorPage() {
  const navigate = useNavigate();
  const [basesDatos, setBasesDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;

    getBasesDatosMonitoreadas()
      .then((datos) => activo && setBasesDatos(datos))
      .catch((e) => activo && setError(e.message))
      .finally(() => activo && setLoading(false));

    return () => {
      activo = false;
    };
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
        Monitor de Salud de Base de Datos
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Seleccione una base de datos monitoreada para ver su dashboard de salud.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          No se pudo cargar el listado de bases de datos: {error}
        </Alert>
      )}

      {loading ? (
        <CardsSkeleton cantidad={4} alto={120} columnas={{ xs: '1fr', md: 'repeat(2, 1fr)' }} />
      ) : basesDatos.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No hay bases de datos monitoreadas por el momento.
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
          {basesDatos.map((bd) => (
            <BaseDatosCard key={bd.id} baseDatos={bd} onClick={() => navigate(`/monitor/${bd.id}`)} />
          ))}
        </Box>
      )}
    </Box>
  );
}
