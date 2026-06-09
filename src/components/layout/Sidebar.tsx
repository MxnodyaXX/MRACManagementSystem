import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Car, CalendarDays, MessageSquare,
  Percent, Users, Receipt, UserCheck, Bell, Settings, ShieldCheck, Truck, Contact,
} from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';

const links = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/vehicles',      icon: Car,             label: 'Vehicles'    },
  { to: '/bookings',      icon: CalendarDays,    label: 'Bookings'    },
  { to: '/inquiries',     icon: MessageSquare,   label: 'Inquiries'   },
  { to: '/commissions',   icon: Percent,         label: 'Commissions' },
  { to: '/owners',        icon: Users,           label: 'Owners'      },
  { to: '/expenses',      icon: Receipt,         label: 'Expenses'    },
  { to: '/drivers',       icon: UserCheck,       label: 'Drivers'     },
  { to: '/handovers',     icon: Truck,           label: 'Handovers'   },
  { to: '/customers',     icon: Contact,         label: 'Customers'   },
  { to: '/notifications', icon: Bell,            label: 'Alerts'      },
];

/* 5 primary links shown in the mobile pill */
const mobileNav = [
  { to: '/',              icon: LayoutDashboard },
  { to: '/bookings',      icon: CalendarDays    },
  { to: '/vehicles',      icon: Car             },
  { to: '/notifications', icon: Bell            },
  { to: '/commissions',   icon: Percent         },
];

function isActive(to: string, pathname: string) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

export default function Sidebar() {
  const location  = useLocation();
  const unread    = useStore((s) => s.notifications.filter((n) => !n.read).length);
  const isAdmin   = useAuthStore((s) => s.isAdmin);

  const allLinks = isAdmin()
    ? [...links, { to: '/permissions', icon: ShieldCheck, label: 'Permissions' }]
    : links;

  return (
    <>
      {/* ── Desktop left sidebar ── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[72px] bg-white shadow-card flex-col items-center py-6 gap-2 z-40">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-navy-700 flex items-center justify-center mb-4">
          <Car size={20} className="text-white" />
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {allLinks.map(({ to, icon: Icon, label }) => {
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

      {/* ── Mobile floating pill nav ── */}
      <nav className="flex md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <div
          className="flex items-center gap-0.5 rounded-full px-2 py-2"
          style={{
            background: '#0D1B45',
            boxShadow: '0 8px 32px rgba(0,0,0,0.40), 0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          {mobileNav.map(({ to, icon: Icon }) => {
            const active  = isActive(to, location.pathname);
            const isNotif = to === '/notifications';
            return (
              <NavLink key={to} to={to}>
                <div className={clsx(
                  'w-11 h-11 flex items-center justify-center rounded-full transition-all relative',
                  active ? 'bg-white/[0.18]' : 'hover:bg-white/[0.08]'
                )}>
                  <Icon size={20} className={active ? 'text-white' : 'text-white/45'} />
                  {isNotif && unread > 0 && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
                  )}
                </div>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
