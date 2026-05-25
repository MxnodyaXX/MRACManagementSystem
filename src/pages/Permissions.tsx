import { useAuthStore } from '../store/useAuthStore';
import { useStore } from '../store/useStore';
import { USERS } from '../store/useAuthStore';
import Header from '../components/layout/Header';
import { ShieldCheck, ShieldOff, ToggleLeft, ToggleRight, User } from 'lucide-react';
import { OwnerPermissions } from '../types/auth';

const PERM_LABELS: { key: keyof Omit<OwnerPermissions, 'disabled'>; label: string; desc: string }[] = [
  { key: 'canBook',          label: 'Create Bookings',  desc: 'Can add new bookings to their vehicles'    },
  { key: 'canEditVehicle',   label: 'Edit Vehicles',    desc: 'Can edit details of their own vehicles'    },
  { key: 'canChangeStatus',  label: 'Change Status',    desc: 'Can change vehicle status'                 },
  { key: 'canAddExpenses',   label: 'Add Expenses',     desc: 'Can log expenses for their vehicles'       },
];

export default function Permissions() {
  const { getOwnerPermissions, updatePermissions } = useAuthStore();
  const owners = useStore((s) => s.owners);
  const ownerUsers = USERS.filter((u) => u.role === 'owner');

  return (
    <div>
      <Header title="Permission Manager" subtitle="Control what each owner can do in the system" />

      <div className="space-y-4">
        {ownerUsers.map((user) => {
          const owner = owners.find((o) => o.id === user.ownerId);
          const perms = getOwnerPermissions(user.ownerId ?? '');

          return (
            <div key={user.id} className="card">
              {/* Owner header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy-700 flex items-center justify-center text-white text-xs font-bold">
                    {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-navy-800 text-sm">{user.name}</p>
                    <p className="text-xs text-navy-400">@{user.username} · {owner?.phone ?? '—'}</p>
                  </div>
                </div>

                {/* Master disable toggle */}
                <button
                  onClick={() => updatePermissions(user.ownerId!, { disabled: !perms.disabled })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    perms.disabled
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {perms.disabled ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                  {perms.disabled ? 'Account Disabled' : 'Account Active'}
                </button>
              </div>

              {/* Permission toggles */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${perms.disabled ? 'opacity-40 pointer-events-none' : ''}`}>
                {PERM_LABELS.map(({ key, label, desc }) => {
                  const on = perms[key];
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between bg-navy-50/60 rounded-xl px-4 py-3 cursor-pointer hover:bg-navy-50 transition-colors"
                      onClick={() => updatePermissions(user.ownerId!, { [key]: !on })}
                    >
                      <div className="flex items-center gap-3">
                        <User size={15} className={on ? 'text-navy-600' : 'text-navy-300'} />
                        <div>
                          <p className={`text-sm font-medium ${on ? 'text-navy-800' : 'text-navy-400'}`}>{label}</p>
                          <p className="text-xs text-navy-400">{desc}</p>
                        </div>
                      </div>
                      {on
                        ? <ToggleRight size={22} className="text-navy-700 flex-shrink-0" />
                        : <ToggleLeft  size={22} className="text-navy-300 flex-shrink-0" />
                      }
                    </div>
                  );
                })}
              </div>

              {perms.disabled && (
                <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-3">
                  This owner is fully disabled and cannot log in or perform any actions.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
