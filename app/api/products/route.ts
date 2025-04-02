import { Product } from "@/types/product";
import { NextRequest, NextResponse } from "next/server";

export const PRODUCTS: { [key: string]: Product } = {
  "product-1": {
    id: "product-1",
    name: "Vintage Watch",
    description: "A beautiful vintage watch from the 1950s",
    startingBid: 100,
    currentBid: 125,
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    imageUrl: "https://i.imgur.com/fR9Jz14.png",
    status: "active",
  },
  "product-2": {
    id: "product-2",
    name: "Antique Camera",
    description: "Rare vintage camera in excellent condition",
    startingBid: 200,
    currentBid: 200,
    endTime: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
    imageUrl: "https://i.imgur.com/fR9Jz14.png",
    status: "active",
  },
  "product-3": {
    id: "product-3",
    name: "Art Deco Lamp",
    description: "Original art deco design lamp from the 1930s",
    startingBid: 150,
    currentBid: 180,
    endTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
    imageUrl: "https://i.imgur.com/fR9Jz14.png",
    status: "active",
  },
  "product-4": {
    id: "product-4",
    name: "Collector's Vinyl Record",
    description: "First edition vinyl record in mint condition",
    startingBid: 80,
    currentBid: 115,
    endTime: new Date(Date.now() + 36 * 60 * 60 * 1000), // 36 hours from now
    imageUrl: "https://i.imgur.com/fR9Jz14.png",
    status: "active",
  },
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("id");

    if (productId) {
      const product = PRODUCTS[productId];
      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(product);
    }

    // Return all products
    const productsList = Object.values(PRODUCTS);
    return NextResponse.json(productsList);
  } catch (error) {
    const typedError = error as Error;
    return NextResponse.json(
      { error: "Failed to fetch products", details: typedError.message },
      { status: 500 }
    );
  }
}
