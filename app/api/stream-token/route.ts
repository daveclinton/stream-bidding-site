import { NextRequest, NextResponse } from "next/server";
import { StreamChat } from "stream-chat";

const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY || "";
const apiSecret = process.env.NEXT_PUBLIC_STREAM_API_SECRET;

const serverClient = StreamChat.getInstance(apiKey, apiSecret);

export async function POST(req: NextRequest) {
  const { userId } = (await req.json()) as { userId?: string };
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }
  const token = serverClient.createToken(userId);
  const channel = serverClient.channel("messaging", "product-1", {
    name: "Bidding for Product 1",
    created_by_id: "system",
  });

  await channel.create();
  return NextResponse.json({ token });
}
