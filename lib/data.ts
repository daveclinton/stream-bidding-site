import { Product } from "@/store/auctionStore";

export const products: Product[] = [
  {
    id: "1",
    name: "Vintage Rolex Submariner",
    description:
      "A classic 1960s Rolex Submariner in excellent condition. Original parts and movement.",
    currentBid: 15000,
    startingPrice: 10000,
    endTime: new Date(Date.now() + 172800000), // 48 hours from now
    imageUrl:
      "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?auto=format&fit=crop&q=80",
    bids: [],
  },
  {
    id: "2",
    name: "First Edition Harry Potter Book",
    description:
      "First edition, first printing of Harry Potter and the Philosopher's Stone. Signed by J.K. Rowling.",
    currentBid: 25000,
    startingPrice: 20000,
    endTime: new Date(Date.now() + 259200000), // 72 hours from now
    imageUrl:
      "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80",
    bids: [],
  },
  {
    id: "3",
    name: "Original Apple-1 Computer",
    description:
      "One of only 200 Apple-1 computers ever made. In working condition with original components.",
    currentBid: 350000,
    startingPrice: 300000,
    endTime: new Date(Date.now() + 432000000), // 120 hours from now
    imageUrl:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80",
    bids: [],
  },
];
