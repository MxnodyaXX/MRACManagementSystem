import { Search, SlidersHorizontal, Bell } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';

interface Props { title: string; subtitle?: string; }

export default function Header({ title, subtitle }: Props) {
  const unread   = useStore((s) => s.notifications.filter((n) => !n.read).length);
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-4 md:mb-6 gap-3">
      <div className="min-w-0">
        <h1 className="page-title truncate">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-navy-400 mt-0.5 truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        {/* Search — desktop only */}
        <div className="hidden md:flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-card w-52">
          <Search size={15} className="text-navy-300" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-navy-700 placeholder-navy-300 outline-none w-full"
          />
        </div>

        {/* Filter — desktop only */}
        <button className="hidden md:flex w-9 h-9 bg-white rounded-xl shadow-card items-center justify-center text-navy-400 hover:text-navy-700 transition-colors">
          <SlidersHorizontal size={16} />
        </button>

        {/* Bell — always visible */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative w-9 h-9 bg-white rounded-xl shadow-card flex items-center justify-center text-navy-400 hover:text-navy-700 transition-colors"
        >
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {/* Avatar — always visible */}
        <div className="w-9 h-9 rounded-xl bg-navy-700 flex items-center justify-center text-white text-xs font-semibold">
          EM
        </div>
      </div>
    </div>
  );
}
