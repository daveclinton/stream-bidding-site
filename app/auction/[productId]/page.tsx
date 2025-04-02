import { Product } from "@/types/product";
import ClientBiddingPage from "./ClientBiddingPage";
import { getProductById } from "@/lib/products";

export default async function ServerBiddingPage({
  params,
}: {
  params: { productId: string };
}) {
  const { productId } = await params;
  let product: Product | null = null;
  let error: string | null = null;

  try {
    product = await getProductById(productId);
  } catch (err) {
    console.error("Failed to fetch product data:", err);
    error = "Failed to load product information";
  }
  return <ClientBiddingPage product={product} error={error} />;
}
