import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type BookingProgress = {
  step: number;
  zip: string;
  services: string[];
  selectedDay: string;
  selectedSlot: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  contactPref: "Phone" | "Email" | "Text Message";
  notes: string;
  address: string;
  city: string;
  state: string;
  submissionId: string;
};

type BookingStore = BookingProgress & {
  updateProgress: (progress: Partial<BookingProgress>) => void;
  resetProgress: () => void;
};

const initialProgress: BookingProgress = {
  step: 0,
  zip: "",
  services: [],
  selectedDay: "",
  selectedSlot: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  contactPref: "Phone",
  notes: "",
  address: "",
  city: "",
  state: "TX",
  submissionId: "",
};

export const useBookingStore = create<BookingStore>()(
  persist(
    (set) => ({
      ...initialProgress,
      updateProgress: (progress) => set(progress),
      resetProgress: () => set(initialProgress),
    }),
    {
      name: "bluehippo-booking-progress",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ updateProgress: _updateProgress, resetProgress: _resetProgress, ...progress }) =>
        progress,
    },
  ),
);
