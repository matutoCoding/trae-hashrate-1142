import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import BenchList from './pages/BenchList';
import BenchDetail from './pages/BenchDetail';
import NewReservation from './pages/NewReservation';
import MyReservations from './pages/MyReservations';
import ReservationDetail from './pages/ReservationDetail';
import ApprovalCenter from './pages/ApprovalCenter';
import ReminderCenter from './pages/ReminderCenter';
import AdminBenches from './pages/AdminBenches';
import AdminRules from './pages/AdminRules';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/benches" element={<BenchList />} />
          <Route path="/benches/:id" element={<BenchDetail />} />
          <Route path="/reservations/new" element={<NewReservation />} />
          <Route path="/reservations" element={<MyReservations />} />
          <Route path="/reservations/:id" element={<ReservationDetail />} />
          <Route path="/approvals" element={<ApprovalCenter />} />
          <Route path="/reminders" element={<ReminderCenter />} />
          <Route path="/admin/benches" element={<AdminBenches />} />
          <Route path="/admin/rules" element={<AdminRules />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
