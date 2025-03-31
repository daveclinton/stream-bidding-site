"use client";
import { useEffect, useCallback, useState } from "react";
import { Channel, Event, StreamChat } from "stream-chat";
import { toast } from "sonner";
import { StreamUser } from "../store/auctionStore";

const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY || "";

interface AuctionChannelReturn {
  channel: Channel | null;
  chatClient: StreamChat | null;
  connectionStatus: "connected" | "disconnected" | "connecting";
  isLoading: boolean;
  initializeChannel: (productId: string, productName: string) => Promise<void>;
  disconnectChannel: () => Promise<void>;
}

export function useAuctionChannel(
  currentUser: StreamUser | null,
  onMessageNew?: (event: Event) => void
): AuctionChannelReturn {
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("connecting");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch token from your API
  const fetchToken = useCallback(async (user: StreamUser): Promise<string> => {
    const response = await fetch("/api/get-stream-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, userName: user.name }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const { token } = await response.json();
    return token;
  }, []);

  // Initialize client and connect user
  const initializeClient = useCallback(
    async (user: StreamUser) => {
      try {
        setIsLoading(true);
        setConnectionStatus("connecting");

        // Create StreamChat instance
        const client = new StreamChat(apiKey, { warmUp: true });
        const token = await fetchToken(user);

        // Use connectUser to authenticate and establish WebSocket connection
        await client.connectUser(
          { id: user.id, name: user.name, avatar: user.avatar }, // User data
          token // Token fetched from your API
        );

        setChatClient(client);
        setConnectionStatus("connected");
      } catch (err) {
        console.error("Failed to initialize chat client:", err);
        toast.error("Failed to connect to chat. Retrying...");
        setConnectionStatus("disconnected");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchToken]
  );

  // Initialize a specific auction channel
  const initializeChannel = useCallback(
    async (productId: string, productName: string) => {
      if (!chatClient || !currentUser) return;

      try {
        setIsLoading(true);
        const productChannel = chatClient.channel("messaging", productId, {
          name: `${productName} Auction`,
        });
        await productChannel.watch();
        setChannel(productChannel);

        if (onMessageNew) {
          productChannel.on("message.new", onMessageNew);
        }

        setConnectionStatus("connected");
      } catch (err) {
        console.error("Failed to initialize channel:", err);
        toast.error("Failed to load auction chat. Please refresh.");
        setConnectionStatus("disconnected");
      } finally {
        setIsLoading(false);
      }
    },
    [chatClient, currentUser, onMessageNew]
  );

  // Disconnect the client and channel
  const disconnectChannel = useCallback(async () => {
    try {
      if (channel) {
        await channel.stopWatching();
        setChannel(null);
      }
      if (chatClient) {
        await chatClient.disconnectUser(); // Properly disconnects WebSocket and clears user
        setChatClient(null);
        setConnectionStatus("disconnected");
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
      toast.error("Error disconnecting chat.");
    }
  }, [channel, chatClient]);

  // Initialize client when user changes
  useEffect(() => {
    if (!currentUser) {
      disconnectChannel(); // Clean up if user is unset
      return;
    }

    initializeClient(currentUser);

    return () => {
      disconnectChannel(); // Cleanup on unmount or user change
    };
  }, [currentUser, initializeClient, disconnectChannel]);

  // Handle connection status changes
  useEffect(() => {
    if (!chatClient) return;

    const handleConnectionChange = (event: Event) => {
      setConnectionStatus(event.online ? "connected" : "disconnected");
    };
    chatClient.on("connection.changed", handleConnectionChange);

    return () => chatClient.off("connection.changed", handleConnectionChange);
  }, [chatClient]);

  // Reconnection logic
  useEffect(() => {
    if (connectionStatus !== "disconnected" || !currentUser || !chatClient)
      return;

    const retryConnection = async () => {
      try {
        const token = await fetchToken(currentUser);
        await chatClient.connectUser(
          {
            id: currentUser.id,
            name: currentUser.name,
            avatar: currentUser.avatar,
          },
          token
        );
        if (channel) await channel.watch();
        setConnectionStatus("connected");
        toast.success("Reconnected to chat.");
      } catch (err) {
        console.error("Reconnection failed:", err);
        toast.error("Reconnection failed. Retrying in 5s...");
      }
    };

    const timer = setTimeout(retryConnection, 5000);
    return () => clearTimeout(timer);
  }, [connectionStatus, chatClient, channel, currentUser, fetchToken]);

  return {
    channel,
    chatClient,
    connectionStatus,
    isLoading,
    initializeChannel,
    disconnectChannel,
  };
}
