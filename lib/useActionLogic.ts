"use client";
import { useCallback } from "react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { Event } from "stream-chat";
import { Product, StreamUser, useAuctionStore } from "../store/auctionStore";
import { useAuctionChannel } from "@/store/useAuctionChannel";
import { Channel, StreamChat } from "stream-chat";

interface AuctionLogicReturn {
  product: Product | undefined;
  bidInput: string;
  setBidInput: (bidInput: string) => void;
  debouncedBid: string;
  isBidding: boolean;
  showConfirm: boolean;
  setShowConfirm: (showConfirm: boolean) => void;
  timeLeft: string;
  MINIMUM_INCREMENT: number | undefined;
  handleBid: () => Promise<void>;
  confirmBid: () => Promise<void>;
  channel: Channel | null;
  chatClient: StreamChat | null;
  isLoading: boolean;
  connectionStatus: "connected" | "disconnected" | "connecting";
  initializeChannel: (
    productId: string,
    productName: string,
    memberIds?: string[]
  ) => Promise<void>;
  initializeClient: (user: StreamUser) => Promise<void>;
}

export function useAuctionLogic(
  productId: string | undefined
): AuctionLogicReturn {
  const {
    products,
    bidInput,
    isBidding,
    showConfirm,
    timeLeft,
    currentUser,
    updateProduct,
    setBidInput,
    setIsBidding,
    setShowConfirm,
    setTimeLeft,
  } = useAuctionStore();

  const product = products.find((p) => p.id === productId);
  const MINIMUM_INCREMENT = product?.minimumIncrement || 10;

  const [debouncedBid] = useDebounce(bidInput, 300);

  const bidderIds = product
    ? Array.from(new Set(product.bids.map((bid) => bid.userId))).filter(
        (id) => id !== currentUser?.id
      )
    : [];

  const handleMessageNew = (event: Event) => {
    const messageText = event.message?.text;
    if (messageText?.startsWith("Bid: $") && product) {
      const amount = Number.parseInt(messageText.replace("Bid: $", ""));
      if (!isNaN(amount) && amount > product.currentBid) {
        updateProduct(product.id, {
          currentBid: amount,
          bids: [
            {
              id: event.message!.id,
              amount,
              userId: event.message!.user!.id,
              userName: event.message!.user!.name || "Unknown",
              timestamp: new Date(event.message!.created_at || Date.now()),
            },
            ...product.bids,
          ],
        });
        // Update timeLeft after a bid is placed
        setTimeLeft(calculateTimeLeft());
      }
    }
  };

  const {
    channel,
    chatClient,
    connectionStatus,
    isLoading,
    initializeChannel,
    initializeClient,
  } = useAuctionChannel(currentUser, handleMessageNew);

  const calculateTimeLeft = useCallback(() => {
    if (!product) return "Loading...";
    const now = new Date();
    const difference = product.endTime.getTime() - now.getTime();
    if (difference <= 0) return "Auction ended";
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    return `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`;
  }, [product]);

  // Set initial timeLeft when the hook initializes
  if (product && !timeLeft) {
    setTimeLeft(calculateTimeLeft());
  }

  const handleBid = async () => {
    if (!product) {
      toast.error("Product not loaded yet.");
      return;
    }

    const amount = Number.parseInt(debouncedBid);
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

  const confirmBid = async () => {
    if (!currentUser || !productId || !product) {
      toast.error("User or product not available.");
      setShowConfirm(false);
      return;
    }

    try {
      setIsBidding(true);

      if (!chatClient) {
        await initializeClient(currentUser);
      }

      if (!channel) {
        await initializeChannel(productId, product.name, bidderIds);
      }

      if (!channel || connectionStatus !== "connected") {
        toast.error("Chat connection lost. Please try again.");
        return;
      }

      await channel.sendMessage({
        text: `Bid: $${Number.parseInt(debouncedBid)}`,
      });

      if (bidderIds.length > 0) {
        await channel.addMembers(bidderIds);
      }

      setBidInput("");
      toast.success(
        `Bid of $${Number.parseInt(
          debouncedBid
        ).toLocaleString()} placed successfully!`
      );
    } catch (err) {
      console.error("Failed to send bid:", err);
      toast.error("Failed to place bid. Please try again.");
    } finally {
      setIsBidding(false);
      setShowConfirm(false);
    }
  };

  return {
    product,
    bidInput,
    setBidInput,
    debouncedBid,
    isBidding,
    showConfirm,
    setShowConfirm,
    timeLeft,
    MINIMUM_INCREMENT,
    handleBid,
    confirmBid,
    channel,
    chatClient,
    isLoading,
    connectionStatus,
    initializeChannel,
    initializeClient,
  };
}
