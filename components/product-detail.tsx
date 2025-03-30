"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import Image from "next/image";

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
}

interface ProductDetailProps {
  initialProduct: Product;
}

export default function ProductDetail({ initialProduct }: ProductDetailProps) {
  const [product, setProduct] = useState<Product>(initialProduct);
  const [bidAmount, setBidAmount] = useState("");

  const handleBid = () => {
    const amount = parseInt(bidAmount);
    if (isNaN(amount) || amount <= product.currentBid) {
      toast.warning("Bid must be higher than the current bid");
      return;
    }

    const newBid: Bid = {
      id: Math.random().toString(),
      amount,
      userId: "user-1",
      userName: "John Doe",
      timestamp: new Date(),
    };

    setProduct((prev) => ({
      ...prev,
      currentBid: amount,
      bids: [newBid, ...prev.bids],
    }));
    setBidAmount("");
    toast.success(`Bid of $${amount.toLocaleString()} placed successfully!`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="relative h-[400px] w-full rounded-lg overflow-hidden">
            <Image
              src={product.imageUrl}
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
                <p className="text-lg">
                  {formatDistanceToNow(product.endTime, { addSuffix: true })}
                </p>
              </Card>
            </div>
          </div>
          <div className="flex gap-4">
            <Input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder={`Enter bid amount (min. $${(
                product.currentBid + 1
              ).toLocaleString()})`}
              className="flex-1"
            />
            <Button onClick={handleBid}>Place Bid</Button>
          </div>
        </div>

        <Card className="p-4">
          <h2 className="text-xl font-bold mb-4">Bid History</h2>
          <ScrollArea className="h-[600px]">
            {product.bids.length === 0 ? (
              <p className="text-center text-muted-foreground">
                No bids yet. Be the first to bid!
              </p>
            ) : (
              <div className="space-y-4">
                {product.bids.map((bid) => (
                  <div
                    key={bid.id}
                    className="flex justify-between items-center p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{bid.userName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(bid.timestamp, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <p className="text-lg font-bold">
                      ${bid.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
