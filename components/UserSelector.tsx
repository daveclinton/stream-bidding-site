/* components/UserSelector.tsx */
"use client";
import Image from "next/image";
import { useAuctionStore, StreamUser, dummyUsers } from "../store/auctionStore";

interface UserSelectorProps {
  onUserSelect?: (user: StreamUser) => void;
  className?: string;
}

export function UserSelector({ onUserSelect, className }: UserSelectorProps) {
  const { currentUser, setCurrentUser } = useAuctionStore();

  const handleUserSelect = (user: StreamUser) => {
    setCurrentUser(user);
    if (onUserSelect) onUserSelect(user);
  };

  return (
    <div className={`p-4 bg-gray-100 rounded shadow ${className || ""}`}>
      <h3 className="text-lg font-medium mb-2">Select User</h3>
      <div className="flex flex-wrap gap-2">
        {dummyUsers.map((user) => (
          <button
            key={user.id}
            className={`flex items-center p-2 rounded-lg ${
              currentUser?.id === user.id
                ? "bg-blue-500 text-white"
                : "bg-white hover:bg-gray-200"
            }`}
            onClick={() => handleUserSelect(user)}
          >
            {user.avatar && (
              <Image
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full mr-2"
                height={32}
                width={32}
              />
            )}
            <span>{user.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
