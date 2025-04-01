// store/auctionStore.ts
import { create } from "zustand";
import { products as initialProducts } from "@/lib/data"; // Import your static data

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
  imageUrl: string;
  currentBid: number;
  minimumIncrement: number;
  endTime: Date;
  bids: Bid[];
}

export interface StreamUser {
  id: string;
  name: string;
  avatar?: string;
}

interface AuctionStore {
  products: Product[];
  bidInput: string;
  isBidding: boolean;
  showConfirm: boolean;
  timeLeft: string;
  currentUser: StreamUser | null;
  setBidInput: (bidInput: string) => void;
  setIsBidding: (isBidding: boolean) => void;
  setShowConfirm: (showConfirm: boolean) => void;
  setTimeLeft: (timeLeft: string) => void;
  setCurrentUser: (user: StreamUser | null) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
}

export const useAuctionStore = create<AuctionStore>((set) => ({
  products: initialProducts,
  bidInput: "",
  isBidding: false,
  showConfirm: false,
  timeLeft: "",
  currentUser: null,
  setBidInput: (bidInput) => set({ bidInput }),
  setIsBidding: (isBidding) => set({ isBidding }),
  setShowConfirm: (showConfirm) => set({ showConfirm }),
  setTimeLeft: (timeLeft) => set({ timeLeft }),
  setCurrentUser: (user) => set({ currentUser: user }),
  updateProduct: (productId, updates) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId ? { ...p, ...updates } : p
      ),
    })),
}));
