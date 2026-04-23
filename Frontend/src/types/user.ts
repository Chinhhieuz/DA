export type UserRole = 'user' | 'moderator' | 'admin';

export interface UserPreferences {
  darkMode: boolean;
  pushNotifications: boolean;
  commentNotifications: boolean;
}

export interface AppUser {
  id?: string;
  _id?: string;
  name: string;
  avatar: string;
  username: string;
  role: UserRole;
  bio?: string;
  location?: string;
  website?: string;
  mssv?: string;
  faculty?: string;
  preferences?: UserPreferences;
  savedPosts?: string[];
}

export interface JwtPayload {
  exp?: number | string;
  accountId?: string;
  id?: string;
  _id?: string;
  sub?: string;
  role?: string;
  [key: string]: unknown;
}

export interface LoginAccount {
  _id?: string;
  id?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  role?: string;
  preferences?: unknown;
  savedPosts?: string[];
  token?: string;
}

export type LoginPayload = {
  token?: string;
  user?: LoginAccount;
} & Record<string, unknown>;
