import { Clock, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type AuctionStatusProps = {
  isAuctionEnded: boolean;
  timeRemaining: string;
  currentBid: number;
  highestBidder: string | null;
  winner: string | null;
  userId: string;
};

export default function AuctionStatus({
  isAuctionEnded,
  timeRemaining,
  currentBid,
  highestBidder,
  winner,
  userId,
}: AuctionStatusProps) {
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Auction Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isAuctionEnded ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-yellow-800">
              <div className="font-medium flex items-center">
                <Trophy className="mr-2 h-4 w-4" />
                Auction Ended
              </div>
              {winner && (
                <p className="mt-1">
                  Winner:{" "}
                  <span className="font-medium">
                    {winner === userId ? "You" : winner}
                  </span>{" "}
                  <span className="font-bold">(${currentBid.toFixed(2)})</span>
                </p>
              )}
            </div>
          ) : (
            <div className="bg-primary/10 rounded-md p-3 text-primary">
              <div className="font-medium flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Time Remaining
              </div>
              <p className="text-lg font-bold mt-1">{timeRemaining}</p>
            </div>
          )}

          <div className="mt-4">
            <div className="text-sm text-muted-foreground">Current bid</div>
            <div className="text-2xl font-bold text-primary">
              ${currentBid.toFixed(2)}
            </div>
            {highestBidder && (
              <div className="text-sm text-muted-foreground mt-1">
                Highest bidder:{" "}
                <span className="font-medium">
                  {highestBidder === userId ? "You" : highestBidder}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {userId && (
        <div className="text-sm text-muted-foreground">
          Your ID: <Badge variant="outline">{userId}</Badge>
        </div>
      )}

      <Separator />
    </>
  );
}
