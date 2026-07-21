export default async function handler(req, res) {
  const { lat, lng, mood } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!lat || !lng) return res.status(400).json({ error: 'Missing coordinates' });

  const types = {
    'Quick breakfast': ['breakfast_restaurant', 'cafe'],
    'Sit down and eat': ['restaurant', 'american_restaurant'],
    'Coffee and something': ['cafe', 'coffee_shop'],
    'Fast and close': ['fast_food_restaurant', 'sandwich_shop'],
    'Treat myself': ['restaurant', 'seafood_restaurant'],
    'Out with someone': ['restaurant', 'italian_restaurant'],
    'Something open now': ['restaurant', 'fast_food_restaurant'],
    'Late night spot': ['bar', 'restaurant'],
    'Just feed me': ['restaurant']
  };

  const includedTypes = types[mood] || ['restaurant'];

  const isOpenLongEnough = (place) => {
    if (!place.regularOpeningHours) return true;
    if (!place.regularOpeningHours.openNow) return false;
    const periods = place.regularOpeningHours.periods || [];
    if (!periods.length) return true;
    const now = new Date();
    const nowMins = now.getUTCHours() * 60 + now.getUTCMinutes();
    const todayDay = now.getUTCDay();
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      if (!p.close) return true;
      const closeDay = p.close.day;
      const closeMins = p.close.hour * 60 + p.close.minute + (closeDay !== todayDay ? 1440 : 0);
      if (p.open.day === todayDay && closeMins - nowMins >= 30) return true;
    }
    return false;
  };

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.shortFormattedAddress,places.internationalPhoneNumber,places.editorialSummary'
      },
      body: JSON.stringify({
        includedTypes: includedTypes,
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

    let places = (data.places || []).filter(function(p) {
      return isOpenLongEnough(p);
    });

    if (places.length < 2) {
      const fallback = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.regularOpeningHours,places.shortFormattedAddress,places.internationalPhoneNumber,places.editorialSummary'
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
      const fallbackData = await fallback.json();
      places = (fallbackData.places || []).filter(function(p) {
        return isOpenLongEnough(p);
      });
    }

    places.sort(function(a, b) {
      return (b.rating || 0) - (a.rating || 0);
    });

    return res.status(200).json({ places: places.slice(0, 2) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
