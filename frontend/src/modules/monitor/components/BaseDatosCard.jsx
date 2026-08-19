import { ButtonBase, Paper, Stack, Typography } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import EstadoChip from './EstadoChip.jsx';

/** Tarjeta de una base de datos monitoreada, para MonitorSelectorPage. */
export default function BaseDatosCard({ baseDatos, onClick }) {
  const { nombre, motor, estado, color, actualizado_en: actualizadoEn } = baseDatos;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <ButtonBase onClick={onClick} sx={{ width: '100%', display: 'block', textAlign: 'left', p: 2.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <DnsIcon color="primary" sx={{ mt: 0.25 }} />
          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {nombre}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Motor: {motor}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Ultima actualizacion: {actualizadoEn}
            </Typography>
          </Stack>
          <EstadoChip color={color} label={estado} />
        </Stack>
      </ButtonBase>
    </Paper>
  );
}
