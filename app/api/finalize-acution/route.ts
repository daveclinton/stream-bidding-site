import { NextRequest, NextResponse } from "next/server";
import { StreamChat } from "stream-chat";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error("Missing Stream API credentials");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const serverClient = StreamChat.getInstance(apiKey, apiSecret);
    const body = await req.json();
    const { productId, winner, amount } = body as {
      productId: string;
      winner: string;
      amount: number;
    };

    if (!productId || !winner || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // In a real application, you would:
    // 1. Update the product status in your database
    // 2. Create an order or purchase record
    // 3. Notify the winner via email
    // 4. Process payment or set up payment collection

    // For the demo, we'll just record the result in the channel
    const channelId = `auction-${productId}`;
    const channel = serverClient.channel("messaging", channelId);

    // Send system message to the channel
    await channel.sendMessage({
      text: `🏆 Auction for product ${productId} has been finalized. ${winner} is the winner with a bid of $${amount.toFixed(
        2
      )}`,
      user_id: "system",
      auction_finalized: true,
      winner,
      final_amount: amount,
    });

    // Update channel data to reflect auction status
    await channel.update({
      auction_status: "completed",
      winner,
      final_amount: amount,
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Auction finalized successfully",
    });
  } catch (error) {
    const typedError = error as Error;
    console.error("Finalize auction error:", {
      message: typedError.message,
      stack: typedError.stack,
    });
    return NextResponse.json(
      { error: "Failed to finalize auction", details: typedError.message },
      { status: 500 }
    );
  }
}
