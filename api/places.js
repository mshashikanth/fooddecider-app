export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat, lng, mood } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;

  if (!lat || !lng) return res.status(400).json({ error: 'Missing coordinates' });

  const moodTypes = {
    'Fast and close': ['fast_food_restaurant', 'sandwich_shop', 'pizza_restaurant'],
    'Treat myself': ['fine_dining_restaurant', 'steak_house', 'sushi_restaurant'],
    'Out with someone': ['restaurant', 'bar_and_grill', 'american_restaurant'],
    'Just feed me': ['restaurant', 'meal_takeaway', 'brunch_restaurant'],
  };

  const types = moodTypes[mood] || ['restaurant'];

  try {
    const results = await Promise.all(
      types.slice(0, 2).map(type =>
        fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': key,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.shortFormattedAddress,places.internationalPhoneNumber,places.editorialSummary',
          },
          body: JSON.stringify({
            includedTypes: [type],
            excludedTypes: ['food_court'],
            maxResultCount: 5,
            locationRestriction: {
              circle: {
                center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
                radius: 3200,
              },
            },
          }),
        }).then(r => r.json())
      )
    );

    // Merge results from both type searches
    const seen = new Set();
    const merged = [];
    for (const result of results) {
      for (const place of result.places || []) {
        if (!seen.has(place.id) && place.regularOpeningHours?.openNow === true) {
          seen.add(place.id);
          merged.push(place);
        }
      }
    }

    // Sort by rating
    merged.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return res.status(200).json({ places: merged.slice(0, 2) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
