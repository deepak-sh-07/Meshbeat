import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  const { name, code, hostId } = await req.json();

  try {
    const room = await prisma.room.create({
      data: { name, code, hostId },
    });
    return NextResponse.json({ success: true, room });
  } catch (err) {
    console.error("Error creating room:", err);
    return NextResponse.json(
      { success: false, message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rcode = searchParams.get("rcode");
    const user_id = searchParams.get("user_id");

    if (!rcode || !user_id) {
      return NextResponse.json(
        { success: false, message: "Missing room code or user ID" },
        { status: 400 }
      );
    }

    // Find room by code
    const room = await prisma.room.findUnique({
      where: { code: rcode },
      include: { participants: true },
    });

    if (!room) {
      return NextResponse.json({
        success: false,
        message: "Wrong room code",
      });
    }

    // Add user as a participant (if not already in the room)
   await prisma.user.update({
  where: { id: user_id },
  data: { participantRoomId: room.id },
});

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error("Error joining room:", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}

