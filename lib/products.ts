import type { Product } from "@/types/product";
import { cache } from "react";

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
