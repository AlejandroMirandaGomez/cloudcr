import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Footer from '../../common/components/footer/Footer.jsx';
import Sidebar, { TOP_BAR_HEIGHT } from '../../common/components/sidebar/Sidebar.jsx';

export default function RootLayout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, pt: `${TOP_BAR_HEIGHT}px` }}
      >
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </Box>
      <Footer />
    </Box>
  );
}
