"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthMe } from "@echovora/shared";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  me: AuthMe | null;
  setTokens: (args: { accessToken: string; refreshToken: string | null }) => void;
  setMe: (me: AuthMe | null) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      me: null,
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      setMe: (me) => set({ me }),
      signOut: () => set({ accessToken: null, refreshToken: null, me: null })
    }),
    {
      name: "echovora-auth"
    }
  )
);

