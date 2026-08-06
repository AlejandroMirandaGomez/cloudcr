import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ControlDetail from '../../../common/components/control-detail/ControlDetail.jsx';
import { DetalleSkeleton } from '../../../common/components/loading/Skeletons.jsx';
import { getControl } from '../services/controles.js';

const BACK_TO = '/control-list';

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
    return <DetalleSkeleton />;
  }

  return (
    <ControlDetail
      control={control}
      codigo={control?.codigo ?? id}
      backTo={BACK_TO}
      backLabel="Volver a la lista de controles"
    />
  );
}
