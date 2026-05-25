import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Bookings from './pages/Bookings';
import Inquiries from './pages/Inquiries';
import Commissions from './pages/Commissions';
import Owners from './pages/Owners';
import Expenses from './pages/Expenses';
import Drivers from './pages/Drivers';
import Notifications from './pages/Notifications';

export default function App() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 md:ml-[72px] p-4 md:p-6 overflow-auto pb-[72px] md:pb-6">
        <Routes>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/vehicles"      element={<Vehicles />} />
          <Route path="/bookings"      element={<Bookings />} />
          <Route path="/inquiries"     element={<Inquiries />} />
          <Route path="/commissions"   element={<Commissions />} />
          <Route path="/owners"        element={<Owners />} />
          <Route path="/expenses"      element={<Expenses />} />
          <Route path="/drivers"       element={<Drivers />} />
          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </main>
    </div>
  );
}
