export default async function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_KEY;
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: "Missing address" });
  try {
    const r = await fetch(
      "https://maps.googleapis.com/maps/api/geocode/json?address=" + encodeURIComponent(address) + "&key=" + key
    );
    const d = await r.json();
    if (!d.results || !d.results[0]) return res.status(404).json({ error: "Not found" });
    const loc = d.results[0].geometry.location;
    res.status(200).json({
      lat: loc.lat,
      lng: loc.lng,
      label: d.results[0].formatted_address
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
