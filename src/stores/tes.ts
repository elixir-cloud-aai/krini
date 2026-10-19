import { create } from "zustand";

type TESStore = {
  selectedServer: string;
  setSelectedServer: (url: string) => void;
};

export const useTESStore = create<TESStore>((set) => ({
  selectedServer: "",
  setSelectedServer: (url) => set({ selectedServer: url }),
}));