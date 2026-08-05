import { useAuth } from '../../../common/context/AuthContext.jsx';
import EvaluadorDashboard from './EvaluadorDashboard.jsx';
import OrganizacionDashboard from './OrganizacionDashboard.jsx';

export default function DashboardPage() {
  const { session } = useAuth();

  if (!session) return null;

  return session.rol === 'evaluador' ? <EvaluadorDashboard /> : <OrganizacionDashboard />;
}
