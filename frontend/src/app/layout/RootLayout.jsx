import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Footer from '../../common/components/footer/Footer.jsx';
import Sidebar, { COLLAPSED_WIDTH } from '../../common/components/sidebar/Sidebar.jsx';

export default function RootLayout() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          ml: { xs: 0, md: `${COLLAPSED_WIDTH}px` },
        }}
      >
        <Box component="main" sx={{ flex: 1 }}>
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}
