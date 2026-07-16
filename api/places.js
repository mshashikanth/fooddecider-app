export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat, lng } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;

  if (!lat || !lng) return res.status(400).json({ error: 'Missing coordinates' });

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.shortFormattedAddress,places.internationalPhoneNumber,places.primaryType,places.editorialSummary'
      },
      body: JSON.stringify({
        includedTypes: ['restaurant'],
        excludedTypes: ['food_court'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
            radius: 3200
          }
        }
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    // Filter only open restaurants
    const open = (data.places || []).filter(p => p.regularOpeningHours?.openNow === true);
    return res.status(200).json({ places: open });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
