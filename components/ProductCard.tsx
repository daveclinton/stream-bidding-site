"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types/product";
import Link from "next/link";
import Image from "next/image";

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isEnded, setIsEnded] = useState<boolean>(product.status === "ended");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const endTime = new Date(product.endTime);
      const diff = endTime.getTime() - now.getTime();

      if (diff <= 0) {
        clearInterval(timer);
        setTimeRemaining("Auction ended");
        setIsEnded(true);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    }, 60000);

    const now = new Date();
    const endTime = new Date(product.endTime);
    const diff = endTime.getTime() - now.getTime();

    if (diff <= 0) {
      setTimeRemaining("Auction ended");
      setIsEnded(true);
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m`);
    }

    return () => clearInterval(timer);
  }, [product.endTime, product.status]);

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-w-16 aspect-h-9 bg-gray-100">
        <Image
          src={product.imageUrl}
          alt={product.name}
          className="object-cover w-full h-48"
          height={48}
          width={48}
          sizes="(max-width: 768px) 100vw, (min-width: 769px) 50vw"
          loading="lazy"
          placeholder="blur"
          blurDataURL={product.imageUrl}
          style={{ objectFit: "cover" }}
          quality={80}
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg">{product.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 h-10">
          {product.description}
        </p>

        <div className="mt-3 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500">Current bid</p>
            <p className="font-bold text-green-600">
              ${(product.currentBid || product.startingBid).toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Time left</p>
            <p
              className={`text-sm font-medium ${
                isEnded ? "text-red-500" : "text-blue-600"
              }`}
            >
              {timeRemaining}
            </p>
          </div>
        </div>

        <Link href={`/auction/${product.id}`} className="block w-full mt-4">
          <button
            className={`w-full py-2 px-4 rounded text-white text-sm font-medium
              ${
                isEnded
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            disabled={isEnded}
          >
            {isEnded ? "Auction Ended" : "Bid Now"}
          </button>
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;
