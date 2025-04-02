export interface Product {
  id: string;
  name: string;
  description: string;
  startingBid: number;
  currentBid?: number;
  endTime: Date;
  imageUrl: string;
  status: "active" | "ended" | "scheduled";
  winner?: string;
}

export interface ProductWithBids extends Product {
  highestBidder: string | null;
  totalBids: number;
  timeRemaining: string;
}
