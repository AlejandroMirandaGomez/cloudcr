import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Footer from '../../common/components/footer/Footer.jsx';

export default function RootLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box component="main" sx={{ flex: 1 }}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </Box>
      <Footer />
    </Box>
  );
}
