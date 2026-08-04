import { useParams } from 'react-router-dom';
import ControlDetail from '../../../common/components/control-detail/ControlDetail.jsx';
import controles from '../../../common/data/controles-iso27002.json';

const LISTA_CUESTIONARIO = '/internal-control-questionnaire';

export default function ControlDetailPage() {
  const { codigo } = useParams();
  const control = controles.find((c) => c.codigo === codigo);

  return (
    <ControlDetail
      control={control}
      codigo={codigo}
      backTo={control ? `${LISTA_CUESTIONARIO}/${codigo}/cuestionario` : LISTA_CUESTIONARIO}
      backLabel="Volver al cuestionario"
    />
  );
}
