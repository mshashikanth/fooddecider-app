
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat, lng, type } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;

  if (!lat || !lng || !type) {
    return res.status(400).json({ error: 'Missing params' });
  }

  const url = `https://places.googleapis.com/v1/places:searchNearby`;

  const body = {
    includedTypes: [type],
    maxResultCount: 6,
    locationRestriction: {
      circle: {
        center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        radius: 4000
      }
    },
    rankPreference: "POPULARITY"
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.shortFormattedAddress,places.internationalPhoneNumber,places.editorialSummary'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
