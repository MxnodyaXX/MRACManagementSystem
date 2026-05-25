import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, AppUser, OwnerPermissions } from '../types/auth';

export const USERS: AppUser[] = [
  { id: 'u_admin', username: 'admin',  password: 'admin123',  name: 'EMRAC Admin',      role: 'admin'             },
  { id: 'u_o1',    username: 'kasun',  password: 'owner123',  name: 'Kasun Perera',     role: 'owner', ownerId: 'o1' },
  { id: 'u_o2',    username: 'nimesh', password: 'owner123',  name: 'Nimesh Silva',     role: 'owner', ownerId: 'o2' },
  { id: 'u_o3',    username: 'roshan', password: 'owner123',  name: 'Roshan Fernando',  role: 'owner', ownerId: 'o3' },
];

const DEFAULT_PERMS: OwnerPermissions = {
  canBook: true,
  canEditVehicle: true,
  canChangeStatus: true,
  canAddExpenses: true,
  disabled: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      permissions: {},

      login: (username, password) => {
        const user = USERS.find((u) => u.username === username && u.password === password);
        if (!user) return false;
        const perms = get().permissions[user.ownerId ?? ''];
        if (user.role === 'owner' && (perms?.disabled ?? false)) return false;
        set({ currentUser: user });
        return true;
      },

      logout: () => set({ currentUser: null }),

      updatePermissions: (ownerId, perms) =>
        set((s) => ({
          permissions: {
            ...s.permissions,
            [ownerId]: { ...(s.permissions[ownerId] ?? DEFAULT_PERMS), ...perms },
          },
        })),

      getOwnerPermissions: (ownerId) =>
        get().permissions[ownerId] ?? DEFAULT_PERMS,

      isAdmin: () => get().currentUser?.role === 'admin',
      isOwner: () => get().currentUser?.role === 'owner',

      can: (perm) => {
        const { currentUser, permissions } = get();
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        const perms = permissions[currentUser.ownerId ?? ''] ?? DEFAULT_PERMS;
        if (perms.disabled) return false;
        return perms[perm];
      },
    }),
    { name: 'emrac-auth-v1' }
  )
);
