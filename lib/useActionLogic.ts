"use client";
import { useEffect } from "react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { Event } from "stream-chat";
import { Product, useAuctionStore } from "../store/auctionStore";
import { useAuctionChannel } from "@/store/useAuctionChannel";
import { Channel, StreamChat } from "stream-chat";

interface AuctionLogicReturn {
  product: Product;
  bidInput: string;
  setBidInput: (bidInput: string) => void;
  debouncedBid: string;
  isBidding: boolean;
  showConfirm: boolean;
  setShowConfirm: (showConfirm: boolean) => void;
  timeLeft: string;
  MINIMUM_INCREMENT: number;
  handleBid: () => Promise<void>;
  confirmBid: () => Promise<void>;
  channel: Channel | null;
  chatClient: StreamChat | null;
  isLoading: boolean;
  connectionStatus: "connected" | "disconnected" | "connecting"; // From useAuctionChannel
  initializeChannel: (productId: string, productName: string) => Promise<void>; // From useAuctionChannel
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

  const product =
    products.find((p) => p.id === productId) ??
    ((): never => {
      throw new Error(`Product with ID ${productId} not found`);
    })();

  const [debouncedBid] = useDebounce(bidInput, 300);
  const MINIMUM_INCREMENT = product.minimumIncrement || 10;

  const handleMessageNew = (event: Event) => {
    const messageText = event.message?.text;
    if (messageText?.startsWith("Bid: $")) {
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
      }
    }
  };

  const {
    channel,
    chatClient,
    connectionStatus,
    isLoading,
    initializeChannel,
  } = useAuctionChannel(currentUser, handleMessageNew);

  useEffect(() => {
    if (!productId || !product || isLoading || !currentUser) return;
    initializeChannel(productId, product.name);
  }, [productId, product, isLoading, initializeChannel, currentUser]);

  useEffect(() => {
    if (!product) return;

    const calculateTimeLeft = () => {
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
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [product, setTimeLeft]);

  const handleBid = async () => {
    if (!product) return;

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
    if (!channel || connectionStatus !== "connected") {
      toast.error("Chat connection lost. Please refresh the page.");
      setShowConfirm(false);
      return;
    }

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
  };
}
