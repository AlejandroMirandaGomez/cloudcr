import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditNoteIcon from '@mui/icons-material/EditNote';

export default function RowActionsMenu({ codigo }) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleRegistrarObservaciones = () => {
    handleClose();
  };

  const handleVerDetalle = () => {
    handleClose();
    navigate(`/internal-control-questionnaire/${codigo}`);
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
        <MenuItem onClick={handleRegistrarObservaciones}>
          <ListItemIcon>
            <EditNoteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Registrar observaciones</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
