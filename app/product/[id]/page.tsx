import { products } from "@/lib/data";
import ProductDetail from "@/components/product-detail";
import Script from "next/script";

export function generateStaticParams() {
  return products.map((product) => ({
    id: product.id,
  }));
}

export default async function ProductPage() {
  return (
    <>
      <Script id="initial-products" strategy="beforeInteractive">
        {`window.__INITIAL_PRODUCTS__ = ${JSON.stringify(products)};`}
      </Script>
      <ProductDetail />
    </>
  );
}
