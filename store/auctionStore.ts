import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Bid {
  id: string;
  amount: number;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  currentBid: number;
  startingPrice: number;
  endTime: Date;
  imageUrl: string;
  bids: Bid[];
  minimumIncrement?: number;
}

export interface StreamUser {
  id: string;
  name: string;
  avatar?: string;
}

interface AuctionState {
  products: Product[];
  bidInput: string;
  isBidding: boolean;
  showConfirm: boolean;
  timeLeft: string;
  currentUser: StreamUser | null;
  setProducts: (products: Product[]) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  setBidInput: (bidInput: string) => void;
  setIsBidding: (isBidding: boolean) => void;
  setShowConfirm: (showConfirm: boolean) => void;
  setTimeLeft: (timeLeft: string) => void;
  setCurrentUser: (user: StreamUser | null) => void;
}

const dateReviver = (key: string, value: Date) => {
  if (key === "endTime" || key === "timestamp") return new Date(value);
  return value;
};

export const useAuctionStore = create<AuctionState>()(
  persist(
    (set) => ({
      products: [],
      bidInput: "",
      isBidding: false,
      showConfirm: false,
      timeLeft: "",
      currentUser: null,
      setProducts: (products) => set({ products }),
      updateProduct: (productId, updates) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId ? { ...p, ...updates } : p
          ),
        })),
      setBidInput: (bidInput) => set({ bidInput }),
      setIsBidding: (isBidding) => set({ isBidding }),
      setShowConfirm: (showConfirm) => set({ showConfirm }),
      setTimeLeft: (timeLeft) => set({ timeLeft }),
      setCurrentUser: (user) => set({ currentUser: user }),
    }),
    {
      name: "auction-storage",
      partialize: (state) => ({
        products: state.products,
        bidInput: state.bidInput,
        timeLeft: state.timeLeft,
        currentUser: state.currentUser,
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str, dateReviver);
        },
        setItem: (name, value) =>
          localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
