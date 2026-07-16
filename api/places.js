export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat, lng } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;

  const body = {
    includedTypes: ['restaurant'],
    maxResultCount: 6,
    locationRestriction: {
      circle: {
        center: {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng)
        },
        radius: 4000
      }
    }
  };

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.shortFormattedAddress,places.regularOpeningHours,places.priceLevel,places.internationalPhoneNumber'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log('Google response:', JSON.stringify(data));
    return res.status(200).json(data);
  } catch (err) {
    console.log('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
