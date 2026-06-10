import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useStore } from './store/useStore';
import { setupRealtime } from './lib/realtime';
import Sidebar from './components/layout/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Bookings from './pages/Bookings';
import Inquiries from './pages/Inquiries';
import Commissions from './pages/Commissions';
import Owners from './pages/Owners';
import Expenses from './pages/Expenses';
import Drivers from './pages/Drivers';
import Notifications from './pages/Notifications';
import Permissions from './pages/Permissions';
import Referrals from './pages/Referrals';
import Handovers from './pages/Handovers';
import Customers from './pages/Customers';

export default function App() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin     = useAuthStore((s) => s.isAdmin);
  const loadAll     = useStore((s) => s.loadAll);

  useEffect(() => {
    loadAll();
    return setupRealtime(loadAll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentUser) return <Login />;

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 md:ml-[72px] p-4 md:p-6 overflow-auto pb-[72px] md:pb-6">
        <Routes>
          <Route path="/"              element={<Dashboard />}     />
          <Route path="/vehicles"      element={<Vehicles />}      />
          <Route path="/bookings"      element={<Bookings />}      />
          <Route path="/inquiries"     element={<Inquiries />}     />
          <Route path="/commissions"   element={<Commissions />}   />
          <Route path="/owners"        element={<Owners />}        />
          <Route path="/expenses"      element={<Expenses />}      />
          <Route path="/drivers"       element={<Drivers />}       />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/handovers"     element={<Handovers />}     />
          <Route path="/customers"     element={<Customers />}     />
          {isAdmin() && (
            <Route path="/permissions" element={<Permissions />} />
          )}
          <Route path="/referrals" element={<Referrals />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
