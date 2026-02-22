import { create } from 'zustand';

export type Page = 'flashcard' | 'settings' | 'pricing';

interface NavigationState {
  currentPage: Page;
  flashcardReloadTrigger: number;
  selectedPastDate: string | null;
  setCurrentPage: (page: Page) => void;
  setSelectedPastDate: (date: string | null) => void;
  navigateToSettings: () => void;
  navigateToFlashcard: () => void;
  navigateToPricing: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'flashcard',
  flashcardReloadTrigger: 0,
  selectedPastDate: null,
  setCurrentPage: (page) => set({ currentPage: page }),
  setSelectedPastDate: (date) => set({ selectedPastDate: date }),
  navigateToSettings: () => set({ currentPage: 'settings' }),
  navigateToFlashcard: () => set({ currentPage: 'flashcard' }),
  navigateToPricing: () => set({ currentPage: 'pricing' }),
}));
