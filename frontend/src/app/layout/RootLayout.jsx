import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Footer from '../../common/components/footer/Footer.jsx';
import Sidebar from '../../common/components/sidebar/Sidebar.jsx';
import TopBar from '../../common/components/topbar/TopBar.jsx';

export default function RootLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar onMenuClick={() => setMenuAbierto(true)} />
      <Sidebar open={menuAbierto} onClose={() => setMenuAbierto(false)} />
      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </Box>
      <Footer />
    </Box>
  );
}
