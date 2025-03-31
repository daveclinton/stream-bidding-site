"use client";
import { useAuctionStore } from "../store/auctionStore";
import { UserSelector } from "./UserSelector";

export function UserSelectionModal() {
  const { currentUser } = useAuctionStore();

  if (currentUser) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Please Select a User</h2>
        <UserSelector />
      </div>
    </div>
  );
}
