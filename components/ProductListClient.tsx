"use client";

import { useState } from "react";
import type { Product } from "@/types/product";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCcw, Search } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useRouter } from "next/navigation";

interface ProductsListProps {
  initialProducts: Product[];
}

export default function ProductsList({ initialProducts }: ProductsListProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [filteredProducts, setFilteredProducts] =
    useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const router = useRouter();
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredProducts(products);
      return;
    }
    const filtered = products.filter((product) =>
      product.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/products");
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const freshData = await response.json();
      setProducts(freshData);
      handleSearch(searchQuery);
      router.refresh();
    } catch (err) {
      console.error("Error refreshing products:", err);
      setError("Failed to refresh products. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search auctions..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="shrink-0"
          disabled={loading}
        >
          <RefreshCcw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-primary/10 p-6 mb-4">
            <RefreshCcw className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">No active auctions</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            {searchQuery
              ? "No auctions match your search criteria. Try different keywords or clear your search."
              : "There are no active auctions at the moment. Please check back later."}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => handleSearch("")}
            >
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
