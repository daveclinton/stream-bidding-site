/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import "stream-chat-react/dist/css/v2/index.css";
import type { Product } from "@/types/product";

type BidMessage = {
  bidder: string;
  amount: number;
};

interface ClientBiddingPageProps {
  product: Product | null;
  error: string | null;
}

export default function ClientBiddingPage({
  product,
  error: initialError,
}: ClientBiddingPageProps) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <p>Hello</p>
    </div>
  );
}
