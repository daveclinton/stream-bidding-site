import { products } from "@/lib/data";
import ProductDetail from "@/components/product-detail";
import BackButton from "@/components/back-button";

export function generateStaticParams() {
  return products.map((product) => ({
    id: product.id,
  }));
}

export default async function ProductPage({
  params,
}: {
  params: { id: number };
}) {
  const { id } = await params;
  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton />
      <ProductDetail id={id} />
    </div>
  );
}
