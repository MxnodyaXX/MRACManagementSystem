import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Car, LogIn, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show,     setShow]     = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const ok = login(username.trim(), password);
      if (!ok) setError('Invalid credentials or account disabled.');
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D1B45] via-[#1B2B6B] to-[#0F2060] p-4">
      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-4 shadow-lg">
            <Car size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">EMRAC</h1>
          <p className="text-white/50 text-sm mt-1">Vehicle Fleet Management</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.07] backdrop-blur border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
          <div>
            <p className="text-white/60 text-xs font-medium mb-1.5">Username</p>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin / kasun / nimesh / roshan"
              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-white placeholder-white/25 text-sm outline-none focus:border-white/40 transition-colors"
              autoComplete="username"
            />
          </div>

          <div>
            <p className="text-white/60 text-xs font-medium mb-1.5">Password</p>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-white/25 text-sm outline-none focus:border-white/40 transition-colors"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full flex items-center justify-center gap-2 bg-white text-navy-800 font-semibold rounded-xl py-2.5 text-sm hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-navy-800/30 border-t-navy-800 rounded-full animate-spin" />
            ) : (
              <LogIn size={15} />
            )}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="border-t border-white/10 pt-3">
            <p className="text-white/30 text-[10px] text-center leading-relaxed">
              Admin: <span className="text-white/50">admin / admin123</span> &nbsp;|&nbsp; Owner: <span className="text-white/50">kasun / owner123</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
