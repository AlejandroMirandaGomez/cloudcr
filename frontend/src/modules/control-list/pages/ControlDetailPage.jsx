import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import ControlDetail from '../../../common/components/control-detail/ControlDetail.jsx';
import { getControl } from '../services/controles.js';

const BACK_TO = '/control-list';

export default function ControlDetailPage() {
  const { codigo } = useParams();
  const [control, setControl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getControl(codigo)
      .then(setControl)
      .catch(() => setControl(null))
      .finally(() => setLoading(false));
  }, [codigo]);

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
      codigo={codigo}
      backTo={BACK_TO}
      backLabel="Volver a la lista de controles"
    />
  );
}
