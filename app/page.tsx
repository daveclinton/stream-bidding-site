"use client";
import { JSX } from "react";
import ProductCard from "@/components/product-card";
import { useAuctionStore } from "@/store/auctionStore";

export default function Home(): JSX.Element {
  const { products } = useAuctionStore();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Featured Auctions</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
