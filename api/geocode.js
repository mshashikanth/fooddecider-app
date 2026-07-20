export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { address } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;

  if (!address) return res.status(400).json({ error: 'Missing address' });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`
    );
    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.[0]) {
      return res.status(404).json({ error: 'Location not found' });
    }
    const loc = data.results[0].geometry.location;
    const label = data.results[0].formatted_address;
    return res.status(200).json({ lat: loc.lat, lng: loc.lng, label });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
