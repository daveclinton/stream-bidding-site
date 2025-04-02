import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
      <p className="text-muted-foreground mb-6">
        The auction you&apos;re looking for doesn&apos;t exist or has been
        removed.
      </p>
      <Button asChild>
        <Link href="/">Back to All Auctions</Link>
      </Button>
    </div>
  );
}
