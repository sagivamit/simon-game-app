/**
 * Profile Store
 * 
 * Stores user profile (displayName, avatar) before game session creation.
 * Persisted to localStorage so profile survives page refresh.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Avatar mapping - 12 animal/face emojis
const AVATARS = ['😀', '🤩', '😎', '🤠', '🐱', '🐶', '🐼', '🐸', '🦊', '🐵', '🐢', '👾'];

interface ProfileState {
  displayName: string;
  avatarId: string;
  avatarEmoji: string;
  setDisplayName: (name: string) => void;
  setAvatar: (id: string) => void;
  clearProfile: () => void;
  isProfileComplete: () => boolean;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      displayName: '',
      avatarId: '1',
      avatarEmoji: AVATARS[0],
      
      setDisplayName: (name: string) => set({ displayName: name }),
      
      setAvatar: (id: string) => {
        const index = parseInt(id) - 1;
        const emoji = AVATARS[index] || AVATARS[0];
        set({ avatarId: id, avatarEmoji: emoji });
      },
      
      clearProfile: () => set({ 
        displayName: '', 
        avatarId: '1', 
        avatarEmoji: AVATARS[0] 
      }),
      
      isProfileComplete: () => {
        const { displayName } = get();
        return displayName.trim().length >= 3;
      },
    }),
    {
      name: 'simon-profile-storage',
    }
  )
);

export const AVATAR_OPTIONS = AVATARS;

