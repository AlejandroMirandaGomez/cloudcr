import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Box, Button, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ControlQuestionnaire from '../components/control-questionnaire/ControlQuestionnaire.jsx';
import controlesLocales from '../../../common/data/controles-iso27002.json';
import { getControles } from '../../control-list/services/controles.js';

const BACK_TO = '/internal-control-questionnaire';

export default function ControlQuestionnairePage() {
  const { codigo } = useParams();
  const [control, setControl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getControles().then((lista) => {
      const encontrado = lista.find((c) => c.codigo === codigo);
      if (encontrado) {
        const local = controlesLocales.find((c) => c.codigo === codigo);
        setControl({ ...encontrado, preguntas: local?.preguntas ?? [] });
      }
    }).finally(() => setLoading(false));
  }, [codigo]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!control) {
    return (
      <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
        <Button
          component={RouterLink}
          to={BACK_TO}
          startIcon={<ArrowBackIcon />}
          variant="outlined"
          sx={{ mb: 3 }}
        >
          Volver al cuestionario
        </Button>
        <Typography variant="h6">Control no encontrado</Typography>
        <Typography variant="body2" color="text.secondary">
          No existe un control con el código «{codigo}».
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ mb: 3, flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Button
          component={RouterLink}
          to={BACK_TO}
          startIcon={<ArrowBackIcon />}
          variant="outlined"
        >
          Volver al cuestionario
        </Button>
        <Button
          component={RouterLink}
          to={`${BACK_TO}/${control.codigo}`}
          startIcon={<VisibilityIcon />}
          variant="outlined"
        >
          Ver detalle
        </Button>
      </Stack>

      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {control.nombre}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Código {control.codigo} · Norma {control.norma}
      </Typography>

      <Divider sx={{ my: 3 }} />

      <ControlQuestionnaire control={control} />
    </Box>
  );
}
