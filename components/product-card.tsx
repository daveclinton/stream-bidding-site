"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { JSX } from "react";
import { Product } from "@/store/auctionStore";
import Link from "next/link";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({
  product,
}: ProductCardProps): JSX.Element {
  const router = useRouter();

  return (
    <Card className="overflow-hidden">
      <div className="relative h-48 w-full">
        <Image
          src={product.imageUrl || "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover"
        />
      </div>
      <CardHeader>
        <CardTitle className="line-clamp-1">{product.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">Current Bid</p>
              <p className="text-2xl font-bold">
                ${product.currentBid.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Ends in</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(product.endTime, { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Link className="w-full" href={`/product/${product.id}`} passHref>
          {/* Using passHref to ensure the link works correctly */}
          <Button
            className="w-full"
            onClick={() => router.push(`/product/${product.id}`)}
          >
            View Auction
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
