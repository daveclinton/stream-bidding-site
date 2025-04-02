import { PRODUCTS } from "@/lib/data";
import { NextRequest, NextResponse } from "next/server";

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
