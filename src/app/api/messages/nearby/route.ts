import { NextResponse } from "next/server";
import { getAllRecentMessages } from "../../../lib/db";

// Haversine formula to compute distance in meters between two lat/lng pairs
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

// Utility to round to 2 decimal places
function roundToOneDecimals(num: number): number {
  return Math.round(num * 10) / 10;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");

    if (!latParam || !lngParam) {
      return NextResponse.json(
        { error: "Missing lat or lng query parameters" },
        { status: 400 }
      );
    }

    const latRaw = parseFloat(latParam);
    const lngRaw = parseFloat(lngParam);

    if (isNaN(latRaw) || isNaN(lngRaw)) {
      return NextResponse.json(
        { error: "Invalid lat or lng values" },
        { status: 400 }
      );
    }

    // Round incoming lat/lng to 2 decimal places
    const lat = roundToOneDecimals(latRaw);
    const lng = roundToOneDecimals(lngRaw);

    const messages = await getAllRecentMessages(1000); // Adjust count as needed

    const nearbyMessages = messages.filter((msg) => {
      if (msg.lat == null || msg.lng == null) return false;

      // Round message coordinates before distance check
      const msgLat = roundToOneDecimals(Number(msg.lat));
      const msgLng = roundToOneDecimals(Number(msg.lng));

      return getDistanceMeters(lat, lng, msgLat, msgLng) <= 300;
    });

    return NextResponse.json(nearbyMessages);
  } catch (error) {
    console.error("Error fetching nearby messages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
