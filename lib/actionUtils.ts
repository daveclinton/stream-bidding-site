/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { Channel, Event } from "stream-chat";
import { useCreateChatClient } from "stream-chat-react";
import { useDebounce } from "use-debounce";
import { useEffect, useCallback } from "react";

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

export const userData: { id: string; name: string } = {
  id: "user-42",
  name: "Jane Smith",
};

export const apiKey: string = process.env.NEXT_PUBLIC_STREAM_KEY || "";

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
}

// Add serialization helpers for date objects
const dateReviver = (key: string, value: any): any => {
  // Convert ISO date strings back to Date objects for specific keys
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
      setProducts: (products: Product[]) => set({ products }),
      updateProduct: (productId: string, updates: Partial<Product>) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId ? { ...p, ...updates } : p
          ),
        })),
      setBidInput: (bidInput: string) => set({ bidInput }),
      setChannel: (channel: Channel | null) => set({ channel }),
      setToken: (token: string | null) => set({ token }),
      setIsLoading: (isLoading: boolean) => set({ isLoading }),
      setIsBidding: (isBidding: boolean) => set({ isBidding }),
      setShowConfirm: (showConfirm: boolean) => set({ showConfirm }),
      setConnectionStatus: (
        status: "connected" | "disconnected" | "connecting"
      ) => set({ connectionStatus: status }),
      setTimeLeft: (timeLeft: string) => set({ timeLeft }),
    }),
    {
      name: "auction-storage",
      partialize: (state) => ({
        products: state.products,
        token: state.token,
        bidInput: state.bidInput,
        timeLeft: state.timeLeft,
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

interface AuctionLogicReturn {
  product: Product;
  bidInput: string;
  setBidInput: (bidInput: string) => void;
  debouncedBid: string;
  channel: Channel | null;
  chatClient: any | null;
  isLoading: boolean;
  isBidding: boolean;
  showConfirm: boolean;
  setShowConfirm: (showConfirm: boolean) => void;
  connectionStatus: "connected" | "disconnected" | "connecting";
  timeLeft: string;
  MINIMUM_INCREMENT: number;
  handleBid: () => Promise<void>;
  confirmBid: () => Promise<void>;
}

export function useAuctionLogic(
  productId: string | undefined
): AuctionLogicReturn {
  const {
    products,
    bidInput,
    channel,
    token,
    isLoading,
    isBidding,
    showConfirm,
    connectionStatus,
    timeLeft,
    updateProduct,
    setBidInput,
    setChannel,
    setToken,
    setIsLoading,
    setIsBidding,
    setShowConfirm,
    setConnectionStatus,
    setTimeLeft,
  } = useAuctionStore();

  const product = products.find((p) => p.id === productId)!;
  const [debouncedBid] = useDebounce(bidInput, 300);
  const MINIMUM_INCREMENT: number = product?.minimumIncrement || 10;

  const tokenProvider = useCallback((): Promise<string> => {
    if (token) return Promise.resolve(token);
    return new Promise<string>((resolve) => {
      const checkToken = setInterval(() => {
        if (token) {
          clearInterval(checkToken);
          resolve(token);
        }
      }, 100);
    });
  }, [token]);

  const chatClient = useCreateChatClient({
    apiKey,
    userData,
    tokenOrProvider: tokenProvider,
  });

  // Token fetching
  useEffect(() => {
    let mounted = true;
    if (token) {
      setIsLoading(false);
      return;
    }

    const fetchToken = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/get-stream-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userData.id,
            userName: userData.name,
          }),
        });

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data: { token: string } = await response.json();
        if (mounted) setToken(data.token);
      } catch (err: unknown) {
        if (mounted) {
          console.error("Failed to fetch token:", err);
          toast.error("Failed to authenticate chat. Please refresh.");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchToken();
    return () => {
      mounted = false;
    };
  }, [setToken, setIsLoading, token]);

  // Channel initialization
  useEffect(() => {
    if (!chatClient || !productId || !product) return;
    let channelCleanup: (() => void) | undefined;

    const initChannel = async (): Promise<void> => {
      try {
        // Only create channel if we have a valid client and no current channel
        if (chatClient.userID) {
          const productChannel: Channel = chatClient.channel(
            "messaging",
            productId,
            {
              name: `${product.name} Auction`,
            }
          );
          await productChannel.watch();
          setChannel(productChannel);

          const listener = productChannel.on(
            "message.new",
            (event: Event): void => {
              const messageText: string | undefined = event.message?.text;
              if (messageText?.startsWith("Bid: $")) {
                const amount: number = Number.parseInt(
                  messageText.replace("Bid: $", "")
                );
                if (!isNaN(amount) && amount > product.currentBid) {
                  updateProduct(product.id, {
                    currentBid: amount,
                    bids: [
                      {
                        id: event.message!.id,
                        amount,
                        userId: event.message!.user!.id,
                        userName: event.message!.user!.name || "Unknown",
                        timestamp: new Date(
                          event.message!.created_at || Date.now()
                        ),
                      },
                      ...product.bids,
                    ],
                  });
                }
              }
            }
          );
          channelCleanup = (): void => {
            listener.unsubscribe();
            productChannel.stopWatching();
          };
        }
      } catch (err: unknown) {
        console.error("Failed to initialize channel:", err);
        toast.error("Failed to load auction chat. Please refresh.");
      }
    };

    initChannel();
    return () => {
      if (channelCleanup) channelCleanup();
      setChannel(null);
    };
  }, [chatClient, productId, product, setChannel, updateProduct]);

  useEffect(() => {
    if (!chatClient) return;
    const handleConnectionChange = (event: Event): void => {
      setConnectionStatus(event.online ? "connected" : "disconnected");
    };
    chatClient.on("connection.changed", handleConnectionChange);
    return () => chatClient.off("connection.changed", handleConnectionChange);
  }, [chatClient, setConnectionStatus]);

  // Time left calculation - only recalculate if timeLeft is empty or we need to refresh
  useEffect(() => {
    if (!product) return;

    const calculateTimeLeft = (): string => {
      const now: Date = new Date();
      const difference: number = product.endTime.getTime() - now.getTime();
      if (difference <= 0) return "Auction ended";
      const days: number = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours: number = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes: number = Math.floor(
        (difference % (1000 * 60 * 60)) / (1000 * 60)
      );
      const seconds: number = Math.floor((difference % (1000 * 60)) / 1000);
      return `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`;
    };

    if (
      !timeLeft ||
      timeLeft === "Auction ended" ||
      product.endTime < new Date()
    ) {
      setTimeLeft(calculateTimeLeft());
    }

    const timer: NodeJS.Timeout = setInterval(
      () => setTimeLeft(calculateTimeLeft()),
      1000
    );
    return () => clearInterval(timer);
  }, [product, setTimeLeft, timeLeft]);

  useEffect(() => {
    if (connectionStatus === "disconnected" && chatClient && token) {
      setChannel(null);

      const reconnectTimer: NodeJS.Timeout = setTimeout(() => {
        chatClient
          .connectUser(userData, token)
          .then(() => {
            if (productId && product) {
              const productChannel: Channel = chatClient.channel(
                "messaging",
                productId,
                {
                  name: `${product.name} Auction`,
                }
              );
              return productChannel.watch().then(() => {
                setChannel(productChannel);
              });
            }
          })
          .catch((err: unknown) => {
            console.error("Failed to reconnect:", err);
            toast.error("Failed to reconnect. Please refresh the page.");
          });
      }, 5000);
      return () => clearTimeout(reconnectTimer);
    }
  }, [connectionStatus, chatClient, token, productId, product, setChannel]);

  const handleBid = async (): Promise<void> => {
    if (!product) return;

    const amount: number = Number.parseInt(debouncedBid);
    if (product.endTime < new Date()) {
      toast.error("This auction has already ended");
      return;
    }
    if (isNaN(amount)) {
      toast.warning("Please enter a valid amount");
      return;
    }
    if (amount <= product.currentBid) {
      toast.warning("Bid must be higher than the current bid");
      return;
    }
    if (amount < product.currentBid + MINIMUM_INCREMENT) {
      toast.warning(
        `Bid must be at least $${MINIMUM_INCREMENT} higher than current bid`
      );
      return;
    }
    setShowConfirm(true);
  };

  const confirmBid = async (): Promise<void> => {
    if (channel && channel.state.read) {
      try {
        setIsBidding(true);
        await channel.sendMessage({
          text: `Bid: $${Number.parseInt(debouncedBid)}`,
        });
        setBidInput("");
        toast.success(
          `Bid of $${Number.parseInt(
            debouncedBid
          ).toLocaleString()} placed successfully!`
        );
      } catch (err: unknown) {
        console.error("Failed to send bid:", err);
        toast.error("Failed to place bid. Please try again.");
      } finally {
        setIsBidding(false);
        setShowConfirm(false);
      }
    } else {
      toast.error("Chat connection lost. Please refresh the page.");
      setShowConfirm(false);
    }
  };

  return {
    product,
    bidInput,
    setBidInput,
    debouncedBid,
    channel,
    chatClient,
    isLoading,
    isBidding,
    showConfirm,
    setShowConfirm,
    connectionStatus,
    timeLeft,
    MINIMUM_INCREMENT,
    handleBid,
    confirmBid,
  };
}
