import { NextRequest, NextResponse } from "next/server";
import { StreamChat } from "stream-chat";

// Keep these as server-side environment variables
const api_key = process.env.NEXT_PUBLIC_STREAM_KEY;
const api_secret = process.env.NEXT_PUBLIC_STREAM_API_SECRET;

export async function POST(request: NextRequest) {
  if (!api_key || !api_secret) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  try {
    const { userId, userName } = await request.json();

    if (!userId || !userName) {
      return NextResponse.json(
        { error: "userId and userName are required" },
        { status: 400 }
      );
    }
    const serverClient = StreamChat.getInstance(api_key!, api_secret);

    const token = serverClient.createToken(userId);

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
