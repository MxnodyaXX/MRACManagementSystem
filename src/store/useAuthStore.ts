import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, AppUser, OwnerPermissions } from '../types/auth';
import { supabaseEnabled } from '../lib/supabase';
import { db, dbFetchUsers } from '../lib/db';

export const USERS: AppUser[] = [
  { id: 'u_admin', username: 'admin',  password: 'admin123',  name: 'EMRAC Admin',         role: 'admin'             },
  { id: 'u_o1',    username: 'kasun',  password: 'owner123',  name: 'Sumod Pieris',        role: 'owner', ownerId: 'o1' },
  { id: 'u_o2',    username: 'nimesh', password: 'owner123',  name: 'Pavith Bimsara',      role: 'owner', ownerId: 'o2' },
  { id: 'u_o3',    username: 'roshan', password: 'owner123',  name: 'Roshan Fernando',     role: 'owner', ownerId: 'o3' },
  { id: 'u_o4',    username: 'priya',  password: 'owner123',  name: 'Priya Jayawardena',   role: 'owner', ownerId: 'o4' },
  { id: 'u_o5',    username: 'ruwan',  password: 'owner123',  name: 'Ruwan Bandara',       role: 'owner', ownerId: 'o5' },
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
      users: USERS,
      currentUser: null,
      permissions: {},

      login: (username, password) => {
        const user = get().users.find((u) => u.username === username && u.password === password);
        if (!user) return false;
        const perms = get().permissions[user.ownerId ?? ''];
        if (user.role === 'owner' && (perms?.disabled ?? false)) return false;
        set({ currentUser: user });
        return true;
      },

      logout: () => set({ currentUser: null }),

      addUser: (userData) => {
        const newUser: AppUser = { ...userData, id: 'u_' + Math.random().toString(36).slice(2, 8) };
        set((s) => ({ users: [...s.users, newUser] }));
        if (supabaseEnabled) {
          Promise.resolve(db.insertUser(newUser)).catch((e) => console.error('[auth] insertUser failed:', e));
        }
      },

      // Merge DB-stored login profiles into the list on boot. The built-in USERS
      // stay as a fallback so the admin can always sign in even on a fresh device.
      loadUsers: async () => {
        if (!supabaseEnabled) return;
        try {
          const dbUsers = await dbFetchUsers();
          set((s) => {
            const byUsername = new Map<string, AppUser>();
            s.users.forEach((u) => byUsername.set(u.username, u)); // defaults first
            dbUsers.forEach((u) => byUsername.set(u.username, u));  // DB overrides/adds
            return { users: Array.from(byUsername.values()) };
          });
        } catch (e) {
          console.error('[auth] loadUsers failed:', e);
        }
      },

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
    { name: 'emrac-auth-v2' }
  )
);
