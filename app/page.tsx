/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import {
  StreamChat,
  Channel as StreamChannel,
  DefaultGenerics,
  Event,
} from "stream-chat";
import {
  Chat,
  Channel,
  Window,
  ChannelHeader,
  MessageList,
  MessageInput,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";

type BidMessage = {
  bidder: string;
  amount: number;
};

const BiddingPage = () => {
  const [client, setClient] = useState<StreamChat<DefaultGenerics> | null>(
    null
  );
  const [channel, setChannel] = useState<StreamChannel<DefaultGenerics> | null>(
    null
  );
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [highestBidder, setHighestBidder] = useState<string | null>(null);
  const [bidInput, setBidInput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  useEffect(() => {
    setUserId(`user-${Math.random().toString(36).substring(2, 7)}`);
  }, []);

  useEffect(() => {
    return () => {
      if (client) {
        client
          .disconnectUser()
          .catch((err) =>
            console.error("Disconnect error:", (err as Error).message)
          );
      }
    };
  }, [client]);

  const handleConnect = async () => {
    if (!userId) return;

    try {
      setError(null);
      setIsConnecting(true);

      const res = await fetch("/api/stream-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch token");
      }

      const { token } = (await res.json()) as { token: string };
      const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;
      if (!apiKey) {
        throw new Error("Stream API key is not configured");
      }

      if (client) {
        await client.disconnectUser();
      }

      const chatClient = StreamChat.getInstance<DefaultGenerics>(apiKey);
      await chatClient.connectUser(
        {
          id: userId,
          name: userId,
          image: "https://i.imgur.com/fR9Jz14.png",
        },
        token
      );

      setClient(chatClient);

      // Handle all events and filter by type
      chatClient.on((event: Event<DefaultGenerics>) => {
        if (event.type === "connection.changed" && !event.online) {
          console.log("Connection lost, attempting to reconnect...");
          setError("Connection lost. Reconnecting...");
          handleConnect();
        }
      });

      await joinChannel(chatClient);
    } catch (err) {
      const typedError = err as Error;
      console.error("Connect error:", typedError.message);
      setError(`Failed to connect: ${typedError.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const joinChannel = async (chatClient: StreamChat<DefaultGenerics>) => {
    if (!chatClient.user) {
      setError("Client not connected. Please reconnect.");
      handleConnect();
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      const chatChannel = chatClient.channel("messaging", "product-1", {
        name: "Bidding for Product 1",
      });

      await chatChannel.watch();
      setChannel(chatChannel);

      const response = await chatChannel.query({ messages: { limit: 100 } });
      const messages = response.messages || [];
      const bidMessages: BidMessage[] = messages
        .map((msg) => {
          const text = msg.text || "";
          const match = text.match(/(\w+) placed a bid of \$(\d+\.?\d*)/);
          if (match) {
            const [, bidder, amount] = match;
            return { bidder, amount: parseFloat(amount) };
          }
          return null;
        })
        .filter((bid): bid is BidMessage => bid !== null);

      if (bidMessages.length > 0) {
        const highestBid = bidMessages.reduce((prev, current) =>
          prev.amount > current.amount ? prev : current
        );
        setCurrentBid(highestBid.amount);
        setHighestBidder(highestBid.bidder);
      }

      // Handle all events and filter by type
      chatChannel.on((event: Event<DefaultGenerics>) => {
        if (event.type === "message.new") {
          const messageText = event.message?.text || "";
          const match = messageText.match(
            /(\w+) placed a bid of \$(\d+\.?\d*)/
          );

          if (match) {
            const [, bidder, amount] = match;
            const bidValue = parseFloat(amount);

            if (bidValue > currentBid) {
              setCurrentBid(bidValue);
              setHighestBidder(bidder);
            }
          }
        }
      });
    } catch (err) {
      const typedError = err as Error;
      console.error("Join channel error:", typedError.message);
      setError(`Failed to join bidding room: ${typedError.message}`);
    } finally {
      setIsJoining(false);
    }
  };

  const handleBid = async () => {
    if (!channel) {
      setError("Please join the channel first.");
      return;
    }

    const bidValue = parseFloat(bidInput);

    if (isNaN(bidValue)) {
      setError("Please enter a valid number.");
      return;
    }

    if (bidValue <= currentBid) {
      setError(
        `Your bid must be higher than the current bid of $${currentBid.toFixed(
          2
        )}.`
      );
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await channel.sendMessage({
        text: `${userId} placed a bid of $${bidValue.toFixed(2)}`,
      });

      setCurrentBid(bidValue);
      setHighestBidder(userId);
      setBidInput("");
    } catch (err) {
      const typedError = err as Error;
      console.error("Bid error:", typedError.message);
      setError(`Failed to place bid: ${typedError.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className="w-full md:w-1/3 p-6 bg-gray-50">
        <h1 className="text-2xl font-bold mb-4">Product 1 Auction</h1>

        {userId && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">Your ID: {userId}</p>
          </div>
        )}

        <div className="bg-white p-4 rounded shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-2">Current Auction Status</h2>
          <p className="text-xl font-bold text-green-600">
            ${currentBid.toFixed(2)}
          </p>
          <p className="text-sm text-gray-700">
            Highest Bidder: {highestBidder || "No bids yet"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {!client ? (
          <button
            onClick={handleConnect}
            disabled={isConnecting || !userId}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
          >
            {isConnecting ? "Connecting..." : "Enter Auction Room"}
          </button>
        ) : (
          <div className="space-y-4">
            {!channel ? (
              <button
                onClick={() => joinChannel(client)}
                disabled={isJoining}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                {isJoining ? "Joining..." : "Join Bidding Channel"}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="number"
                    min={currentBid + 0.01}
                    step="0.01"
                    value={bidInput}
                    onChange={(e) => setBidInput(e.target.value)}
                    placeholder={`Minimum bid: $${(currentBid + 0.01).toFixed(
                      2
                    )}`}
                    className="flex-1 border border-gray-300 rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleBid}
                    disabled={
                      isLoading ||
                      !bidInput ||
                      parseFloat(bidInput) <= currentBid
                    }
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-r disabled:opacity-50"
                  >
                    {isLoading ? "Bidding..." : "Place Bid"}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Enter an amount higher than the current bid
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-full md:w-2/3 border-t md:border-t-0 md:border-l border-gray-200">
        {client && channel ? (
          <Chat client={client} theme="messaging light">
            <Channel channel={channel}>
              <Window>
                <ChannelHeader title="Live Auction Room" />
                <MessageList />
                <MessageInput />
              </Window>
            </Channel>
          </Chat>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center p-6">
              <h3 className="text-xl font-medium mb-2">Auction Chat</h3>
              <p>Connect to see live bids and chat with other participants.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiddingPage;
