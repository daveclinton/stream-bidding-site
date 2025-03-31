/* eslint-disable @typescript-eslint/no-explicit-any */
/* hooks/useAuctionLogic.ts */
"use client";
import { useEffect, useCallback } from "react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { Channel, Event } from "stream-chat";
import { useCreateChatClient } from "stream-chat-react";
import { Product, useAuctionStore } from "../store/auctionStore";

export const apiKey: string = process.env.NEXT_PUBLIC_STREAM_KEY || "";

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
    currentUser,
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
    userData: currentUser || { id: "", name: "" },
    tokenOrProvider: tokenProvider,
  });

  useEffect(() => {
    if (!currentUser) return;
    let mounted = true;

    const fetchToken = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/get-stream-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            userName: currentUser.name,
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

    if (!token) {
      fetchToken();
    } else {
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [setToken, setIsLoading, token, currentUser]);

  useEffect(() => {
    if (!chatClient || !productId || !product || !currentUser) return;
    let channelCleanup: (() => void) | undefined;

    const initChannel = async (): Promise<void> => {
      try {
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
  }, [chatClient, productId, product, setChannel, updateProduct, currentUser]);

  useEffect(() => {
    if (!chatClient) return;
    const handleConnectionChange = (event: Event): void => {
      setConnectionStatus(event.online ? "connected" : "disconnected");
    };
    chatClient.on("connection.changed", handleConnectionChange);
    return () => chatClient.off("connection.changed", handleConnectionChange);
  }, [chatClient, setConnectionStatus]);

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
    if (
      connectionStatus === "disconnected" &&
      chatClient &&
      token &&
      currentUser
    ) {
      setChannel(null);

      const reconnectTimer: NodeJS.Timeout = setTimeout(() => {
        chatClient
          .connectUser(currentUser, token)
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
  }, [
    connectionStatus,
    chatClient,
    token,
    productId,
    product,
    setChannel,
    currentUser,
  ]);

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
