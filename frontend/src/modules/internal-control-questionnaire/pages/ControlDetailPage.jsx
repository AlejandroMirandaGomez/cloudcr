import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import ControlDetail from '../../../common/components/control-detail/ControlDetail.jsx';
import { getControl } from '../../control-list/services/controles.js';

const LISTA_CUESTIONARIO = '/internal-control-questionnaire';

export default function ControlDetailPage() {
  const { id } = useParams();
  const [control, setControl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getControl(id)
      .then(setControl)
      .catch(() => setControl(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ControlDetail
      control={control}
      codigo={control?.codigo ?? id}
      backTo={control ? `${LISTA_CUESTIONARIO}/${id}/cuestionario` : LISTA_CUESTIONARIO}
      backLabel="Volver al cuestionario"
    />
  );
}
