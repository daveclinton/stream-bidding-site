/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  StreamChat,
  type Channel as StreamChannel,
  type DefaultGenerics,
  type Event,
} from "stream-chat";
import "stream-chat-react/dist/css/v2/index.css";
import type { Product } from "@/types/product";
import { Button } from "@/components/ui/button";

import { ArrowLeft, Loader2 } from "lucide-react";

import ProductDetails from "@/components/ProductDetails";
import AuctionStatus from "@/components/AuctionStatus";
import BiddingInterface from "@/components/BiddingInterface";
import ChatInterface from "@/components/ChatInterface";

type BidMessage = {
  bidder: string;
  amount: number;
};

export default function BiddingPage() {
  const params = useParams();
  const productId = params.productId as string;

  const [client, setClient] = useState<StreamChat<DefaultGenerics> | null>(
    null
  );
  const [channel, setChannel] = useState<StreamChannel<DefaultGenerics> | null>(
    null
  );
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [highestBidder, setHighestBidder] = useState<string | null>(null);
  const [bidInput, setBidInput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [, setIsLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isAuctionEnded, setIsAuctionEnded] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState<boolean>(true);

  useEffect(() => {
    setUserId(`user-${Math.random().toString(36).substring(2, 7)}`);
    fetchProductData();
  }, [productId]);

  const fetchProductData = async () => {
    try {
      setIsLoadingProduct(true);
      const res = await fetch(`/api/products?id=${productId}`);

      if (!res.ok) {
        throw new Error("Failed to fetch product");
      }

      const productData = await res.json();
      setProduct(productData);
      setCurrentBid(productData.currentBid || productData.startingBid);

      // Check if auction is already ended
      const endTime = new Date(productData.endTime);
      if (endTime <= new Date() || productData.status === "ended") {
        setIsAuctionEnded(true);
        setTimeRemaining("Auction ended");
      }
    } catch (err) {
      console.error("Failed to fetch product data:", err);
      setError("Failed to load product information");
    } finally {
      setIsLoadingProduct(false);
    }
  };

  useEffect(() => {
    if (!product) return;

    const timer = setInterval(() => {
      const now = new Date();
      const endTime = new Date(product.endTime);
      const diff = endTime.getTime() - now.getTime();

      if (diff <= 0) {
        clearInterval(timer);
        setTimeRemaining("Auction ended");
        setIsAuctionEnded(true);
        if (channel && highestBidder) {
          declareWinner();
        }
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining(`${minutes}m ${seconds}s`);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [product, channel, highestBidder]);

  useEffect(() => {
    return () => {
      if (client) {
        client
          .disconnectUser()
          .catch((err) =>
            console.error("Disconnect error:", (err as Error).message)
          );
      }
    };
  }, [client]);

  const declareWinner = async () => {
    if (!channel || !highestBidder) return;

    try {
      await channel.sendMessage({
        text: `🎉 Auction ended! ${highestBidder} won with a bid of $${currentBid.toFixed(
          2
        )}`,
        auctionEnd: true,
        winner: highestBidder,
        finalBid: currentBid,
      });

      setWinner(highestBidder);

      await fetch("/api/finalize-auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          winner: highestBidder,
          amount: currentBid,
        }),
      });
    } catch (err) {
      console.error("Failed to declare winner:", err);
      setError("Failed to finalize auction");
    }
  };

  const handleConnect = async () => {
    if (!userId) return;

    try {
      setError(null);
      setIsConnecting(true);

      const res = await fetch("/api/stream-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, productId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch token");
      }

      const { token } = (await res.json()) as { token: string };
      const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;
      if (!apiKey) {
        throw new Error("Stream API key is not configured");
      }

      if (client) {
        await client.disconnectUser();
      }

      const chatClient = StreamChat.getInstance<DefaultGenerics>(apiKey);
      await chatClient.connectUser(
        {
          id: userId,
          name: userId,
          image: "https://i.imgur.com/fR9Jz14.png",
        },
        token
      );

      setClient(chatClient);

      chatClient.on((event: Event<DefaultGenerics>) => {
        if (event.type === "connection.changed" && !event.online) {
          console.log("Connection lost, attempting to reconnect...");
          setError("Connection lost. Reconnecting...");
          handleConnect();
        }
      });

      await joinChannel(chatClient);
    } catch (err) {
      const typedError = err as Error;
      console.error("Connect error:", typedError.message);
      setError(`Failed to connect: ${typedError.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const joinChannel = async (chatClient: StreamChat<DefaultGenerics>) => {
    if (!chatClient.user) {
      setError("Client not connected. Please reconnect.");
      handleConnect();
      return;
    }

    if (!product) {
      setError("Product information not available.");
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      const channelId = `auction-${productId}`;
      const chatChannel = chatClient.channel("messaging", channelId, {
        name: `Bidding for ${product.name}`,
        product: product,
        auctionEnd: new Date(product.endTime).toISOString(),
      });

      await chatChannel.watch();
      setChannel(chatChannel);

      const response = await chatChannel.query({ messages: { limit: 100 } });
      const messages = response.messages || [];

      // Check if auction is already ended
      const auctionEndMessage = messages.find((msg) => msg.auctionEnd === true);
      if (auctionEndMessage) {
        setIsAuctionEnded(true);
        setWinner((auctionEndMessage.winner as string) || null);
        if (typeof auctionEndMessage.finalBid === "number") {
          setCurrentBid(auctionEndMessage.finalBid);
        }
      }

      // Process bid messages
      const bidMessages: BidMessage[] = messages
        .map((msg) => {
          const text = msg.text || "";
          const match = text.match(/(\w+) placed a bid of \$(\d+\.?\d*)/);
          if (match) {
            const [, bidder, amount] = match;
            return { bidder, amount: Number.parseFloat(amount) };
          }
          return null;
        })
        .filter((bid): bid is BidMessage => bid !== null);

      if (bidMessages.length > 0) {
        const highestBid = bidMessages.reduce((prev, current) =>
          prev.amount > current.amount ? prev : current
        );
        setCurrentBid(Math.max(highestBid.amount, product.startingBid));
        setHighestBidder(highestBid.bidder);
      } else {
        setCurrentBid(product.startingBid);
      }

      // Handle message events
      chatChannel.on((event: Event<DefaultGenerics>) => {
        if (event.type === "message.new") {
          const messageText = event.message?.text || "";

          // Handle auction end message
          if (event.message?.auctionEnd === true) {
            setIsAuctionEnded(true);
            setWinner((event.message.winner as string) || null);
            return;
          }

          // Handle bid message
          const match = messageText.match(
            /(\w+) placed a bid of \$(\d+\.?\d*)/
          );
          if (match) {
            const [, bidder, amount] = match;
            const bidValue = Number.parseFloat(amount);

            if (bidValue > currentBid) {
              setCurrentBid(bidValue);
              setHighestBidder(bidder);
            }
          }
        }
      });
    } catch (err) {
      const typedError = err as Error;
      console.error("Join channel error:", typedError.message);
      setError(`Failed to join bidding room: ${typedError.message}`);
    } finally {
      setIsJoining(false);
    }
  };

  const handleBid = async () => {
    if (!channel) {
      setError("Please join the channel first.");
      return;
    }

    if (isAuctionEnded) {
      setError("This auction has ended.");
      return;
    }

    const bidValue = Number.parseFloat(bidInput);

    if (isNaN(bidValue)) {
      setError("Please enter a valid number.");
      return;
    }

    if (bidValue <= currentBid) {
      setError(
        `Your bid must be higher than the current bid of $${currentBid.toFixed(
          2
        )}.`
      );
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await channel.sendMessage({
        text: `${userId} placed a bid of $${bidValue.toFixed(2)}`,
      });

      setCurrentBid(bidValue);
      setHighestBidder(userId);
      setBidInput("");
    } catch (err) {
      const typedError = err as Error;
      console.error("Bid error:", typedError.message);
      setError(`Failed to place bid: ${typedError.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingProduct) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The product you&apos;re looking for doesn&rsquo;t exist or has been
          removed.
        </p>
        <Button asChild>
          <Link href="/">Back to All Auctions</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <div className="w-full md:w-1/3 p-6 border-r">
        <Button variant="ghost" size="sm" className="mb-6" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Auctions
          </Link>
        </Button>

        <div className="space-y-6">
          <ProductDetails product={product} />

          <AuctionStatus
            isAuctionEnded={isAuctionEnded}
            timeRemaining={timeRemaining}
            currentBid={currentBid}
            highestBidder={highestBidder}
            winner={winner}
            userId={userId}
          />

          <BiddingInterface
            client={client}
            userId={userId}
            currentBid={currentBid}
            isAuctionEnded={isAuctionEnded}
            isConnecting={isConnecting}
            isLoading={isJoining}
            handleConnect={handleConnect}
            handleBid={handleBid}
            error={error}
            winner={winner}
            bidInput={bidInput}
            setBidInput={setBidInput}
          />
        </div>
      </div>

      <ChatInterface
        client={client}
        channel={channel}
        isJoining={isJoining}
        isConnecting={isConnecting}
        handleConnect={handleConnect}
        isAuctionEnded={isAuctionEnded}
      />
    </div>
  );
}
