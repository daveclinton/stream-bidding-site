/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { JSX, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import {
  Chat,
  Channel as StreamChannel,
  Window,
  ChannelHeader,
  MessageList,
  MessageInput,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
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
import { useParams } from "next/navigation";
import { products as initialProducts } from "@/lib/data";
import { Bid, useAuctionStore } from "@/store/auctionStore";
import { useAuctionLogic } from "@/lib/useActionLogic";

declare global {
  interface Window {
    __INITIAL_PRODUCTS__: any;
  }
}

const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY || "";

export default function ProductDetail(): JSX.Element {
  const { id } = useParams();
  const productId = Array.isArray(id) ? id[0] : id;
  const { products, setProducts, currentUser } = useAuctionStore();

  useEffect(() => {
    if (products.length === 0) {
      const serverProducts =
        typeof window !== "undefined" && window.__INITIAL_PRODUCTS__;
      setProducts(serverProducts || initialProducts);
    }
  }, [products, setProducts]);

  const {
    product,
    bidInput,
    setBidInput,
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
    initializeChannel,
  } = useAuctionLogic(productId);

  // Initialize the channel when product and chatClient are ready
  useEffect(() => {
    if (!productId || !product || !chatClient || !currentUser || isLoading)
      return;

    initializeChannel(productId, product.name);
  }, [
    productId,
    product,
    chatClient,
    currentUser,
    isLoading,
    initializeChannel,
  ]);

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Please log in to participate in the auction.</p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Error: Stream API key is not configured.</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Product not found</p>
      </div>
    );
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setBidInput(e.target.value)
              }
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
            <span className="ml-2 inline-flex items-center">
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
          {channel && chatClient && chatClient.userID ? (
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
            <div className="flex items-center justify-center h-64">
              <p>
                {connectionStatus === "connecting"
                  ? "Connecting to chat..."
                  : "Reconnecting to chat..."}
              </p>
            </div>
          )}
        </Card>
        <Card className="p-4 mt-6">
          <h2 className="text-xl font-bold mb-4">Bid History</h2>
          {product.bids.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {product.bids.map((bid: Bid) => (
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
              Are you sure you want to place a bid of ${bidInput} on{" "}
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
