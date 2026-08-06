import { Box, Container, Divider, Link, Stack, Typography } from '@mui/material';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        bgcolor: (t) => (t.palette.mode === 'dark' ? t.palette.background.paper : t.palette.grey[100]),
      }}
    >
      <Divider />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          useFlexGap
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="body2" color="text.secondary">
            © {year} CloudCR. Todos los derechos reservados.
          </Typography>
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Link href="#" variant="body2" color="text.secondary" underline="hover">
              Acerca de
            </Link>
            <Link href="#" variant="body2" color="text.secondary" underline="hover">
              Contacto
            </Link>
            <Link href="#" variant="body2" color="text.secondary" underline="hover">
              Términos y condiciones
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
