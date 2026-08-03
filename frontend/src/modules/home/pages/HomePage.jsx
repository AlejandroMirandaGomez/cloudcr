import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Stack } from '@mui/material';

export default function HomePage() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
      >
        <Button
          component={RouterLink}
          to="/internal-control-questionnaire"
          variant="contained"
          sx={{ width: 340 }}
        >
          Cuestionario de Control Interno
        </Button>
        <Button
          component={RouterLink}
          to="/control-list"
          variant="contained"
          sx={{ width: 340 }}
        >
          Lista de Controles
        </Button>
      </Stack>
    </Box>
  );
}
