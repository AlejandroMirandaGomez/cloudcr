import { useNavigate } from 'react-router-dom';
import { IconButton, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';

export default function VariableRowActionsMenu({ baseDatosId, componenteId, variableId }) {
  const navigate = useNavigate();
  const base = `/monitor/${baseDatosId}/${componenteId}/${variableId}`;

  const handleVerDetalle = () => navigate(base);

  return (
    <Tooltip title="Ver detalle">
      <IconButton size="small" aria-label="Ver detalle" onClick={handleVerDetalle}>
        <VisibilityIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
