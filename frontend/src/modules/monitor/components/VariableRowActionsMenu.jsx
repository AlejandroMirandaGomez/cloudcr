import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';

export default function VariableRowActionsMenu({ baseDatosId, componenteId, variableId }) {
  const navigate = useNavigate();
  const base = `/monitor/${baseDatosId}/${componenteId}/${variableId}`;

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleVerDetalle = () => {
    handleClose();
    navigate(base);
  };

  const handleEditar = () => {
    handleClose();
    navigate(`${base}/editar`);
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label="Opciones"
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleOpen}
      >
        <SettingsIcon fontSize="small" />
      </IconButton>

      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={handleVerDetalle}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ver detalle</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEditar}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
