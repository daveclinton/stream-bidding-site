import { useState } from "react";
import { Loader2, AlertCircle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StreamChat } from "stream-chat";
import type { DefaultGenerics } from "stream-chat";

type BiddingInterfaceProps = {
  client: StreamChat<DefaultGenerics> | null;
  userId: string;
  currentBid: number;
  isAuctionEnded: boolean;
  isConnecting: boolean;
  isLoading: boolean;
  handleConnect: () => Promise<void>;
  handleBid: () => Promise<void>;
  error: string | null;
  winner: string | null;
};

export default function BiddingInterface({
  client,
  userId,
  currentBid,
  isAuctionEnded,
  isConnecting,
  isLoading,
  handleConnect,
  handleBid,
  error,
  winner,
}: BiddingInterfaceProps) {
  const [bidInput, setBidInput] = useState<string>("");

  const onBid = async () => {
    await handleBid();
    setBidInput("");
  };

  if (!client) {
    return (
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="w-full"
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          "Join Auction"
        )}
      </Button>
    );
  }

  if (isAuctionEnded) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">This auction has ended</p>
          {winner === userId && (
            <div className="mt-2 flex items-center justify-center text-primary font-bold">
              <Trophy className="mr-2 h-5 w-5" />
              Congratulations! You won this auction.
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="number"
          value={bidInput}
          onChange={(e) => setBidInput(e.target.value)}
          placeholder={`Min bid: $${(currentBid + 1).toFixed(2)}`}
          className="flex-1"
          min={currentBid + 1}
          step="0.01"
        />
        <Button
          onClick={onBid}
          disabled={isLoading || !bidInput}
          className="shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Placing...
            </>
          ) : (
            "Place Bid"
          )}
        </Button>
      </div>
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
