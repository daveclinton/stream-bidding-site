/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Channel } from "stream-chat";

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

export type StreamUser = {
  id: string;
  name: string;
  avatar?: string;
  [key: string]: any;
};

export const dummyUsers: StreamUser[] = [
  {
    id: "user-42",
    name: "Jane Smith",
    avatar: "https://i.pravatar.cc/150?u=jane",
  },
  {
    id: "user-123",
    name: "John Doe",
    avatar: "https://i.pravatar.cc/150?u=john",
  },
  {
    id: "user-456",
    name: "Alice Johnson",
    avatar: "https://i.pravatar.cc/150?u=alice",
  },
];

interface AuctionState {
  products: Product[];
  bidInput: string;
  channel: Channel | null;
  token: string | null;
  isLoading: boolean;
  isBidding: boolean;
  showConfirm: boolean;
  connectionStatus: "connected" | "disconnected" | "connecting";
  timeLeft: string;
  currentUser: StreamUser | null;
  setProducts: (products: Product[]) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  setBidInput: (bidInput: string) => void;
  setChannel: (channel: Channel | null) => void;
  setToken: (token: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsBidding: (isBidding: boolean) => void;
  setShowConfirm: (showConfirm: boolean) => void;
  setConnectionStatus: (
    status: "connected" | "disconnected" | "connecting"
  ) => void;
  setTimeLeft: (timeLeft: string) => void;
  setCurrentUser: (user: StreamUser | null) => void;
}

const dateReviver = (key: string, value: any): any => {
  if (key === "endTime" || key === "timestamp") {
    return new Date(value);
  }
  return value;
};

export const useAuctionStore = create<AuctionState>()(
  persist(
    (set) => ({
      products: [],
      bidInput: "",
      channel: null,
      token: null,
      isLoading: true,
      isBidding: false,
      showConfirm: false,
      connectionStatus: "connecting",
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
      setChannel: (channel) => set({ channel }),
      setToken: (token) => set({ token }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsBidding: (isBidding) => set({ isBidding }),
      setShowConfirm: (showConfirm) => set({ showConfirm }),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      setTimeLeft: (timeLeft) => set({ timeLeft }),
      setCurrentUser: (user) =>
        set({ currentUser: user, token: null, channel: null }),
    }),
    {
      name: "auction-storage",
      partialize: (state) => ({
        products: state.products,
        token: state.token,
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
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);
