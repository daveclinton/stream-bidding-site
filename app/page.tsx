import { Suspense } from "react";
import ProductsList from "@/components/ProductListClient";
import { ProductsPageSkeleton } from "@/components/ProductPageSkelton";
import { getAllProducts } from "@/lib/products";

export default async function Page() {
  const products = await getAllProducts();
  return (
    <main className="container mx-auto py-12 px-4 max-w-7xl">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Live Auctions</h1>
            <p className="text-muted-foreground mt-2">
              Discover unique items and place your bids before time runs out
            </p>
          </div>
        </div>
        <Suspense fallback={<ProductsPageSkeleton />}>
          <ProductsList initialProducts={products} />
        </Suspense>
      </div>
    </main>
  );
}
