"use client";
import { useCallback, useState } from "react";
import { Channel, Event, StreamChat } from "stream-chat";
import { toast } from "sonner";
import { StreamUser } from "../store/auctionStore";

const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY || "";

interface AuctionChannelReturn {
  channel: Channel | null;
  chatClient: StreamChat | null;
  connectionStatus: "connected" | "disconnected" | "connecting";
  isLoading: boolean;
  initializeClient: (user: StreamUser) => Promise<void>;
  initializeChannel: (
    productId: string,
    productName: string,
    memberIds?: string[]
  ) => Promise<void>;
  disconnectChannel: () => Promise<void>;
  startConnectionMonitoring: () => void;
  reconnect: () => Promise<void>;
}

export function useAuctionChannel(
  currentUser: StreamUser | null,
  onMessageNew?: (event: Event) => void
): AuctionChannelReturn {
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const [isLoading, setIsLoading] = useState(false);
  const [isUserConnected, setIsUserConnected] = useState(false);

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

  const initializeClient = useCallback(
    async (user: StreamUser) => {
      try {
        setIsLoading(true);
        setConnectionStatus("connecting");
        setIsUserConnected(false);

        const client = new StreamChat(apiKey, { warmUp: true });
        const token = await fetchToken(user);

        await client.connectUser(
          { id: user.id, name: user.name, avatar: user.avatar },
          token
        );

        setChatClient(client);
        setConnectionStatus("connected");
        setIsUserConnected(true);
      } catch (err) {
        console.error("Failed to initialize chat client:", err);
        toast.error("Failed to connect to chat.");
        setConnectionStatus("disconnected");
        setIsUserConnected(false);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchToken]
  );

  const initializeChannel = useCallback(
    async (
      productId: string,
      productName: string,
      memberIds: string[] = []
    ) => {
      if (!chatClient || !currentUser || !isUserConnected) {
        console.error("Cannot initialize channel: client or user not ready");
        return;
      }

      try {
        setIsLoading(true);
        const productChannel = chatClient.channel("messaging", productId, {
          name: `${productName} Auction`,
          members: [currentUser.id, ...memberIds], // Include current user and bidders
        });
        await productChannel.watch();
        setChannel(productChannel);

        if (onMessageNew) {
          productChannel.on("message.new", onMessageNew);
        }

        setConnectionStatus("connected");
        console.log("Channel initialized with members:", [
          currentUser.id,
          ...memberIds,
        ]);
      } catch (err) {
        console.error("Failed to initialize channel:", err);
        toast.error("Failed to load auction chat.");
        setConnectionStatus("disconnected");
      } finally {
        setIsLoading(false);
      }
    },
    [chatClient, currentUser, onMessageNew, isUserConnected]
  );

  const disconnectChannel = useCallback(async () => {
    try {
      if (channel) {
        await channel.stopWatching();
        setChannel(null);
      }
      if (chatClient) {
        await chatClient.disconnectUser();
        setChatClient(null);
        setConnectionStatus("disconnected");
        setIsUserConnected(false);
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
      toast.error("Error disconnecting chat.");
    }
  }, [channel, chatClient]);

  const startConnectionMonitoring = useCallback(() => {
    if (!chatClient) return;

    const handleConnectionChange = (event: Event) => {
      setConnectionStatus(event.online ? "connected" : "disconnected");
    };
    chatClient.on("connection.changed", handleConnectionChange);

    return () => chatClient.off("connection.changed", handleConnectionChange);
  }, [chatClient]);

  const reconnect = useCallback(async () => {
    if (!currentUser || !chatClient || connectionStatus !== "disconnected")
      return;

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
      setIsUserConnected(true);
      if (channel) await channel.watch();
      setConnectionStatus("connected");
      toast.success("Reconnected to chat.");
    } catch (err) {
      console.error("Reconnection failed:", err);
      toast.error("Reconnection failed.");
      setIsUserConnected(false);
    }
  }, [connectionStatus, chatClient, channel, currentUser, fetchToken]);

  return {
    channel,
    chatClient,
    connectionStatus,
    isLoading,
    initializeClient,
    initializeChannel,
    disconnectChannel,
    startConnectionMonitoring,
    reconnect,
  };
}
