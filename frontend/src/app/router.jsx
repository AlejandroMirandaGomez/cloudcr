/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './layout/RootLayout.jsx';
import ProtectedRoute from '../common/components/ProtectedRoute.jsx';

const LoginPage    = lazy(() => import('../modules/auth/pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('../modules/auth/pages/RegisterPage.jsx'));
const ProfilePage  = lazy(() => import('../modules/auth/pages/ProfilePage.jsx'));
const HomePage     = lazy(() => import('../modules/home/pages/HomePage.jsx'));
const DashboardPage = lazy(() => import('../modules/dashboard/pages/DashboardPage.jsx'));
const ControlListPage = lazy(() => import('../modules/control-list/pages/ControlListPage.jsx'));
const ControlListDetailPage = lazy(() =>
  import('../modules/control-list/pages/ControlDetailPage.jsx'),
);
const InternalControlQuestionnairePage = lazy(() =>
  import('../modules/internal-control-questionnaire/pages/InternalControlQuestionnairePage.jsx'),
);
const ControlDetailPage = lazy(() =>
  import('../modules/internal-control-questionnaire/pages/ControlDetailPage.jsx'),
);
const ControlQuestionnairePage = lazy(() =>
  import('../modules/internal-control-questionnaire/pages/ControlQuestionnairePage.jsx'),
);

const Protected = ({ children, allowedRoles }) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
    <Suspense fallback={null}>{children}</Suspense>
  </ProtectedRoute>
);

export const router = createBrowserRouter([
  // Ruta pública — login
  {
    path: '/login',
    element: <Suspense fallback={null}><LoginPage /></Suspense>,
  },
  {
    path: '/registro',
    element: <Suspense fallback={null}><RegisterPage /></Suspense>,
  },
  // Layout principal (sidebar + footer) — público
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Suspense fallback={null}><HomePage /></Suspense>,
      },
      {
        path: 'control-list',
        element: <Suspense fallback={null}><ControlListPage /></Suspense>,
      },
      {
        path: 'control-list/:codigo',
        element: <Suspense fallback={null}><ControlListDetailPage /></Suspense>,
      },
      // Rutas protegidas — requieren login
      {
        path: 'panel',
        element: <Protected><DashboardPage /></Protected>,
      },
      {
        path: 'perfil',
        element: <Protected><ProfilePage /></Protected>,
      },
      {
        path: 'internal-control-questionnaire',
        element: <Protected allowedRoles={['evaluador']}><InternalControlQuestionnairePage /></Protected>,
      },
      {
        path: 'internal-control-questionnaire/:codigo',
        element: <Protected allowedRoles={['evaluador']}><ControlDetailPage /></Protected>,
      },
      {
        path: 'internal-control-questionnaire/:codigo/cuestionario',
        element: <Protected allowedRoles={['evaluador']}><ControlQuestionnairePage /></Protected>,
      },
    ],
  },
]);
