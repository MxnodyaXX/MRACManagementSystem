import { Car } from 'lucide-react';

/** Full-screen branded loader shown while the app boots / data loads. */
export default function LoadingScreen({ label = 'Loading your fleet…' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-navy-900">
      {/* glow */}
      <div className="absolute w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative flex flex-col items-center">
        {/* car badge */}
        <div className="relative w-20 h-20 rounded-2xl bg-navy-700 flex items-center justify-center shadow-xl mb-7">
          <Car size={38} className="text-white anim-loader-car" />
          {/* spinning ring */}
          <span className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-blue-400/80 anim-loader-ring" />
        </div>

        {/* brand */}
        <p className="text-2xl font-black tracking-wide text-white">EMRAC</p>
        <p className="text-xs text-white/40 mt-1 mb-6">Vehicle Rental Management</p>

        {/* shimmer progress track */}
        <div className="relative w-44 h-1 rounded-full bg-white/10 overflow-hidden">
          <span className="absolute top-0 left-0 h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-blue-400 to-transparent anim-loader-bar" />
        </div>

        <p className="text-[11px] text-white/35 mt-4">{label}</p>
      </div>
    </div>
  );
}
