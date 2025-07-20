import type { NextApiRequest, NextApiResponse } from "next";
import { getAllRecentMessages } from "../../lib/db"; // adjust import path

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Missing lat or lng query parameters" });
    }

    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ error: "Invalid lat or lng values" });
    }

    // Get all recent messages (last 90 days)
    const messages = await getAllRecentMessages(1000); // fetch more if needed

    // Filter for messages within 300 meters
    const nearbyMessages = messages.filter((msg) => {
    if (msg.lat == null || msg.lng == null) return false;

    return getDistanceMeters(latNum, lngNum, Number(msg.lat), Number(msg.lng)) <= 300;
    });


    return res.status(200).json(nearbyMessages);
  } catch (error) {
    console.error("Error fetching nearby messages:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
