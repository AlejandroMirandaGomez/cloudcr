import { Box, Divider, List, ListItem, ListItemIcon, ListItemText, Paper, Typography } from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EstadoChip from './EstadoChip.jsx';

const SEVERIDAD = {
  critica:      { label: 'Critica', color: 'rojo', icon: <ErrorIcon color="error" /> },
  advertencia:  { label: 'Advertencia', color: 'amarillo', icon: <WarningAmberIcon sx={{ color: '#ed9b00' }} /> },
};

const COMPONENTE_LABEL = { procesos: 'Procesos', memoria: 'Memoria', archivos: 'Archivos' };

/**
 * Alertas por componente. Se listan aparte del ISBD a proposito: el
 * documento base exige que una alerta critica individual no quede oculta
 * detras de un promedio ponderado alto.
 */
export default function AlertasPanel({ alertas }) {
  if (alertas.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Sin alertas activas.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      <List dense disablePadding>
        {alertas.map((a, i) => {
          const sev = SEVERIDAD[a.severidad] ?? SEVERIDAD.advertencia;
          return (
            <Box key={a.id}>
              {i > 0 && <Divider />}
              <ListItem sx={{ py: 1.5, alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>{sev.icon}</ListItemIcon>
                <ListItemText
                  primary={a.mensaje}
                  secondary={`${COMPONENTE_LABEL[a.componente] ?? a.componente} · ${a.generada_en}`}
                />
                <EstadoChip color={sev.color} label={sev.label} />
              </ListItem>
            </Box>
          );
        })}
      </List>
    </Paper>
  );
}
