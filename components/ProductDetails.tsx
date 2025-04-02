import type { Product } from "@/types/product";

type ProductDetailsProps = {
  product: Product;
};

export default function ProductDetails({ product }: ProductDetailsProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{product.name}</h1>
      <p className="text-muted-foreground mt-1">{product.description}</p>
    </div>
  );
}
