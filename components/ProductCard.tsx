"use client";

import type React from "react";

import { useState, useEffect } from "react";
import type { Product } from "@/types/product";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isEnded, setIsEnded] = useState<boolean>(product.status === "ended");
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const endTime = new Date(product.endTime);
      const diff = endTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Auction ended");
        setIsEnded(true);
        return true;
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
        return false;
      }
    };

    // Initial update
    const isTimerEnded = updateTimer();

    // Only set interval if timer hasn't ended
    let timer: NodeJS.Timeout | null = null;
    if (!isTimerEnded) {
      timer = setInterval(() => {
        const ended = updateTimer();
        if (ended && timer) {
          clearInterval(timer);
        }
      }, 60000); // Update every minute
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [product.endTime, product.status]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    setIsFavorite(!isFavorite);
  };

  // Calculate if auction is ending soon (less than 24 hours)
  const now = new Date();
  const endTime = new Date(product.endTime);
  const diff = endTime.getTime() - now.getTime();
  const isEndingSoon = diff > 0 && diff < 24 * 60 * 60 * 1000;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90",
              isFavorite && "text-rose-500 hover:text-rose-600"
            )}
            onClick={toggleFavorite}
          >
            <Heart className={cn("h-5 w-5", isFavorite && "fill-current")} />
            <span className="sr-only">Add to favorites</span>
          </Button>
        </div>

        <div className="absolute bottom-2 left-2 z-10">
          {isEnded ? (
            <Badge variant="destructive">Ended</Badge>
          ) : isEndingSoon ? (
            <Badge variant="destructive" className="px-2 py-1">
              <Clock className="mr-1 h-3 w-3" />
              Ending soon
            </Badge>
          ) : null}
        </div>

        <div className="aspect-square overflow-hidden bg-muted">
          <Image
            src={product.imageUrl || "/placeholder.svg"}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            height={400}
            width={400}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
            placeholder="blur"
            blurDataURL={product.imageUrl}
            quality={80}
          />
        </div>
      </div>

      <CardHeader className="p-4 pb-0">
        <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        <p className="text-sm text-muted-foreground line-clamp-2 h-10">
          {product.description}
        </p>

        <div className="mt-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-muted-foreground">Current bid</p>
            <p className="font-bold text-primary">
              ${(product.currentBid || product.startingBid).toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Time left</p>
            <div className="flex items-center gap-1">
              {!isEnded && <Clock className="h-3 w-3" />}
              <p
                className={cn(
                  "text-sm font-medium",
                  isEnded ? "text-destructive" : "text-primary"
                )}
              >
                {timeRemaining}
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Link href={`/auction/${product.id}`} className="w-full">
          <Button
            className="w-full"
            variant={isEnded ? "outline" : "default"}
            disabled={isEnded}
          >
            {isEnded ? "Auction Ended" : "Bid Now"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
