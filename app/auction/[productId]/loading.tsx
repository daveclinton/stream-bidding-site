import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading auction details...</p>
      </div>
    </div>
  );
}
