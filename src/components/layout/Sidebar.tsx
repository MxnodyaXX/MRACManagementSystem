import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Car, CalendarDays, MessageSquare,
  Percent, Users, Receipt, UserCheck, Bell, Settings,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../store/useStore';

const links = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/vehicles',      icon: Car,             label: 'Vehicles'    },
  { to: '/bookings',      icon: CalendarDays,    label: 'Bookings'    },
  { to: '/inquiries',     icon: MessageSquare,   label: 'Inquiries'   },
  { to: '/commissions',   icon: Percent,         label: 'Commissions' },
  { to: '/owners',        icon: Users,           label: 'Owners'      },
  { to: '/expenses',      icon: Receipt,         label: 'Expenses'    },
  { to: '/drivers',       icon: UserCheck,       label: 'Drivers'     },
  { to: '/notifications', icon: Bell,            label: 'Alerts'      },
];

const mobileNav = [
  { to: '/',              icon: LayoutDashboard },
  { to: '/bookings',      icon: CalendarDays    },
  { to: '/vehicles',      icon: Car             },
  { to: '/notifications', icon: Bell            },
  { to: '/owners',        icon: Users           },
];

function isActive(to: string, pathname: string) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

export default function Sidebar() {
  const location = useLocation();
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <>
      {/* ── Desktop left sidebar ── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[72px] bg-white shadow-card flex-col items-center py-6 gap-2 z-40">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-navy-700 flex items-center justify-center mb-4">
          <Car size={20} className="text-white" />
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {links.map(({ to, icon: Icon, label }) => {
            const active  = isActive(to, location.pathname);
            const isNotif = to === '/notifications';
            return (
              <NavLink key={to} to={to} title={label}>
                <div className={clsx('sidebar-icon relative', active && 'active')}>
                  <Icon size={20} />
                  {isNotif && unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-icon mt-auto" title="Settings">
          <Settings size={20} />
        </div>
      </aside>

      {/* ── Mobile bottom navigation ── */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-navy-100 z-40 shadow-[0_-2px_12px_rgba(27,43,107,0.08)]">
        <div className="flex w-full overflow-x-auto no-scrollbar">
          {links.map(({ to, icon: Icon, label }) => {
            const active  = isActive(to, location.pathname);
            const isNotif = to === '/notifications';
            return (
              <NavLink key={to} to={to} className="flex-1 min-w-[48px]">
                <div className={clsx(
                  'flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors',
                  active ? 'text-navy-700' : 'text-navy-400'
                )}>
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-navy-700 rounded-b-full" />
                  )}
                  <div className="relative">
                    <Icon size={19} />
                    {isNotif && unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                    )}
                  </div>
                  <span className="text-[9px] font-medium leading-none">{label}</span>
                </div>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
