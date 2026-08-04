/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './layout/RootLayout.jsx';
import ProtectedRoute from '../common/components/ProtectedRoute.jsx';

const LoginPage    = lazy(() => import('../modules/auth/pages/LoginPage.jsx'));
const HomePage     = lazy(() => import('../modules/home/pages/HomePage.jsx'));
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

const Protected = ({ children }) => (
  <ProtectedRoute>
    <Suspense fallback={null}>{children}</Suspense>
  </ProtectedRoute>
);

export const router = createBrowserRouter([
  // Ruta pública — login
  {
    path: '/login',
    element: <Suspense fallback={null}><LoginPage /></Suspense>,
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
        path: 'internal-control-questionnaire',
        element: <Protected><InternalControlQuestionnairePage /></Protected>,
      },
      {
        path: 'internal-control-questionnaire/:codigo',
        element: <Protected><ControlDetailPage /></Protected>,
      },
      {
        path: 'internal-control-questionnaire/:codigo/cuestionario',
        element: <Protected><ControlQuestionnairePage /></Protected>,
      },
    ],
  },
]);
