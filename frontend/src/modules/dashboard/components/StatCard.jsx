import { Box, Paper, Typography } from '@mui/material';

export default function StatCard({ icon, label, value, hint }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {label}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.disabled" noWrap>
            {hint}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
