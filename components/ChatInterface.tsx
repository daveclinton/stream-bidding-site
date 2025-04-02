import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Chat,
  Channel,
  Window,
  ChannelHeader,
  MessageList,
  MessageInput,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import {
  StreamChat,
  type Channel as StreamChannel,
  type DefaultGenerics,
} from "stream-chat";

type ChatInterfaceProps = {
  client: StreamChat<DefaultGenerics> | null;
  channel: StreamChannel<DefaultGenerics> | null;
  isJoining: boolean;
  isConnecting: boolean;
  handleConnect: () => Promise<void>;
  isAuctionEnded: boolean;
};

export default function ChatInterface({
  client,
  channel,
  isJoining,
  isConnecting,
  handleConnect,
  isAuctionEnded,
}: ChatInterfaceProps) {
  return (
    <div className="w-full md:w-2/3 h-screen">
      {client && channel ? (
        <div className="h-full">
          <Chat client={client} theme="messaging light">
            <Channel channel={channel}>
              <Window>
                <ChannelHeader />
                <MessageList />
                <MessageInput disabled={isAuctionEnded} />
              </Window>
            </Channel>
          </Chat>
        </div>
      ) : (
        <div
          className={cn(
            "flex justify-center items-center h-full",
            "bg-muted/30"
          )}
        >
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-4">Live Auction Chat</h2>
            <p className="text-muted-foreground mb-6">
              Join the auction to view the live bidding chat and interact with
              other bidders
            </p>
            {isJoining ? (
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Button onClick={handleConnect} disabled={isConnecting}>
                Join Now
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
