"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import {
  Chat,
  Channel as StreamChannel,
  Window,
  ChannelHeader,
  MessageList,
  MessageInput,
  useCreateChatClient,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import { Channel, Event } from "stream-chat";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useDebounce } from "use-debounce";

interface Bid {
  id: string;
  amount: number;
  userId: string;
  userName: string;
  timestamp: Date;
}

interface Product {
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

interface ProductDetailProps {
  initialProduct: Product;
}

export default function ProductDetail({ initialProduct }: ProductDetailProps) {
  const [product, setProduct] = useState<Product>(initialProduct);
  const [bidInput, setBidInput] = useState("");
  const [debouncedBid] = useDebounce(bidInput, 300);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userData] = useState({
    id: "user-42",
    name: "Jane Smith",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isBidding, setIsBidding] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("connecting");
  const [timeLeft, setTimeLeft] = useState<string>("");

  const MINIMUM_INCREMENT = initialProduct.minimumIncrement || 10;
  const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY || "";

  const tokenProvider = useCallback(() => {
    if (token) {
      return Promise.resolve(token);
    }

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

  useEffect(() => {
    let mounted = true;

    const fetchToken = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/get-stream-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: userData.id,
            userName: userData.name,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (mounted) {
          setToken(data.token);
        }
        console.log("Token fetched successfully:", data.token);
      } catch (err) {
        if (mounted) {
          console.error("Failed to fetch token:", err);
          toast.error("Failed to authenticate chat. Please refresh.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchToken();
    return () => {
      mounted = false;
    };
  }, [userData]);

  useEffect(() => {
    if (!chatClient) return;

    let channelCleanup: () => void;

    const initChannel = async () => {
      try {
        const productChannel = chatClient.channel("messaging", product.id, {
          name: `${product.name} Auction`,
        });
        await productChannel.watch();
        setChannel(productChannel);

        const listener = productChannel.on("message.new", (event: Event) => {
          const messageText = event.message?.text;
          if (messageText?.startsWith("Bid: $")) {
            const amount = Number.parseInt(messageText.replace("Bid: $", ""));
            if (!isNaN(amount) && amount > product.currentBid) {
              setProduct((prev) => ({
                ...prev,
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
                  ...prev.bids,
                ],
              }));
            }
          }
        });
        channelCleanup = () => {
          listener.unsubscribe();
          productChannel.stopWatching();
        };
      } catch (err) {
        console.error("Failed to initialize channel:", err);
        toast.error("Failed to load auction chat. Please refresh.");
      }
    };

    initChannel();
    return () => {
      if (channelCleanup) channelCleanup();
    };
  }, [chatClient, product.id, product.name, product.currentBid]);

  useEffect(() => {
    if (!chatClient) return;

    const handleConnectionChange = (event: Event) => {
      setConnectionStatus(event.online ? "connected" : "disconnected");
    };

    chatClient.on("connection.changed", handleConnectionChange);

    return () => {
      chatClient.off("connection.changed", handleConnectionChange);
    };
  }, [chatClient]);

  // Countdown timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = product.endTime.getTime() - now.getTime();

      if (difference <= 0) {
        return "Auction ended";
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return `${days > 0 ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [product.endTime]);

  // Auto-reconnect if disconnected
  useEffect(() => {
    if (connectionStatus === "disconnected" && chatClient) {
      const reconnectTimer = setTimeout(() => {
        console.log("Attempting to reconnect...");
        chatClient.connectUser(userData, token as string).catch((err) => {
          console.error("Failed to reconnect:", err);
          toast.error("Failed to reconnect. Please refresh the page.");
        });
      }, 5000); // Try to reconnect after 5 seconds

      return () => clearTimeout(reconnectTimer);
    }
  }, [connectionStatus, chatClient, userData, token]);

  const handleBid = async () => {
    const amount = Number.parseInt(debouncedBid);

    // Check if auction has ended
    if (product.endTime < new Date()) {
      toast.error("This auction has already ended");
      return;
    }

    // Validate bid amount
    if (isNaN(amount)) {
      toast.warning("Please enter a valid amount");
      return;
    }

    // Check minimum bid
    if (amount <= product.currentBid) {
      toast.warning("Bid must be higher than the current bid");
      return;
    }

    // Check minimum increment
    if (amount < product.currentBid + MINIMUM_INCREMENT) {
      toast.warning(
        `Bid must be at least $${MINIMUM_INCREMENT} higher than current bid`
      );
      return;
    }

    setShowConfirm(true);
  };

  const confirmBid = async () => {
    if (channel) {
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
    }
  };

  if (!apiKey) {
    return <div>Error: Stream API key is not configured.</div>;
  }

  if (isLoading || !chatClient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="relative h-[400px] w-full rounded-lg bg-muted animate-pulse" />
            <div>
              <div className="h-8 w-3/4 bg-muted rounded animate-pulse mb-2" />
              <div className="h-20 bg-muted rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-24 bg-muted rounded animate-pulse" />
                <div className="h-24 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="h-[600px] bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="relative h-[400px] w-full rounded-lg overflow-hidden">
            <Image
              src={product.imageUrl || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <p className="text-lg text-muted-foreground mb-4">
              {product.description}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="text-sm font-medium">Current Bid</p>
                <p className="text-2xl font-bold">
                  ${product.currentBid.toLocaleString()}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm font-medium">Auction Ends</p>
                <p className="text-lg font-bold">{timeLeft}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(product.endTime, { addSuffix: true })}
                </p>
              </Card>
            </div>
          </div>
          <div className="flex gap-4">
            <Input
              type="number"
              value={bidInput}
              onChange={(e) => setBidInput(e.target.value)}
              placeholder={`Enter bid amount (min. $${(
                product.currentBid + MINIMUM_INCREMENT
              ).toLocaleString()})`}
              className="flex-1"
              disabled={isBidding}
            />
            <Button onClick={handleBid} disabled={isBidding}>
              {isBidding ? "Placing Bid..." : "Place Bid"}
            </Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setBidInput((product.currentBid + MINIMUM_INCREMENT).toString())
              }
            >
              +${MINIMUM_INCREMENT}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setBidInput(
                  (product.currentBid + MINIMUM_INCREMENT * 2).toString()
                )
              }
            >
              +${MINIMUM_INCREMENT * 2}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setBidInput(
                  (product.currentBid + MINIMUM_INCREMENT * 5).toString()
                )
              }
            >
              +${MINIMUM_INCREMENT * 5}
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <h2 className="text-xl font-bold mb-4">Auction Chat</h2>
          <div className="chat-status mb-2">
            Connection Status:
            <span className={`ml-2 inline-flex items-center`}>
              <span
                className={`h-2 w-2 rounded-full mr-2 ${
                  connectionStatus === "connected"
                    ? "bg-green-500"
                    : connectionStatus === "connecting"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
              />
              {connectionStatus}
            </span>
          </div>
          {channel ? (
            <Chat client={chatClient}>
              <StreamChannel channel={channel}>
                <Window>
                  <ChannelHeader />
                  <MessageList />
                  <MessageInput />
                </Window>
              </StreamChannel>
            </Chat>
          ) : (
            <p>Loading chat...</p>
          )}
        </Card>
        <Card className="p-4 mt-6">
          <h2 className="text-xl font-bold mb-4">Bid History</h2>
          {product.bids.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {product.bids.map((bid) => (
                <div
                  key={bid.id}
                  className="flex justify-between items-center p-2 border-b"
                >
                  <div>
                    <p className="font-medium">{bid.userName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(bid.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <p className="font-bold">${bid.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No bids yet</p>
          )}
        </Card>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bid</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to place a bid of ${debouncedBid} on{" "}
              {product.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBid} disabled={isBidding}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
