import { create } from 'zustand';

export type Page = 'flashcard' | 'settings';

interface NavigationState {
  currentPage: Page;
  flashcardReloadTrigger: number;
  setCurrentPage: (page: Page) => void;
  navigateToSettings: () => void;
  navigateToFlashcard: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'flashcard',
  flashcardReloadTrigger: 0,
  setCurrentPage: (page) => set({ currentPage: page }),
  navigateToSettings: () => set({ currentPage: 'settings' }),
  navigateToFlashcard: () => set({ currentPage: 'flashcard' })
}));
