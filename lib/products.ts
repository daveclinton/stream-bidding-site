import { cache } from "react";
import type { Product } from "@/types/product";

export const getProductById = cache(
  async (productId: string): Promise<Product | null> => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/products?id=${productId}`,
        {
          next: {
            revalidate: 30,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch product");
      }

      return await res.json();
    } catch (error) {
      console.error("Error fetching product:", error);
      return null;
    }
  }
);

export async function getAllProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`, {
      next: {
        revalidate: 60,
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch products");
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function updateProductBid(
  productId: string,
  currentBid: number,
  highestBidder: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentBid,
          highestBidder,
        }),
      }
    );

    return res.ok;
  } catch (error) {
    console.error("Error updating product bid:", error);
    return false;
  }
}
