"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      onClick={() => router.back()}
      className="mb-6 flex items-center gap-2"
    >
      <ArrowLeft className="h-4 w-4" />
      Go Back
    </Button>
  );
}
