/* components/Navbar.tsx */
"use client";
import Image from "next/image";
import { useAuctionStore } from "../store/auctionStore";

export function Navbar() {
  const { currentUser } = useAuctionStore();

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold">Auction App</h1>
        {currentUser && (
          <div className="flex items-center gap-2">
            {currentUser.avatar && (
              <Image
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full"
                height={32}
                width={32}
              />
            )}
            <span>{currentUser.name}</span>
          </div>
        )}
      </div>
    </nav>
  );
}
