"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BusinessSummary } from "@echovora/shared";

type BusinessState = {
  selectedBusinessId: string | null;
  businesses: BusinessSummary[];
  setBusinesses: (items: BusinessSummary[]) => void;
  selectBusiness: (businessId: string | null) => void;
  clear: () => void;
};

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      selectedBusinessId: null,
      businesses: [],
      setBusinesses: (items) => set({ businesses: items }),
      selectBusiness: (selectedBusinessId) => set({ selectedBusinessId }),
      clear: () => set({ selectedBusinessId: null, businesses: [] })
    }),
    {
      name: "echovora-business"
    }
  )
);

