export type UserRole = 'admin' | 'owner';

export interface AppUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  ownerId?: string; // only when role === 'owner'
  nic?: string;
  email?: string;
}

export interface OwnerPermissions {
  canBook: boolean;
  canEditVehicle: boolean;
  canChangeStatus: boolean;
  canAddExpenses: boolean;
  disabled: boolean; // admin can fully lock an owner out
}

export interface AuthState {
  users: AppUser[];
  currentUser: AppUser | null;
  permissions: Record<string, OwnerPermissions>; // keyed by ownerId
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: Omit<AppUser, 'id'>) => void;
  updatePermissions: (ownerId: string, perms: Partial<OwnerPermissions>) => void;
  getOwnerPermissions: (ownerId: string) => OwnerPermissions;
  isAdmin: () => boolean;
  isOwner: () => boolean;
  can: (perm: keyof Omit<OwnerPermissions, 'disabled'>) => boolean;
}
