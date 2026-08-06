import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import ControlDetail from '../../../common/components/control-detail/ControlDetail.jsx';
import { DetalleSkeleton } from '../../../common/components/loading/Skeletons.jsx';
import { getControl } from '../services/controles.js';

const VOLVER_A_LISTA = { to: '/control-list', label: 'Volver a la lista de controles' };

export default function ControlDetailPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const volver = state?.volverA?.to ? state.volverA : VOLVER_A_LISTA;
  const [control, setControl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getControl(id)
      .then(setControl)
      .catch(() => setControl(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <DetalleSkeleton />;
  }

  return (
    <ControlDetail
      control={control}
      codigo={control?.codigo ?? id}
      backTo={volver.to}
      backLabel={volver.label ?? VOLVER_A_LISTA.label}
    />
  );
}
