/**
 * Auth Store
 * 
 * Manages player session state using Zustand.
 * 
 * Epic 1: Session is VOLATILE - not persisted to localStorage.
 * Refreshing or closing the tab clears the session.
 * This prevents stale gameCode issues when backend restarts.
 */

import { create } from 'zustand';
import type { Session } from '../shared/types';

interface AuthState {
  session: Session | null;
  setSession: (session: Session | null) => void;
  clearSession: () => void;
}

// No persist middleware - session is volatile (in-memory only)
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));
