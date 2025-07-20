import { NextResponse } from "next/server";
import { getAllRecentMessages } from "../../../lib/db"; // updated import path

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing lat or lng query parameters" }, { status: 400 });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return NextResponse.json({ error: "Invalid lat or lng values" }, { status: 400 });
    }

    const messages = await getAllRecentMessages(1000); // Adjust count as needed

    const nearbyMessages = messages.filter((msg) => {
      if (msg.lat == null || msg.lng == null) return false;

      return getDistanceMeters(latNum, lngNum, Number(msg.lat), Number(msg.lng)) <= 300;
    });

    return NextResponse.json(nearbyMessages);
  } catch (error) {
    console.error("Error fetching nearby messages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
