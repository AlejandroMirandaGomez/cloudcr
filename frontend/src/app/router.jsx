/* eslint-disable react-refresh/only-export-components */
import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './layout/RootLayout.jsx';

const HomePage = lazy(() => import('../modules/home/pages/HomePage.jsx'));
const InternalControlQuestionnairePage = lazy(() =>
  import('../modules/internal-control-questionnaire/pages/InternalControlQuestionnairePage.jsx'),
);
const ControlDetailPage = lazy(() =>
  import('../modules/internal-control-questionnaire/pages/ControlDetailPage.jsx'),
);
const ControlQuestionnairePage = lazy(() =>
  import('../modules/internal-control-questionnaire/pages/ControlQuestionnairePage.jsx'),
);
const ControlListPage = lazy(() => import('../modules/control-list/pages/ControlListPage.jsx'));
const ControlListDetailPage = lazy(() =>
  import('../modules/control-list/pages/ControlDetailPage.jsx'),
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'internal-control-questionnaire',
        element: <InternalControlQuestionnairePage />,
      },
      {
        path: 'internal-control-questionnaire/:codigo',
        element: <ControlDetailPage />,
      },
      {
        path: 'internal-control-questionnaire/:codigo/cuestionario',
        element: <ControlQuestionnairePage />,
      },
      {
        path: 'control-list',
        element: <ControlListPage />,
      },
      {
        path: 'control-list/:codigo',
        element: <ControlListDetailPage />,
      },
    ],
  },
]);
