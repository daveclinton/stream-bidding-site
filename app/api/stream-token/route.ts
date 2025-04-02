import { NextRequest, NextResponse } from "next/server";
import { StreamChat } from "stream-chat";
import { PRODUCTS } from "../products/route";

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
    const { userId, productId = "product-1" } = body as {
      userId?: string;
      productId?: string;
    };

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Valid user ID is required" },
        { status: 400 }
      );
    }

    const product = PRODUCTS[productId];
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const serverClient = StreamChat.getInstance(apiKey, apiSecret);

    await serverClient.upsertUser({
      id: userId,
      name: userId,
      role: "user",
    });

    const channelId = `auction-${productId}`;
    const channel = serverClient.channel("messaging", channelId, {
      name: `Bidding for ${product.name}`,
      product: product,
      auctionEnd: product.endTime.toISOString(),
      created_by_id: "system",
    });

    try {
      await channel.create();
      console.log(`Channel ${channelId} created or already exists`);
    } catch (error) {
      console.log(
        "Channel creation error (likely exists):",
        (error as Error).message
      );
    }

    await channel.addMembers([userId]);

    const expirationTime = Math.floor(Date.now() / 1000) + 604800;
    const token = serverClient.createToken(userId, expirationTime);

    console.log(
      "Generated token for user:",
      userId,
      "expires:",
      new Date(expirationTime * 1000).toISOString()
    );

    return NextResponse.json({
      token,
      product,
    });
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
