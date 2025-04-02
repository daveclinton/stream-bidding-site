import { NextRequest, NextResponse } from "next/server";
import { StreamChat } from "stream-chat";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error("Missing Stream API credentials:", { apiKey, apiSecret });
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { userId } = body as { userId?: string };

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Valid user ID is required" },
        { status: 400 }
      );
    }

    const serverClient = StreamChat.getInstance(apiKey, apiSecret);

    await serverClient.upsertUser({
      id: userId,
      name: userId,
      role: "user",
    });

    const channel = serverClient.channel("messaging", "product-1", {
      name: "Bidding for Product 1",
      created_by_id: "system",
    });

    try {
      await channel.create();
    } catch (error) {
      console.log(
        "Channel creation error (likely exists):",
        (error as Error).message
      );
    }

    await channel.addMembers([userId]);

    // Create a token with explicit expiration timestamp instead of duration
    // This ensures the expiration is based on server time, not client time
    const expirationTime = Math.floor(Date.now() / 1000) + 604800; // Current time + 7 days in seconds
    const token = serverClient.createToken(userId, expirationTime);

    console.log(
      "Generated token for user:",
      userId,
      "expires:",
      new Date(expirationTime * 1000).toISOString()
    );

    return NextResponse.json({ token });
  } catch (error) {
    const typedError = error as Error;
    console.error("Stream token error details:", {
      message: typedError.message,
      stack: typedError.stack,
    });
    return NextResponse.json(
      { error: "Failed to process request", details: typedError.message },
      { status: 500 }
    );
  }
}
