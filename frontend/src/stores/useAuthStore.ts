import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserDTO } from '@/types/api'

type AuthState = {
  token: string | null
  user: UserDTO | null
  setSession: (token: string, user: UserDTO) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
    }),
    { name: 'journal-growth-auth' },
  ),
)
