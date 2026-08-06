import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Footer from '../../common/components/footer/Footer.jsx';
import Sidebar from '../../common/components/sidebar/Sidebar.jsx';

export default function RootLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      {/* pt deja franja libre para el boton hamburguesa flotante */}
      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, pt: '56px' }}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </Box>
      <Footer />
    </Box>
  );
}
